"use client";

// features/make/gallery/GallerySignUp.tsx — the public gallery header's sign-up link, for guests only
// (TEMPLATE-UI-POLISH, 2026-10-20). A signed-in person already has their own header state (the account
// button in the site header), so this page never asks them to sign up.
//
// ZERO LAYOUT SHIFT: the slot has a fixed size whoever looks. A guest in the light tier (no store, the
// hint says signed out) reads the link in the server HTML; in the full tier the store only answers after
// hydration, so the link stays invisible (same box, still in the HTML) until the answer is in. It is
// never painted for a signed-in person, then taken away.

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { usePublicTier } from "@/features/public-shell/publicTier";
import { useSignedIn } from "@/lib/scoped-config/useSignedIn";
import { cn } from "@/lib/utils";

const noop = () => () => {};

export function GallerySignUp({ href }: { href: string }) {
  const signedIn = useSignedIn();
  const full = usePublicTier().full;
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const show = !signedIn && (!full || hydrated);
  return (
    <div className="h-9 w-[7.5rem] shrink-0" data-public-templates-signup-slot={signedIn ? "signed-in" : "guest"}>
      {signedIn ? null : (
        <Link
          href={href}
          tabIndex={show ? undefined : -1}
          aria-hidden={show ? undefined : true}
          className={cn(
            "inline-flex h-9 w-full items-center justify-center rounded-md bg-primary type-title text-primary-foreground hover:bg-primary/90",
            show ? null : "invisible",
          )}
          data-public-templates-signup=""
        >
          Sign up free
        </Link>
      )}
    </div>
  );
}
