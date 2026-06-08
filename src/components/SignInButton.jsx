"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("keycloak")}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
    >
      <LogIn size={18} />
      Sign in with Keycloak
    </button>
  );
}
