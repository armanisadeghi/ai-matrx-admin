"use client";

/**
 * /compare for a signed-out visitor when running needs no account (comparison.public.run_requires_account
 * off): the same compare workspace, run as the visitor's guest. The guest is made on the visitor's first
 * compare — never on a bare page view — with the invisible human check (lib/guest/turnstile.ts), and the
 * guest workspace's own token carries every compare call (python-client registerGuestWorkspaceBearer).
 * The free allowance (3 a day for visitors) is the server's; the count shows by the Compare button.
 */

import { useEffect, useState } from "react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button, RegionSkeleton } from "@ai-matrx/design-system/controls";

import { ensureGuestSession } from "@/lib/guest/ensure-guest-session";
import { guestSupabase } from "@/lib/guest/guest-supabase-client";
import { registerGuestWorkspaceBearer } from "@/lib/python-client";
import { MarketingPageShell } from "@/features/shell/components/MarketingPageShell";

import { CompareSurface } from "../ComparePage";

async function guestBearer(): Promise<string | null> {
  const { data } = await guestSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export function GuestCompare() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let unregister: (() => void) | null = null;
    ensureGuestSession()
      .then((answer) => {
        if (cancelled) return;
        if (!answer) throw new Error("A guest session could not be made.");
        unregister = registerGuestWorkspaceBearer(answer.organizationId, guestBearer);
        setOrganizationId(answer.organizationId);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "A guest session could not be made.");
      });
    return () => {
      cancelled = true;
      unregister?.();
    };
  }, [attempt]);

  return (
    <MarketingPageShell>
      <div className="pb-16 pt-20">
        {error ? (
          <div className="mx-auto w-full max-w-3xl space-y-3 px-[var(--matrx-page-gutter,1rem)]">
            <ErrorNotice message={error} />
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>Try again</Button>
              <a href="/sign-up?redirectTo=%2Fcompare" className="inline-flex items-center px-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Sign up free
              </a>
            </div>
          </div>
        ) : organizationId ? (
          <CompareSurface organizationId={organizationId} />
        ) : (
          <div className="mx-auto w-full max-w-5xl px-[var(--matrx-page-gutter,1rem)] pt-8">
            <RegionSkeleton shape="cards" count={4} aria-label="Loading" />
          </div>
        )}
      </div>
    </MarketingPageShell>
  );
}
