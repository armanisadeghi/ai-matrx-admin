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

import { cn } from "@/lib/utils";
import { ConnectorPromptCard } from "./ConnectorPromptCard";
import { accountHealth, anyProductConnected } from "./health";
import { useGoogleConnectorState } from "./google-adapter";
import { GOOGLE_CONNECTOR_PROVIDER } from "./provider-config";
import { useLateIdleReady } from "@/lib/boot/lateIdle";
import { useHasEngaged } from "@/lib/boot/firstEngagement";
import { useOpenConnectorConsentDialog } from "@/features/overlays/openers/connectorConsentDialog";

/**
 * FIRST-PAINT CONTRACT (V6, owner 2026-10-16: connections are never part of the first paint).
 *
 * The card only decides to show after it knows whether any Google account is connected, and that
 * is two reads (`integration_connections` + resources, and the capability catalog). Nothing on a
 * new-chat first paint needs them, so the card renders NOTHING until the person engages the page:
 * the first TRUSTED pointer press, key press or touch (the shared engagement tier, lib/boot/firstEngagement;
 * a pointer move or scroll is not engagement). Then ONE pair of reads
 * runs together and the card shows if it should. (Trade-off: the card can appear a moment after
 * the person starts interacting, never at first paint. Focus is not an engagement here: the
 * new-chat composer takes focus by itself.)
 *
 * NEVER A PERPETUAL LOADING STATE: a person who only reads the page never engages, so the page
 * settling (the late idle tier, seconds after the idle flush) opens the same one batched read.
 * Until then, and while the read is in flight or has failed, the host draws no card:
 * no skeleton, no placeholder box, no layout to shift when the card does or does not apply.
 */
export function ConnectorPromptHost({
  className,
  variant = "float",
}: {
  className?: string;
  /**
   * `float` (default, the new-chat slot): the card sits in a fixed area over the page, so its arrival
   * moves nothing (ZERO LAYOUT SHIFT). `card` / `bare` draw in flow for surfaces that reserve their own room.
   */
  variant?: "float" | "card" | "bare";
}) {
  const provider = GOOGLE_CONNECTOR_PROVIDER;
  const engaged = useHasEngaged();
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
  const showing = ready && !state.isLoading && !state.isError;

  const card = showing ? (
    <ConnectorPromptCard
      provider={provider}
      connected={connected}
      blocked={blocked}
      onConnect={() => openConsent()}
      variant={variant === "bare" ? "bare" : "card"}
      className={
        variant === "float"
          ? cn(
              "pointer-events-auto bg-card shadow-lg dark:shadow-none",
              className,
            )
          : className
      }
    />
  ) : null;

  if (variant !== "float") return card;

  // A zero-height anchor (its -mt-4 cancels the slot's flex gap, so the column measures exactly as
  // with an empty slot) holds the card in a fixed area: appearing late moves nothing.
  return (
    <div
      data-connector-prompt-anchor=""
      className="pointer-events-none relative -mt-4 h-0"
    >
      {card ? (
        <div className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-[480px]">
          {card}
        </div>
      ) : null}
    </div>
  );
}
