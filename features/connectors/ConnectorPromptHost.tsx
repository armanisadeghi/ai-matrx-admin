"use client";

// features/connectors/ConnectorPromptHost.tsx
//
// The mounted form of the prompt card: it resolves the provider's live state and
// opens the consent dialog. Kept separate from `ConnectorPromptCard` so the card
// itself stays a pure, provider-agnostic component that any surface can render
// with data it already has.
//
// It deliberately does NOT load the provider's authorization script — the card
// only opens a dialog, and the dialog brings its own provider. A card that pulled
// Google's GIS bundle into the new-chat screen would cost every visit a script
// nobody asked for.

import { useEffect, useState } from "react";
import { ConnectorPromptCard } from "./ConnectorPromptCard";
import { accountHealth, anyProductConnected } from "./health";
import { useGoogleConnectorState } from "./google-adapter";
import { GOOGLE_CONNECTOR_PROVIDER } from "./provider-config";
import { useLateIdleReady } from "@/lib/boot/lateIdle";
import { useOpenConnectorConsentDialog } from "@/features/overlays/openers/connectorConsentDialog";

/**
 * FIRST-PAINT CONTRACT (V6, owner 2026-10-16: connections are never part of the first paint).
 *
 * The card only decides to show after it knows whether any Google account is connected, and that
 * is two reads (`integration_connections` + resources, and the capability catalog). Nothing on a
 * new-chat first paint needs them, so the card renders NOTHING until the person engages the page:
 * the first pointer press, key press, touch or pointer move after mount. Then ONE pair of reads
 * runs together and the card shows if it should. (Trade-off: the card can appear a moment after
 * the person starts interacting, never at first paint. Focus is not an engagement here: the
 * new-chat composer takes focus by itself.)
 *
 * NEVER A PERPETUAL LOADING STATE: a person who only reads the page never engages, so the page
 * settling (the late idle tier, seconds after the idle flush) opens the same one batched read.
 * Until then, and while the read is in flight or has failed, the host renders nothing at all:
 * no skeleton, no placeholder box, no layout to shift when the card does or does not apply.
 */
function usePageEngaged(): boolean {
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    if (engaged) return undefined;
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"] as const;
    const onEngage = () => setEngaged(true);
    for (const name of events) window.addEventListener(name, onEngage, { once: true, passive: true });
    return () => {
      for (const name of events) window.removeEventListener(name, onEngage);
    };
  }, [engaged]);
  return engaged;
}

export function ConnectorPromptHost({
  className,
  variant = "card",
}: {
  className?: string;
  variant?: "card" | "bare";
}) {
  const provider = GOOGLE_CONNECTOR_PROVIDER;
  const engaged = usePageEngaged();
  const settled = useLateIdleReady();
  const ready = engaged || settled;
  const state = useGoogleConnectorState({ enabled: ready });
  const openConsent = useOpenConnectorConsentDialog();

  const connected = state.accounts.some((account) =>
    anyProductConnected(
      accountHealth({ provider, account, rollout: state.rollout }),
    ),
  );

  /**
   * Every account this person has is BLOCKED — nothing can be approved, so the
   * offer is withheld rather than opening a provider window that cannot land
   * (V17-1). A person with no account at all still gets the offer: the fault is
   * per account, and a first connect may be exactly what works.
   */
  const blocked =
    state.accounts.length > 0 &&
    state.accounts.every((account) => account.blocked === true);

  // A read that FAILED is not "not connected": while the answer is unknown the card stays away
  // rather than offering to connect something that may already be connected.
  if (!ready || state.isLoading || state.isError) return null;

  return (
    <ConnectorPromptCard
      provider={provider}
      connected={connected}
      blocked={blocked}
      onConnect={() => openConsent()}
      variant={variant}
      className={className}
    />
  );
}
