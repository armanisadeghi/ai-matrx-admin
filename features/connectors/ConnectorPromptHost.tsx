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
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { ConnectorPromptCard } from "./ConnectorPromptCard";
import { accountHealth, anyProductConnected } from "./health";
import { useGoogleConnectorState } from "./google-adapter";
import { GOOGLE_CONNECTOR_PROVIDER } from "./provider-config";
import { readConnectorHint, rememberConnectorHint } from "./connectedHint";
import { useShellCounts } from "@/lib/boot/shellCounts";
import { useOpenConnectorConsentDialog } from "@/features/overlays/definitions/connectorConsentDialog.overlay";

/**
 * ZERO READS UNTIL THE CARD ITSELF IS ENGAGED (owner ruling 2026-10-17: "There is no need to read
 * google at all! Not until someone actually engages it.").
 *
 * The card decides whether to offer itself from what this device already knows — the last Google
 * answer any surface saw (`./connectedHint`) — so a new chat makes no Google read, no scope-tree
 * read, no organization read. Engaging THE CARD (pointer over it, focus inside it, a touch) opens
 * the one batched state read, so by the time the press lands the answer is usually there; the
 * Connect press opens the consent dialog at once (it shares the same cached reads). If the read
 * says she is already connected (or every account is blocked) the card steps away, and the read
 * itself leaves the device's hint behind (`useGoogleConnectorState`), so it is not offered again.
 *
 * Engaging the PAGE is not engaging the card (2026-10-17: the page-engagement trigger still cost
 * every typed "hello" two to six reads).
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
  const userId = useAppSelector(selectUserId);
  const [engaged, setEngaged] = useState(false);
  const [hint, setHint] = useState(() => readConnectorHint(provider.id, userId));
  useEffect(() => setHint(readConnectorHint(provider.id, userId)), [provider.id, userId]);
  // The shell's ONE lazy after-paint read (`platform.shell_counts`, already made for the header's
  // counts) says whether this person has an active Google connection in OUR records — no Google
  // call, no extra request. It becomes the device's hint, so a new person or a new device learns
  // "not connected" without anyone opening Settings (review A2, 2026-10-18), and a connection made
  // on another device clears a stale "not connected".
  const shellGoogleConnected = useShellCounts().data?.googleConnected ?? null;
  useEffect(() => {
    if (shellGoogleConnected === null || !userId) return;
    const previous = readConnectorHint(provider.id, userId);
    const next = { connected: shellGoogleConnected, blocked: previous?.blocked ?? false };
    if (previous?.connected === next.connected) return;
    rememberConnectorHint(provider.id, userId, next);
    setHint(next);
  }, [provider.id, userId, shellGoogleConnected]);
  const state = useGoogleConnectorState({ enabled: engaged });
  const openConsent = useOpenConnectorConsentDialog();

  const known = engaged && !state.isLoading && !state.isError;
  const connected = known
    ? state.accounts.some((account) =>
        anyProductConnected(accountHealth({ provider, account, rollout: state.rollout })),
      )
    : (hint?.connected ?? false);

  /**
   * Every account this person has is BLOCKED — nothing can be approved, so the
   * offer is withheld rather than opening a provider window that cannot land
   * (V17-1). A person with no account at all still gets the offer: the fault is
   * per account, and a first connect may be exactly what works.
   */
  const blocked = known
    ? state.accounts.length > 0 && state.accounts.every((account) => account.blocked === true)
    : (hint?.blocked ?? false);

  const engage = () => {
    if (!engaged) setEngaged(true);
  };

  /**
   * Never offer on a guess (owner ruling 2026-10-17: "if we're not checking Google, then the card
   * that tells you to connect google doesn't show"). The offer appears only when we KNOW the person
   * is not connected — from a real read, or from the device's last answer. Unknown = no card.
   */
  const knownNotConnected = known ? !connected : hint !== null && !hint.connected;
  if (!knownNotConnected) return null;

  const card = (
    <div
      className="contents"
      onPointerOver={engage}
      onFocusCapture={engage}
      onTouchStart={engage}
    >
      <ConnectorPromptCard
        provider={provider}
        connected={connected}
        blocked={blocked}
        onConnect={() => {
          engage();
          openConsent();
        }}
        variant={variant === "bare" ? "bare" : "card"}
        className={
          variant === "float"
            ? cn("pointer-events-auto bg-card shadow-lg dark:shadow-none", className)
            : className
        }
      />
    </div>
  );

  if (variant !== "float") return card;

  // A zero-height anchor (its -mt-4 cancels the slot's flex gap, so the column measures exactly as
  // with an empty slot) holds the card in a fixed area: appearing moves nothing.
  return (
    <div
      data-connector-prompt-anchor=""
      className="pointer-events-none relative -mt-4 h-0"
    >
      <div className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-[480px]">
        {card}
      </div>
    </div>
  );
}
