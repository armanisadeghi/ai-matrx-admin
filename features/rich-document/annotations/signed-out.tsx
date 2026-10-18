"use client";

// features/rich-document/annotations/signed-out.tsx
//
// THE REMEDY FOR A SIGNED-OUT COMMENT READ OR WRITE (2026-10-17). A long-lived tab whose session
// ended sends as `anon`; the comment doors refuse it (42501). The sentence says so (errors.ts
// SIGNED_OUT_LEAD), and this is its one action: sign in again in a NEW tab, so the words typed
// here stay on this page for Retry (notices open new tabs only — lib/notice-open).

import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openFromNotice } from "@/lib/notice-open/openFromNotice";
import { loginHref } from "@/utils/auth/auth-destination";

function hereHref(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function openSignInAgain(): void {
  openFromNotice(loginHref(hereHref()));
}

/** The toast action for a signed-out failure. */
export const SIGN_IN_AGAIN_ACTION = { label: "Sign in", onClick: () => openSignInAgain() };

export function SignInAgainButton() {
  return (
    <Button
      icon={<LogIn aria-hidden />}
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        openSignInAgain();
      }}
    >
      Sign in
    </Button>
  );
}
