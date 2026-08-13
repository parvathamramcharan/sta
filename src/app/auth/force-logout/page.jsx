"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function ForceLogoutPage() {
  useEffect(() => {
    signOut({
      callbackUrl: "/",
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm">
        Your session has expired. Redirecting to login...
      </p>
    </div>
  );
}