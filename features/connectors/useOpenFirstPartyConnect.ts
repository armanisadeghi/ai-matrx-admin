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
// close (`first-party-connect-flow.ts`), re-reads the inventory (never trusts an
// event) and compares: a connection that now works, or the product now granted.
// An account that did not change while the dialog was up is a cancel, answered
// at once; one that changed but does not prove it yet is read once more.

import { useQueryClient } from "@tanstack/react-query";
import { isOverlayOpen } from "@ai-matrx/summon/boot";
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
import type { GoogleConnectionSummary } from "@/features/marketing/google/types";
import { toast } from "@/lib/toast";
import { googleConnectionForProduct } from "./google-status";
import {
  connectLanded,
  waitForOverlayClosed,
  type AccountRead,
} from "./first-party-connect-flow";

const CONSENT_OVERLAY_ID = "connectorConsentDialog";
/** What a plain "Connect Google" switches on: the products a chat can use today. */
const DEFAULT_PRODUCT_KEYS = ["workspace_files", "gmail"] as const;

type Row = Pick<GoogleConnectionSummary, "id" | "health" | "scopes" | "status" | "updated_at" | "account_email" | "account_name">;

/** Changes whenever any of the person's accounts is granted, renewed or broken. */
export function accountFingerprint(rows: readonly Row[]): string {
  return rows
    .map((row) => `${row.id}|${row.status}|${row.health}|${[...row.scopes].sort().join(",")}|${row.updated_at}`)
    .sort()
    .join("\n");
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

  /** A fresh read, in the shape every Google surface reads (the same cache entry, so the list updates at once). */
  const readAccounts = async (): Promise<Row[]> => {
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
    return filterGoogleConnectionInventoryForUser(raw, userId ?? null, orgIds).connections;
  };

  return async (id, options) => {
    if (id !== "google") {
      toast.error(`${id} cannot be connected from here.`);
      return false;
    }
    // What the account looked like before the dialog: an unchanged account afterwards means nothing was
    // granted (a cancel), answered at once.
    let before: string;
    try {
      before = accountFingerprint(await readAccounts());
    } catch (cause) {
      toast.error("Could not check your Google account.", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return false;
    }
    // Subscribe BEFORE opening, so a dialog that opens in the same tick is seen opening.
    const wait = waitForOverlayClosed(store, (state) => isOverlayOpen(state as never, CONSENT_OVERLAY_ID));
    try {
      openConsent({
        initialProductKeys: options?.productKey ? [options.productKey] : [...DEFAULT_PRODUCT_KEYS],
      });
    } catch (cause) {
      wait.cancel();
      toast.error("Could not open Google's connect window.", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return false;
    }
    if ((await wait.done) === "never_opened") {
      toast.error("Google's connect window did not open. Nothing was connected.");
      return false;
    }
    try {
      return await connectLanded(before, async (): Promise<AccountRead> => {
        const rows = await readAccounts();
        return {
          fingerprint: accountFingerprint(rows),
          // Proven by a healthy account holding the product asked for — or, for a plain connect, any
          // product a chat can use. (Not the card's state: another account needing repair makes the
          // card say so, which says nothing about whether THIS grant landed.)
          proven: (options?.productKey ? [options.productKey] : DEFAULT_PRODUCT_KEYS).some(
            (key) => googleConnectionForProduct(key, rows) !== undefined,
          ),
        };
      });
    } catch (cause) {
      toast.error("Could not check your Google account.", {
        description: cause instanceof Error ? cause.message : undefined,
      });
      return false;
    }
  };
}
