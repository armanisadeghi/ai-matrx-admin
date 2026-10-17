// lib/app-instances/computers.ts
//
// THE client/server "is this app_instances row a computer?" (CONFIG-ATTEST-ROLLOUT, owner ruling 2026-10-15).
//
// Web browsers ("web"), the Chrome extension ("chrome-extension") and servers ("server") register
// `public.app_instances` rows so their config reads can be attested — they are installs, never computers.
// The excluded set is DATA (knob `platform.app_instances/non_computer_platforms`) and the database owns the
// one definition, `platform.is_computer_instance(platform)`; this helper reads the same knob, so the two can
// never disagree. A NULL platform is a computer (every legacy row). An unseeded knob THROWS (no code default).
// Python twin: aidream `aidream.services.app_instances.only_computers`.
//
// Single-row reads use `computerQuery` (the builder, unexecuted). A read that is not a computer list (an update, a lookup of an id the user already picked from a computer
// list) carries `app-instances: not-a-computer-list (<why>)` instead; `pnpm check:app-instances-computer-only`
// fails any read with neither.

export const NON_COMPUTER_KNOB = { feature: "platform.app_instances", key: "non_computer_platforms" } as const;

type KnobReader = {
  schema(schema: "platform"): {
    from(table: "feature_knob"): {
      select(columns: "value"): {
        eq(column: "feature", value: string): {
          eq(column: "key", value: string): {
            is(column: "archived_at", value: null): PromiseLike<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };
  };
};

const TTL_MS = 60_000;
let held: { at: number; list: string[] } | null = null;

/** The platforms that are installs but not computers (60 s window, like every knob read). */
export async function nonComputerPlatforms(client: unknown): Promise<string[]> {
  if (held && Date.now() - held.at < TTL_MS) return held.list;
  const { data, error } = await (client as KnobReader)
    .schema("platform")
    .from("feature_knob")
    .select("value")
    .eq("feature", NON_COMPUTER_KNOB.feature)
    .eq("key", NON_COMPUTER_KNOB.key)
    .is("archived_at", null);
  if (error) throw new Error(`Could not read knob ${NON_COMPUTER_KNOB.feature}.${NON_COMPUTER_KNOB.key}: ${error.message}`);
  const value = Array.isArray(data) ? (data[0] as { value?: unknown } | undefined)?.value : undefined;
  if (!Array.isArray(value) || !value.every((p) => typeof p === "string" && /^[a-z0-9-]+$/.test(p))) {
    throw new Error(
      `Knob ${NON_COMPUTER_KNOB.feature}.${NON_COMPUTER_KNOB.key} is missing or not a JSON array of platform names; ` +
        "it has no code fallback by design — seed it (aidream migration 20261016130000).",
    );
  }
  held = { at: Date.now(), list: value as string[] };
  return held.list;
}

/** The `.or()` filter that keeps computers only, or null when nothing is excluded. */
export async function computerFilter(client: unknown): Promise<string | null> {
  const excluded = await nonComputerPlatforms(client);
  if (excluded.length === 0) return null;
  return `platform.is.null,platform.not.in.(${excluded.map((p) => `"${p}"`).join(",")})`;
}

/**
 * Keep computers only and RUN the list read: `const { data, error } = await onlyComputers(supabase.from("app_instances")..., supabase)`.
 * An async function cannot hand back an unexecuted Supabase builder — the builder is thenable, so the returned
 * promise runs it. The return type says so (`Awaited<Q>`, the response), so chaining `.maybeSingle()` after it
 * fails typecheck. For a single-row read use `computerQuery`, then `.maybeSingle()`.
 */
export async function onlyComputers<Q extends { or(filters: string): Q }>(query: Q, client: unknown): Promise<Awaited<Q>> {
  const filter = await computerFilter(client);
  return (filter === null ? query : query.or(filter)) as Awaited<Q>;
}

/**
 * Keep computers only WITHOUT running the read, for a single-row read:
 * `const { query } = await computerQuery(supabase.from("app_instances")..., supabase); await query.maybeSingle()`.
 * Boxed on purpose: a promise that resolved to the thenable builder itself would run it.
 */
export async function computerQuery<Q extends { or(filters: string): Q }>(query: Q, client: unknown): Promise<{ query: Q }> {
  const filter = await computerFilter(client);
  return { query: filter === null ? query : query.or(filter) };
}

/**
 * A Matrx 2 TEST copy: a computer marked as a test by its `inst_automation_` instance id (minted only by
 * the desktop's automationIdentity; the database's twin is platform.is_test_app_instance). It IS a
 * computer: Devices lists it (last) and opens it. Only pickers that choose a real machine for real work
 * leave it out, through onlyRealComputers.
 */
export const TEST_INSTANCE_PREFIX = "inst_automation_";

export function isTestDevice(row: { instance_id?: string | null }): boolean {
  return typeof row.instance_id === "string" && row.instance_id.startsWith(TEST_INSTANCE_PREFIX);
}

/**
 * FOR PICKERS THAT CHOOSE A REAL MACHINE FOR REAL WORK (compute targets, local tools): computers only,
 * and never a test copy. Runs the read, like onlyComputers.
 */
export async function onlyRealComputers<Q extends { or(filters: string): Q; not(column: string, operator: string, value: string): Q }>(
  query: Q,
  client: unknown,
): Promise<Awaited<Q>> {
  return onlyComputers(query.not("instance_id", "like", `${TEST_INSTANCE_PREFIX}%`), client);
}

/** Same rule for a row already in hand. */
export function isComputerPlatform(platform: string | null | undefined, excluded: readonly string[]): boolean {
  return platform == null || !excluded.includes(platform);
}

/** TEST SEAM: forget the 60 s window. */
export function __resetNonComputerPlatformsForTests(): void {
  held = null;
}
