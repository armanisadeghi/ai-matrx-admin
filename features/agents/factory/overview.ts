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

import { formatSpendUsd } from "@/components/cost/formatAdminCost";
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
  | "plan_room"
  | "studio";

export interface DoorInfo {
  key: DoorKey;
  /** Plain name of the place. */
  place: string;
  /** Where a person goes to use it; null = no page (a tool or API). */
  href: string | null;
  /** Mandate whose runs are this door's old builder, when attributable. */
  oldBuilderMandate: string | null;
  /** True when the door always builds through the factory and has no knob (aidream `ALWAYS_PIPELINE_DOORS`). */
  alwaysFactory?: boolean;
  /** Not a door code of its own: builds go through this other door (System Builder → studio). */
  via?: DoorKey;
}

/** The Generate page's old builder is the generator shortcut; its runs carry this mandate key. */
export const GENERATOR_SHORTCUT_MANDATE = "shortcut.agent_generator";
/** The Mandate page's "+ Agent" old builder: the drafting job. */
export const HOLDER_DRAFT_MANDATE = "mandates.holder_draft";

export const DOORS: readonly DoorInfo[] = [
  {
    key: "studio",
    place: "Agent Studio",
    href: "/agents/new/studio",
    oldBuilderMandate: null,
    alwaysFactory: true,
  },
  {
    key: "generate",
    place: "Generate with AI page",
    href: "/agents/new/generate",
    oldBuilderMandate: GENERATOR_SHORTCUT_MANDATE,
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
    oldBuilderMandate: HOLDER_DRAFT_MANDATE,
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

/**
 * Rows that are not a door code: System Builder plans several agents and builds each one through
 * the Agent Studio door, so its builds are counted on the Agent Studio row.
 */
export const VIA_STUDIO_PLACES: readonly { id: string; place: string; href: string }[] = [
  { id: "system_builder", place: "System Builder (builds through Agent Studio)", href: "/agents/system-builder" },
];

/** The human label of a door code; an unknown code reads as itself so nothing is hidden. */
export function doorLabel(door: string | null | undefined): string {
  if (!door) return "Admin page";
  return DOORS.find((d) => d.key === door)?.place ?? door;
}

/** Request-metadata key the server stamps on every old-builder run it makes for a door (aidream `door_stamp`). */
export const FACTORY_DOOR_METADATA = "factory_door";
/**
 * The day the server began stamping the door on old-builder runs. Runs before it carry no door,
 * so a server-side door's old-builder count only covers the time since this date.
 */
export const FACTORY_DOOR_STAMP_SINCE = "2026-10-10";

/** Accounts our own agents and tests sign in as; their builds are not real people's. */
export const TEST_ACCOUNT_EMAILS: ReadonlySet<string> = new Set([
  "admin@admin.com",
  "test@test.com",
]);

export type Builder = "factory" | "old" | "unknown";

/** Each door's builder right now: the knob's platform value. */
export async function loadDoorBuilders(): Promise<Record<string, Builder>> {
  const knobs = await fetchKnobIndex({
    organizationId: null,
    featurePrefix: "agent_factory",
  });
  const out: Record<string, Builder> = {};
  for (const door of DOORS) {
    if (door.alwaysFactory) {
      out[door.key] = "factory";
      continue;
    }
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

export interface OldRunCounts {
  /** Old-builder runs per mandate key (the structure builder, chat brief, drafting job, generator). */
  byMandate: Record<string, RunCounts>;
  /** Structure-builder runs per door, from the door the server stamped on each run. */
  byDoor: Record<string, RunCounts>;
}

const emptyCounts = (): RunCounts => ({ d7: 0, d30: 0, last: null });

function bump(c: RunCounts, createdAt: string, week: number): void {
  c.d30 += 1;
  if (new Date(createdAt).getTime() >= week) c.d7 += 1;
  if (!c.last || createdAt > c.last) c.last = createdAt;
}

/**
 * Runs of the old builders, from the request each run recorded: per mandate key, and — for the
 * structure builder — per door (`metadata.factory_door`, stamped by the server since
 * FACTORY_DOOR_STAMP_SINCE).
 */
export async function loadOldBuilderRuns(
  mandateKeys: string[],
): Promise<OldRunCounts> {
  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .schema("chat")
    .from("user_request")
    .select(
      `created_at, mandate_key:metadata->>mandate_key, door:metadata->>${FACTORY_DOOR_METADATA}` as string,
    )
    .in("metadata->>mandate_key" as string, mandateKeys)
    .gte("created_at", since)
    .limit(5000);
  if (error) throw operationFailed("load the old-builder runs", error);
  const byMandate: Record<string, RunCounts> = Object.fromEntries(
    mandateKeys.map((k) => [k, emptyCounts()]),
  );
  const byDoor: Record<string, RunCounts> = {};
  const week = Date.now() - 7 * 86_400_000;
  for (const row of (data ?? []) as unknown as Array<{
    created_at: string;
    mandate_key: string;
    door: string | null;
  }>) {
    const c = byMandate[row.mandate_key];
    if (!c) continue;
    bump(c, row.created_at, week);
    if (row.door) bump((byDoor[row.door] ??= emptyCounts()), row.created_at, week);
  }
  return { byMandate, byDoor };
}

/** Old-builder counts for one door: its own mandate's runs plus the structure-builder runs stamped with it. */
export function oldCountsForDoor(
  door: DoorInfo,
  runs: OldRunCounts | null,
): { counts: RunCounts; recordedSince: string | null } | null {
  if (!runs) return null;
  const own = door.oldBuilderMandate ? runs.byMandate[door.oldBuilderMandate] : null;
  const stamped = runs.byDoor[door.key] ?? null;
  const counts: RunCounts = {
    d7: (own?.d7 ?? 0) + (stamped?.d7 ?? 0),
    d30: (own?.d30 ?? 0) + (stamped?.d30 ?? 0),
    last: [own?.last, stamped?.last].filter((x): x is string => Boolean(x)).sort().pop() ?? null,
  };
  // A door with its own mandate has a complete record; any other door's record starts at the stamp.
  return { counts, recordedSince: door.oldBuilderMandate ? null : FACTORY_DOOR_STAMP_SINCE };
}

export interface DoorFactoryCounts {
  /** Builds by real people. */
  people: RunCounts;
  /** Builds by our own test and admin accounts (admin@admin.com, agents, scripts). */
  test: RunCounts;
}

/**
 * Agents the factory kept per door, from the builds themselves (a build with no door is not
 * attributable), split into real people and test/admin accounts so a row can never read as
 * "this place uses the factory" when only our own tests did.
 */
export function factoryDoorCounts(
  builds: FactoryBuildRow[],
  testUserIds: ReadonlySet<string> = new Set(),
): Record<string, DoorFactoryCounts> {
  const out: Record<string, DoorFactoryCounts> = {};
  const week = Date.now() - 7 * 86_400_000;
  const month = Date.now() - 30 * 86_400_000;
  for (const b of builds) {
    if (!b.door) continue;
    const door = (out[b.door] ??= { people: emptyCounts(), test: emptyCounts() });
    const c = b.userId && testUserIds.has(b.userId) ? door.test : door.people;
    if (!c.last || b.createdAt > c.last) c.last = b.createdAt;
    if (!b.agentId || !b.outcome || !KEPT_OUTCOMES.has(b.outcome)) continue;
    const t = new Date(b.createdAt).getTime();
    if (t >= month) c.d30 += 1;
    if (t >= week) c.d7 += 1;
  }
  return out;
}

/** Which of these people are our own test/admin accounts (by email), via the admin label read. */
export async function loadTestUserIds(userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds)];
  const out = new Set<string>();
  if (unique.length === 0) return out;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_user_labels", {
    p_ids: unique,
  });
  if (error) throw operationFailed("tell test accounts from real people", error);
  for (const row of (data ?? []) as Array<{ id: string; email: string | null }>) {
    if (row.email && TEST_ACCOUNT_EMAILS.has(row.email.toLowerCase())) out.add(row.id);
  }
  return out;
}

/** Dollars to the cent; anything under a cent reads "<$0.01", zero reads "$0.00". */
export function formatDollars(value: number | null | undefined): string {
  if (value == null) return "—";
  return formatSpendUsd(value);
}
