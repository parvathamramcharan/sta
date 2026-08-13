import { handlers } from "@/auth"
export const { GET, POST } = handlers   //refer to auth.js line :115
//     /api/auth/[...nextauth]/route.js is the entry point for Auth.js HTTP requests.
//  GET and POST are delegated to Auth.js's built-in handlers.



//[..nextauth] is It's another catch-all route.
// It catches all paths under:
// So you don't need separate route files for:

// /api/auth/session
// /api/auth/signin
// /api/auth/signout
// /api/auth/callback/...