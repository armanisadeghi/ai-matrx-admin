"use client";

import { AuthGateDialog } from "@ai-matrx/design-system";
import { useLoginHref } from "@/hooks/auth/useLoginHref";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

/** The auth gate is design-system's; the app supplies where sign-in and sign-up go (returning to this page). */
export default function OverlayRender({ data: overlayData, close }: OverlayRenderProps) {
  const data = overlayData as Record<string, unknown> | null | undefined;
  const signInHref = useLoginHref();
  const signUpHref = useLoginHref("/sign-up");
  return (
    <AuthGateDialog
      isOpen
      onClose={() => close()}
      signInHref={signInHref}
      signUpHref={signUpHref}
      featureName={typeof data?.featureName === "string" ? data.featureName : undefined}
      featureDescription={typeof data?.featureDescription === "string" ? data.featureDescription : undefined}
    />
  );
}
