/**
 * The pure half of the board's Agent item (`agent-items.tsx`): one agent's record. Saved form
 * `{ kind: "entity", entity: "agent", id }` — a reference, never a copy. (An agent's FORM or CHAT on
 * a board are the separate `agent-form` and `chat` items; this is the agent itself.)
 */

import type { NodeSource } from "../board/document";

export const AGENT_ITEM_KEY = "agent";

export function agentSource(id: string): NodeSource {
  return { kind: "entity", entity: AGENT_ITEM_KEY, id };
}

export function agentIdOf(source: NodeSource): string | null {
  return source.kind === "entity" && source.entity === AGENT_ITEM_KEY ? source.id : null;
}

export const agentRecordHref = (id: string) => `/agents/${id}`;
