import { getAgentCatalog } from "@/lib/agents/catalog";
import type { AgentLookup } from "./board-agent-resolve";

/** The app's agent catalog as the lookup `resolveAgentRef` reads (the one registry the agent picker uses). */
export function catalogAgentLookup(): AgentLookup {
  const catalog = getAgentCatalog();
  return {
    ensureLoaded: () => catalog.ensureLoaded(),
    rows: () => catalog.getState().rows,
    byId: (id) => catalog.getAgent(id),
    searchServer: (q) => catalog.searchServer(q),
  };
}
