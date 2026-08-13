import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Prevent concurrent refresh calls for the SAME refresh token.
// Using a Map is safer than one global refreshPromise because
// different users must not share the same refresh request.
const refreshPromises = new Map();

const getKeycloakTokenEndpoint = () => {
  const issuer = process.env.KEYCLOAK_ISSUER?.replace(/\/$/, "");
  return `${issuer}/protocol/openid-connect/token`;
};

async function refreshAccessToken(token) {
  const refreshToken = token.refreshToken;
   // No refresh token available.
  if (!refreshToken) {
    return {
      ...token,
      accessToken: undefined,
      refreshToken: undefined,
      accessTokenExpires: 0,
      error: "RefreshTokenError",
    };
  }
   //If another request is already refreshing this exact 
   //refresh token, wait for that request instead of sending , another refresh request.
  if (refreshPromises.has(refreshToken)) {
    return await refreshPromises.get(refreshToken);
  }
 //Create ONE refresh request for this refresh token.

  const refreshPromise = (async () => {
    try {
      const issuer =
        process.env.KEYCLOAK_ISSUER?.replace(/\/$/, "");

      const tokenEndpoint =
        `${issuer}/protocol/openid-connect/token`;

      const res = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id:
            process.env.KEYCLOAK_CLIENT_ID,
          client_secret:
            process.env.KEYCLOAK_CLIENT_SECRET || "",
          refresh_token: refreshToken,
        }),
      });

      const data = await res.json();
       // Refresh failed.
      if (!res.ok) {
        console.error(
          "Keycloak token refresh failed:",
          data
        );

        return {
          ...token,
          accessToken: undefined,
          refreshToken: undefined,
          accessTokenExpires: 0,
          error: "RefreshTokenError",
        };
      }
       // Refresh succeeded.
      return {
        ...token,
        accessToken: data.access_token,
         //Keycloak may return a new refresh token. If it doesn't, keep the existing one.
        refreshToken:
          data.refresh_token ?? refreshToken,

        accessTokenExpires:
          Date.now() +
          data.expires_in * 1000,

        error: undefined,
      };
    } catch (error) {
      console.error(
        "Unexpected token refresh error:",
        error
      );

      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        accessTokenExpires: 0,
        error: "RefreshTokenError",
      };
    }
  })();
  // Store the promise so concurrent requests , using the SAME refresh token share it.
  refreshPromises.set(
    refreshToken,
    refreshPromise
  );

  try {
    return await refreshPromise;
  } finally {
     // Remove it after the refresh finishes.
    refreshPromises.delete(refreshToken);
  }
}
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Keycloak",

      credentials: {
        username: {
          label: "Username",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        try {
          const tokenEndpoint = getKeycloakTokenEndpoint();
           // Initial login using Keycloak password grant.
          const res = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "password",
              client_id: process.env.KEYCLOAK_CLIENT_ID,
              client_secret: process.env.KEYCLOAK_CLIENT_SECRET || "",
              username: credentials?.username || "",
              password: credentials?.password || "",
              scope: "openid profile email",
            }),
          });

           // Login failed.
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error("Keycloak authentication error:", errorData);
            return null;
          }

          const data = await res.json();

          const accessToken = data?.access_token;
          const refreshToken = data?.refresh_token;

          if (!accessToken || !refreshToken) {
            console.error("Keycloak response did not contain required tokens");
            return null;
          }
           // Decode access token payload. JWT uses Base64URL, so convert it before decoding.
          const payloadPart = accessToken.split(".")[1];

          if (!payloadPart) {
            console.error("Invalid Keycloak access token");
            return null;
          }

          const payload = JSON.parse(
            Buffer.from(
              payloadPart.replace(/-/g, "+").replace(/_/g, "/"),
              "base64"
            ).toString("utf8")
          );
          // Get realm roles.
          const realmRoles = payload.realm_access?.roles || [];
           //Get client roles.
          const clientRoles =
            payload.resource_access?.[process.env.KEYCLOAK_CLIENT_ID]?.roles || [];
           // Get direct roles.
          const directRoles = payload.roles || [];
           // Combine all roles.
          const allRoles = [...realmRoles, ...clientRoles, ...directRoles];
           // Remove duplicate roles.
          const uniqueRoles = [...new Set(allRoles)];
           // User information.
          const username = credentials?.username || "";
           // You currently derive pdfPassword from the user's
           //login password.
           
           //This is preserved here to avoid changing your
           //existing application behavior.
           
           // However, for security, you should eventually replace
           //this with a separately generated PDF password.
          const userPart = username.substring(0, 5);
          const passPart = (credentials?.password || "").substring(0, 5);
          const pdfPassword = `${userPart}${passPart}`;
           // Return user object to NextAuth.
          return {
            id: payload.sub,
            name: payload.name || payload.preferred_username || username,
            email: payload.email,
            roles: uniqueRoles.length > 0 ? uniqueRoles : ["user"],
            accessToken,
            refreshToken,
            accessTokenExpires: Date.now() + (data.expires_in || 60) * 1000,
            pdfPassword,
          };
        } catch (error) {
          console.error("Connection to Keycloak failed:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
   // JWT CALLBACK
    async jwt({ token, user }) {
      // Initial login
      if (user) {
        token.roles = user.roles;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = user.accessTokenExpires;
        token.pdfPassword = user.pdfPassword;
        token.error = undefined;
        return token;
      }
      // Refresh already failed.
      // Do NOT keep trying the dead refresh token.
      if (token.error === "RefreshTokenError") {
        return token;
      }
      // Access token is still valid
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }
      // Access token expired → try refresh
      if (token.refreshToken) {
        return refreshAccessToken(token);
      }
      // No refresh token → login again
      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        accessTokenExpires: 0,
        error: "RefreshTokenError",
      };
    },
     //SESSION CALLBACK
    async session({ session, token }) {
      if (session.user) {
        session.user.roles = token.roles || ["user"];
        session.user.pdfPassword = token.pdfPassword;
      }
       //Give the frontend the current access token.
      session.accessToken = token.accessToken;
       // If refresh failed, frontend receives , session.error === "RefreshTokenError"
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});