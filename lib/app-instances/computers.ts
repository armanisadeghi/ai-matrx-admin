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
// A read that is not a computer list (an update, a lookup of an id the user already picked from a computer
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

/** Keep computers only: `await onlyComputers(supabase.from("app_instances").select(...)..., supabase)`. */
export async function onlyComputers<Q extends { or(filters: string): Q }>(query: Q, client: unknown): Promise<Q> {
  const excluded = await nonComputerPlatforms(client);
  if (excluded.length === 0) return query;
  return query.or(`platform.is.null,platform.not.in.(${excluded.map((p) => `"${p}"`).join(",")})`);
}

/** Same rule for a row already in hand. */
export function isComputerPlatform(platform: string | null | undefined, excluded: readonly string[]): boolean {
  return platform == null || !excluded.includes(platform);
}

/** TEST SEAM: forget the 60 s window. */
export function __resetNonComputerPlatformsForTests(): void {
  held = null;
}
