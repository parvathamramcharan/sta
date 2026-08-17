// Built-in NextAuth function for configuring authentication.
import NextAuth from "next-auth";
// Built-in Credentials provider for username/password login.
import Credentials from "next-auth/providers/credentials";

// Store ongoing token-refresh promises by refresh token,
// so concurrent requests for the same token share one refresh request.stores in js in memory map on the server/runtime
const refreshPromises = new Map();

// Returns the Keycloak endpoint used to obtain/refresh tokens.
const getKeycloakTokenEndpoint = () => {
  const issuer = process.env.KEYCLOAK_ISSUER?.replace(/\/$/, "");
  return `${issuer}/protocol/openid-connect/token`;
};

// Refreshes the access token using the refresh token.
async function refreshAccessToken(token) {  // Receives the current NextAuth JWT token

  console.log("auth.js => refreshacesstoken called");
  // Refresh the expired access token using the stored refresh token.
  const refreshToken = token.refreshToken;


  // No refresh token available, so token refresh cannot be performed.
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
          console.log("auth.js => authorize called");
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
          // console.log("access token ",accessToken);
          // console.log("refresh token ",refreshToken);

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
          const clientRoles = payload.resource_access?.[process.env.KEYCLOAK_CLIENT_ID]?.roles || [];
           // Get direct roles.
          const directRoles = payload.roles || [];
           // Combine all roles.
          const allRoles = [...realmRoles, ...clientRoles, ...directRoles];
           // Remove duplicate roles.
          const uniqueRoles = [...new Set(allRoles)];
           // User information.
          const username = credentials?.username || "";
        
          // const userPart = username.substring(0, 5);
          // const passPart = (credentials?.password || "").substring(0, 5);
          // const pdfPassword = `${userPart}${passPart}`;
           // Return user object to NextAuth.

           console.log("auth.js=> authrize ended")
          return {
            id: payload.sub,
            name: payload.name || payload.preferred_username || username,
            email: payload.email,
            roles: uniqueRoles.length > 0 ? uniqueRoles : ["user"],
            accessToken,
            refreshToken,
            accessTokenExpires: Date.now() + (data.expires_in || 60) * 1000,
            // pdfPassword,
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
      console.log("auth.js => jwt callback called");
      // Initial login
      if (user) {
        token.roles = user.roles;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = user.accessTokenExpires;
        // token.pdfPassword = user.pdfPassword;
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
      console.log("auth.js => session called")
      if (session.user) {
        session.user.roles = token.roles || ["user"];
        // session.user.pdfPassword = token.pdfPassword;
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