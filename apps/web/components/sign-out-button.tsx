"use client";

import { signOutAction } from "@/app/actions/auth";
import { useState } from "react";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
}

export function SignOutButton({
  className,
  showIcon = true,
  showLabel = true,
}: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    try {
      await signOutAction();
    } catch {
      // signOut redirects, so errors here are typically navigation errors.
      // If it genuinely fails, reset the loading state.
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={className}
      aria-label="Sign out"
    >
      {showIcon && (
        <LogOut
          className={`h-4 w-4 ${isLoading ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
      )}
      {showLabel && (
        <span>{isLoading ? "Signing out..." : "Sign out"}</span>
      )}
    </button>
  );
}
