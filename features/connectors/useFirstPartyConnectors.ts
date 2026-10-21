"use client";

// features/connectors/useFirstPartyConnectors.ts
//
// The chat package's `useFirstPartyConnectors` slot: the connectors this app
// connects through its own door and the MCP catalog cannot hold — Google today
// (Arman, 2026-10-20). The state is the SAME inventory query every Google
// surface reads (`useGoogleConnectionInventory`), over the SAME accounts the
// Browse window counts (the viewer's own) and through the SAME summary
// (`googleAccountSummary`), so the menu and the window cannot disagree.
//
// `enabled: false` is the PASSIVE read (the adoption hook): it shows what the
// inventory already holds and starts no request of its own — no Google read
// until a person engages Google (owner ruling 2026-10-17). A chat that opens a
// connect window turns it on (`beginConnectFlow`).

import type {
  FirstPartyConnector,
  FirstPartyConnectorsResult,
} from "@ai-matrx/chat/agents/connectors/first-party-connectors";
import { useGoogleConnectionInventory } from "@/features/marketing/google/hooks";
import type { GoogleConnectionInventory } from "@/features/marketing/google/types";
import {
  buildGoogleChatConnector,
  ownGoogleConnections,
} from "./google-chat-connector";
import { useConnectionViewer } from "./useConnectionViewer";
import type { ConnectionViewer } from "./connection-ownership";

function connectorsFrom(
  inventory: GoogleConnectionInventory | undefined,
  viewer: ConnectionViewer,
  read: { loading: boolean; failed: boolean },
): readonly FirstPartyConnector[] {
  const rows = ownGoogleConnections(inventory?.connections ?? [], viewer);
  return [buildGoogleChatConnector(rows, read)];
}

export function useFirstPartyConnectors(
  options: { enabled?: boolean } = {},
): FirstPartyConnectorsResult {
  const enabled = options.enabled ?? true;
  const inventory = useGoogleConnectionInventory({ enabled });
  const viewer = useConnectionViewer();
  const failed = inventory.isError && !inventory.data;
  // A passive read with nothing cached yet has not been asked: not ready, and the row (if any
  // surface draws it) is "checking", never "not connected".
  const loading = !inventory.data && !failed;
  return {
    ready: Boolean(inventory.data) || failed,
    connectors: connectorsFrom(inventory.data, viewer, { loading, failed }),
    // Resolves with the connectors as the fresh read found them (null when it failed).
    refresh: async () => {
      const fresh = await inventory.refetch();
      if (fresh.isError || !fresh.data) return null;
      return connectorsFrom(fresh.data, viewer, { loading: false, failed: false });
    },
  };
}
