/**
 * Agent Factory overview — the facts behind "which place makes agents, which builder runs there,
 * and what did a build really cost". All reads are React → Supabase under the admin seat's RLS.
 *
 * - Real build cost = the sum of the build's child executions (`root_execution_id`); the root
 *   row's own cost is always 0.
 * - Which builder a door uses = its Feature Knob `agent_factory.door_<door>`, PLATFORM value only.
 * - Old-builder runs = mandate runs (`chat.user_request.metadata.mandate_key`): the structure
 *   builder (every door that builds through it) and the chat brief ("from chat").
 */

import { createClient } from "@/utils/supabase/client";
import { fetchKnobIndex } from "@/lib/scoped-config/service";
import { operationFailed } from "@/utils/errors";
import type { FactoryBuildRow } from "./types";
import { KEPT_OUTCOMES } from "./types";

export type DoorKey =
  | "agent_author"
  | "agent_author_rebuild"
  | "agent_service"
  | "content_foundry"
  | "custom_action"
  | "from_chat"
  | "generate"
  | "mandate_holder_draft"
  | "masterwork"
  | "node_agent"
  | "people_mcp"
  | "plan_room";

export interface DoorInfo {
  key: DoorKey;
  /** Plain name of the place. */
  place: string;
  /** Where a person goes to use it; null = no page (a tool or API). */
  href: string | null;
  /** Mandate whose runs are this door's old builder, when attributable. */
  oldBuilderMandate: string | null;
}

export const DOORS: readonly DoorInfo[] = [
  {
    key: "generate",
    place: "Generate with AI page",
    href: "/agents/new/generate",
    oldBuilderMandate: null,
  },
  {
    key: "from_chat",
    place: "Chat menu: Make an agent from this chat",
    href: "/chat",
    oldBuilderMandate: "agent_studio.chat_brief",
  },
  {
    key: "mandate_holder_draft",
    place: "Mandate page: + Agent tab",
    href: "/mandates",
    oldBuilderMandate: null,
  },
  {
    key: "masterwork",
    place: "Masterwork build",
    href: "/masterwork",
    oldBuilderMandate: null,
  },
  {
    key: "plan_room",
    place: "Workflow Plan Room agent step",
    href: "/workflows",
    oldBuilderMandate: null,
  },
  {
    key: "node_agent",
    place: "Workflow node agent",
    href: "/workflows",
    oldBuilderMandate: null,
  },
  {
    key: "content_foundry",
    place: "Content foundry node",
    href: "/workflows",
    oldBuilderMandate: null,
  },
  {
    key: "custom_action",
    place: "Admin create-agent action",
    href: null,
    oldBuilderMandate: null,
  },
  {
    key: "agent_author",
    place: "Agent Author tool",
    href: null,
    oldBuilderMandate: null,
  },
  {
    key: "agent_author_rebuild",
    place: "Agent Author tool: rebuild",
    href: null,
    oldBuilderMandate: null,
  },
  {
    key: "agent_service",
    place: "Agent Service create (API)",
    href: null,
    oldBuilderMandate: null,
  },
  {
    key: "people_mcp",
    place: "People tool (MCP)",
    href: null,
    oldBuilderMandate: null,
  },
];

export const STRUCTURE_BUILDER_MANDATE = "agent_factory.structure_builder";

export type Builder = "factory" | "old" | "unknown";

/** Each door's builder right now: the knob's platform value. */
export async function loadDoorBuilders(): Promise<Record<string, Builder>> {
  const knobs = await fetchKnobIndex({
    organizationId: null,
    featurePrefix: "agent_factory",
  });
  const out: Record<string, Builder> = {};
  for (const door of DOORS) {
    const knob = knobs.find((k) => k.key === `door_${door.key}`);
    const value = knob?.effective_value;
    out[door.key] =
      value === "pipeline" ? "factory" : value === "legacy" ? "old" : "unknown";
  }
  return out;
}

/** Real cost per build, in dollars: Σ child executions by root. Chunked to keep the URL short. */
export async function loadBuildCosts(
  buildIds: string[],
): Promise<Map<string, number>> {
  const supabase = createClient();
  const costs = new Map<string, number>(buildIds.map((id) => [id, 0]));
  const CHUNK = 40;
  for (let i = 0; i < buildIds.length; i += CHUNK) {
    const ids = buildIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .schema("runtime")
      .from("global_execution")
      .select("root_execution_id, cost")
      .in("root_execution_id", ids)
      .gt("cost", 0)
      .limit(5000);
    if (error) throw operationFailed("load the build costs", error);
    for (const row of data ?? []) {
      const root = row.root_execution_id as string | null;
      if (root) costs.set(root, (costs.get(root) ?? 0) + Number(row.cost ?? 0));
    }
  }
  return costs;
}

export interface RunCounts {
  d7: number;
  d30: number;
  last: string | null;
}

/** Runs of a mandate through the old builders, from the request each run recorded. */
export async function loadMandateRunCounts(
  mandateKeys: string[],
): Promise<Record<string, RunCounts>> {
  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .schema("chat")
    .from("user_request")
    .select("created_at, mandate_key:metadata->>mandate_key" as string)
    .in("metadata->>mandate_key" as string, mandateKeys)
    .gte("created_at", since)
    .limit(5000);
  if (error) throw operationFailed("load the old-builder runs", error);
  const out: Record<string, RunCounts> = Object.fromEntries(
    mandateKeys.map((k) => [k, { d7: 0, d30: 0, last: null }]),
  );
  const week = Date.now() - 7 * 86_400_000;
  for (const row of (data ?? []) as unknown as Array<{
    created_at: string;
    mandate_key: string;
  }>) {
    const c = out[row.mandate_key];
    if (!c) continue;
    c.d30 += 1;
    if (new Date(row.created_at).getTime() >= week) c.d7 += 1;
    if (!c.last || row.created_at > c.last) c.last = row.created_at;
  }
  return out;
}

/** Agents the factory kept per door, from the builds themselves (a build with no door is not attributable). */
export function factoryDoorCounts(
  builds: FactoryBuildRow[],
): Record<string, RunCounts> {
  const out: Record<string, RunCounts> = {};
  const week = Date.now() - 7 * 86_400_000;
  const month = Date.now() - 30 * 86_400_000;
  for (const b of builds) {
    if (!b.door) continue;
    const c = (out[b.door] ??= { d7: 0, d30: 0, last: null });
    if (!c.last || b.createdAt > c.last) c.last = b.createdAt;
    if (!b.agentId || !b.outcome || !KEPT_OUTCOMES.has(b.outcome)) continue;
    const t = new Date(b.createdAt).getTime();
    if (t >= month) c.d30 += 1;
    if (t >= week) c.d7 += 1;
  }
  return out;
}

/** Dollars to the cent; anything under a cent reads "<$0.01", zero reads "$0.00". */
export function formatDollars(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value > 0 && value < 0.01) return "<$0.01";
  return `$${value.toFixed(2)}`;
}
