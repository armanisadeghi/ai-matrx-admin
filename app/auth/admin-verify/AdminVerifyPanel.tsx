"use client";

// The verify page's interactive half: the account-settings authenticator flow
// (AuthenticatorSection) in challenge mode. A fresh verification continues to
// the destination at once; a session that is ALREADY verified gets a Continue
// button instead of an automatic jump, so a stale server verdict can never
// bounce the person between the two pages.

import { Button } from "@/components/ui/button";
import { AuthenticatorSection } from "@/features/user-profile/account-access/AuthenticatorSection";

export function AdminVerifyPanel({ destination }: { destination: string }) {
  const proceed = () => window.location.assign(destination);
  return (
    <div className="space-y-4">
      <AuthenticatorSection challenge onElevated={proceed} />
      <Button type="button" variant="outline" className="w-full" onClick={proceed}>
        Continue to administration
      </Button>
    </div>
  );
}
