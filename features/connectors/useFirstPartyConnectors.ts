"use client";

// features/connectors/useFirstPartyConnectors.ts
//
// The chat package's `useFirstPartyConnectors` slot: the connectors this app
// connects through its own door and the MCP catalog cannot hold — Google today
// (Arman, 2026-10-20). The state is the SAME inventory query every Google
// surface reads (`useGoogleConnectionInventory`), so a connection made anywhere
// updates the + menu and the chat's adoption without a second read.
//
// `enabled: false` is the PASSIVE read (the adoption hook): it shows what the
// inventory already holds and starts no request of its own — no Google read
// until a person engages Google (owner ruling 2026-10-17).

import type { FirstPartyConnectorsResult } from "@ai-matrx/chat/agents/connectors/first-party-connectors";
import { useGoogleConnectionInventory } from "@/features/marketing/google/hooks";
import { buildGoogleChatConnector } from "./google-chat-connector";
import { CATALOG_SEARCH_TERMS } from "./connector-search-terms";

export function useFirstPartyConnectors(
  options: { enabled?: boolean } = {},
): FirstPartyConnectorsResult {
  const enabled = options.enabled ?? true;
  const inventory = useGoogleConnectionInventory({ enabled });
  const rows = inventory.data?.connections ?? [];
  const failed = inventory.isError && !inventory.data;
  // A passive read with nothing cached yet has not been asked: not ready, and the row (if any
  // surface draws it) is "checking", never "not connected".
  const loading = !inventory.data && !failed;
  return {
    ready: Boolean(inventory.data) || failed,
    connectors: [buildGoogleChatConnector(rows, { loading, failed })],
    searchTermsBySlug: CATALOG_SEARCH_TERMS,
    refresh: () => void inventory.refetch(),
  };
}
