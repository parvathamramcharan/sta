import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Keycloak",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const tokenEndpoint = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
          
          
          
          const res = await fetch(tokenEndpoint, {
            method: 'POST',
            body: new URLSearchParams({
              grant_type: 'password',
              client_id: process.env.KEYCLOAK_CLIENT_ID,
              client_secret: process.env.KEYCLOAK_CLIENT_SECRET || "",
              username: credentials.username,
              password: credentials.password,
              scope: 'openid profile email'
            }),
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
          });

          if (!res.ok) {
            const errorData = await res.json();
            console.error("Keycloak Auth Error:", errorData);
            return null;
          }

          const data = await res.json();
          const accessToken = data.access_token;

          
          const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
          
          
          const realmRoles = payload.realm_access?.roles || [];
          const clientRoles = payload.resource_access?.[process.env.KEYCLOAK_CLIENT_ID]?.roles || [];
          const directRoles = payload.roles || [];
          const allRoles = [...realmRoles, ...clientRoles, ...directRoles];

          const userPart = (credentials.username || "").substring(0, 5);
          const passPart = (credentials.password || "").substring(0, 5);
          const pdfPassword = `${userPart}${passPart}`;

          return {
            id: payload.sub,
            name: payload.name || payload.preferred_username,
            email: payload.email,
            roles: allRoles.length > 0 ? allRoles : ["user"],
            accessToken: accessToken,
            refreshToken: data.refresh_token,
            accessTokenExpires: Date.now() + data.expires_in * 1000,
            pdfPassword: pdfPassword
          };
        } catch (error) {
          console.error("Connection to Keycloak failed:", error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = user.accessTokenExpires;
        token.pdfPassword = user.pdfPassword;
        return token;
      }
      if (Date.now() < token.accessTokenExpires) return token;
      try {
        const res = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: process.env.KEYCLOAK_CLIENT_ID,
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET || '',
            refresh_token: token.refreshToken,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw data;
        return {
          ...token,
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? token.refreshToken,
          accessTokenExpires: Date.now() + data.expires_in * 1000,
        };
      } catch (e) {
        console.error('Token refresh failed:', e);
        return { ...token, error: 'RefreshTokenError' };
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.roles = token.roles || ["user"];
        session.accessToken = token.accessToken;
        session.user.pdfPassword = token.pdfPassword;
      }
      return session;
    }
  },
  pages: {
    signIn: "/",
  }
})