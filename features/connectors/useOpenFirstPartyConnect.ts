"use client";

// features/connectors/useOpenFirstPartyConnect.ts
//
// The chat package's `useOpenFirstPartyConnect` slot: connect (or add a product
// to) a first-party connector WITHOUT leaving the chat, and answer true only
// when a fresh read of the account proves it (Arman, 2026-10-20: "even the most
// basic things, like connecting my gmail, aren't working").
//
// Google's door is the consent dialog ("Choose Google apps to connect"), which
// asks for exactly the products switched on — `initialProductKeys` switches on
// the one the person searched for (Gmail). The old chat door opened the connect
// WINDOW, which grants Docs and Sheets only, so "connect Gmail" could never
// have granted Gmail.
//
// The dialog reports nothing when it closes, so this waits for its overlay to
// close, re-reads the inventory (never trusts an event) and compares: a
// connection that now works, or the product now granted.

import { useQueryClient } from "@tanstack/react-query";
import { selectIsOverlayOpen } from "@ai-matrx/summon/open";
import type { OpenFirstPartyConnect } from "@ai-matrx/chat/agents/connectors/first-party-connectors";
import { useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useLazyAppOpener } from "@/features/overlays/useLazyAppOpener";
import { liveOrganizationIdsAmong } from "@/features/organizations/organizationsIAmIn";
import {
  filterGoogleConnectionInventoryForUser,
  listGoogleConnectionInventory,
} from "@/features/marketing/google/service";
import { googleConnectionKeys } from "@/features/marketing/google/hooks";
import { toast } from "@/lib/toast";
import { googleChatState } from "./google-chat-connector";
import { googleConnectionForProduct } from "./google-status";

const CONSENT_OVERLAY_ID = "connectorConsentDialog";
/** What a plain "Connect Google" switches on: the products a chat can use today. */
const DEFAULT_PRODUCT_KEYS = ["workspace_files", "gmail"] as const;
const OPEN_WAIT_MS = 10_000;

/** Resolves when the overlay, once open, is closed again (or never opened within the wait). */
function overlayClosed(
  store: { getState: () => unknown; subscribe: (listener: () => void) => () => void },
  overlayId: string,
): Promise<void> {
  return new Promise((resolve) => {
    let seenOpen = false;
    let unsubscribe: () => void = () => undefined;
    const done = () => {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const timer = setTimeout(() => {
      if (!seenOpen) done();
    }, OPEN_WAIT_MS);
    unsubscribe = store.subscribe(() => {
      const open = selectIsOverlayOpen(store.getState() as never, overlayId);
      if (open) seenOpen = true;
      else if (seenOpen) done();
    });
  });
}

export function useOpenFirstPartyConnect(): OpenFirstPartyConnect {
  const store = useAppStore();
  const queryClient = useQueryClient();
  const userId = useAppSelector(selectUserId);
  const openConsent = useLazyAppOpener("connectorConsentDialog", () =>
    import("@/features/overlays/definitions/connectorConsentDialog.overlay").then(
      (m) => m.createConnectorConsentDialogOpener,
    ),
  );

  return async (id, options) => {
    if (id !== "google") {
      toast.error(`${id} cannot be connected from here.`);
      return false;
    }
    openConsent({
      initialProductKeys: options?.productKey ? [options.productKey] : [...DEFAULT_PRODUCT_KEYS],
    });
    await overlayClosed(store, CONSENT_OVERLAY_ID);
    try {
      // A fresh read, in the shape every Google surface reads (the same cache entry, so the
      // list updates at once).
      const raw = await queryClient.fetchQuery({
        queryKey: [...googleConnectionKeys.inventory, userId],
        queryFn: ({ signal }) => listGoogleConnectionInventory(signal),
        staleTime: 0,
      });
      const orgIds = await liveOrganizationIdsAmong(
        raw.connections
          .filter((connection) => connection.owner_user_id === null && connection.organization_id)
          .map((connection) => connection.organization_id),
      );
      const rows = filterGoogleConnectionInventoryForUser(raw, userId ?? null, orgIds).connections;
      return options?.productKey
        ? googleConnectionForProduct(options.productKey, rows) !== undefined
        : googleChatState(rows, { loading: false, failed: false }) === "connected";
    } catch (cause) {
      toast.error("Could not check your Google account.", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return false;
    }
  };
}
