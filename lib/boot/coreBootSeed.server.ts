// lib/boot/coreBootSeed.server.ts — the SERVER half of the (core) layout's boot seed.
//
// `readCoreBootSeedServer` is ONE call (`iam.core_boot_seed`, SECURITY INVOKER: the caller's own
// rights, so it answers exactly what the browser's boot reads would) made IN the layout's one
// parallel round. It is bounded: past the deadline the page paints without it and the browser's
// boot reads run as before — the same path a failed read takes.
//
// `readKnobSeedServer` runs AFTER it (it needs the memberships to know the organization) and is
// never awaited above the first byte: the layout streams it to `KnobSeedPrimer` inside Suspense.

import "server-only";
import type { createClient } from "@/utils/supabase/server";
import {
  classifyLinkOrganizationValue,
  resolveActiveOrganization,
  toAccountOrganizationChoices,
} from "@ai-matrx/auth/organizations";
import { parseCoreBootSeed, type CoreBootSeed, type KnobSnapshotSeed } from "./coreBootSeedShape";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type UntypedRpc = {
  rpc(name: string, args?: Record<string, unknown>): {
    abortSignal(signal: AbortSignal): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  };
};

/** Healthy ~30-80 ms. Past this the first byte does not wait: the browser reads as before. */
export const CORE_SEED_DEADLINE_MS = 400;
/** Streamed, so it never holds the first byte; past this the browser asks for its own snapshot. */
export const KNOB_SEED_DEADLINE_MS = 1_500;

async function bounded<T>(ms: number, label: string, run: (signal: AbortSignal) => PromiseLike<T>): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const answer = await run(controller.signal);
    if (controller.signal.aborted) {
      console.warn(`[core-boot-seed] ${label} passed ${ms} ms; the browser reads it after boot`);
      return null;
    }
    return answer;
  } catch (err) {
    console.warn(`[core-boot-seed] ${label} threw; the browser reads it after boot`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** A late seed (past the first-byte deadline) still streams to the browser until this. */
export const CORE_SEED_STREAM_DEADLINE_MS = 4_000;

async function readSeed(supabase: ServerClient, userId: string, ms: number): Promise<CoreBootSeed | null> {
  const started = Date.now();
  const answer = await bounded(ms, "iam.core_boot_seed", (signal) =>
    (supabase.schema("iam") as unknown as UntypedRpc).rpc("core_boot_seed").abortSignal(signal),
  );
  if (!answer) return null;
  if (answer.error) {
    console.warn(`[core-boot-seed] iam.core_boot_seed failed: ${answer.error.message}`);
    return null;
  }
  // Over 200 organizations the seed would be megabytes on the page: not seeded, by design.
  if ((answer.data as { too_many?: unknown } | null)?.too_many) return null;
  const seed = parseCoreBootSeed(answer.data, userId);
  if (!seed) console.warn("[core-boot-seed] iam.core_boot_seed answered an unexpected shape; not seeding");
  else if (Date.now() - started > CORE_SEED_DEADLINE_MS) {
    console.warn(`[core-boot-seed] iam.core_boot_seed answered in ${Date.now() - started} ms; streamed instead of seeded`);
  }
  return seed;
}

/**
 * ONE read, two ways to land: `seed` answers by the first-byte deadline (null past it, so the first
 * byte never waits longer), and `streamed` is the same read's answer whenever it lands (bounded at
 * `CORE_SEED_STREAM_DEADLINE_MS`) — the layout streams it to `CoreSeedPrimer` when `seed` missed,
 * because the browser's boot reads start seconds after the page arrives.
 */
export function readCoreBootSeedServer(
  supabase: ServerClient,
  userId: string,
): { seed: Promise<CoreBootSeed | null>; streamed: Promise<CoreBootSeed | null> } {
  const streamed = readSeed(supabase, userId, CORE_SEED_STREAM_DEADLINE_MS);
  const seed = Promise.race([
    streamed,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), CORE_SEED_DEADLINE_MS)),
  ]);
  return { seed, streamed };
}

/**
 * The organization the ONE ladder lands on with no held tab organization: the link's `?org=` when
 * it is a current membership, else last active → start-up → first (`@ai-matrx/auth/organizations`).
 * Used only to choose which knob snapshot to read ahead; the browser still decides, and a tab that
 * decides differently reads its own snapshot.
 */
export function predictedOrganizationId(seed: CoreBootSeed, search: string | null): string | null {
  const joinedAt = new Map<string, string>();
  for (const m of seed.memberships) {
    if (m.status === "active" && m.created_at) joinedAt.set(m.container_id, m.created_at);
  }
  const memberships = seed.organizations
    .filter((o) => !o.archived_at)
    .map((o) => ({ id: o.id, ...(joinedAt.get(o.id) ? { joinedAt: joinedAt.get(o.id) } : {}) }));
  const raw = search ? new URLSearchParams(search).get("org") : null;
  if (raw) {
    const link = classifyLinkOrganizationValue(raw);
    const linked =
      link.kind === "named"
        ? link.organizationId
        : link.kind === "addressed"
          ? (seed.organizations.find((o) => o.slug === link.slug)?.id ?? null)
          : null;
    if (linked && memberships.some((m) => m.id === linked)) return linked;
  }
  const resolved = resolveActiveOrganization({
    memberships,
    held: null,
    account: toAccountOrganizationChoices(seed.preferencesRow),
  });
  return resolved?.organization.id ?? null;
}

/**
 * The two snapshots the boot asks for: the predicted organization's, and the no-organization one
 * (readers that ask before the organization has landed — the chat package's model preference).
 */
export async function readKnobSeedServer(
  supabase: ServerClient,
  seed: CoreBootSeed | null,
  deviceId: string | null,
  search: string | null,
): Promise<KnobSnapshotSeed[] | null> {
  if (!seed || !deviceId) return null; // no device cookie: the rung cannot be addressed the same way
  const predicted = predictedOrganizationId(seed, search);
  const addresses = predicted ? [predicted, null] : [null];
  const answers = await Promise.all(addresses.map((organizationId) => readOneKnobSeed(supabase, seed, deviceId, organizationId)));
  const seeds = answers.filter((a): a is KnobSnapshotSeed => a !== null);
  return seeds.length > 0 ? seeds : null;
}

async function readOneKnobSeed(
  supabase: ServerClient,
  seed: CoreBootSeed,
  deviceId: string,
  organizationId: string | null,
): Promise<KnobSnapshotSeed | null> {
  const answer = await bounded(KNOB_SEED_DEADLINE_MS, "platform.knob_snapshot_delta", (signal) =>
    (supabase.schema("platform") as unknown as UntypedRpc)
      .rpc("knob_snapshot_delta", {
        p_organization_id: organizationId,
        p_user_id: seed.userId,
        p_scopes: [{ kind: "device", id: deviceId }],
      })
      .abortSignal(signal),
  );
  if (!answer || answer.error || !answer.data || typeof answer.data !== "object") return null;
  return {
    organizationId,
    userId: seed.userId,
    deviceId,
    payload: answer.data as KnobSnapshotSeed["payload"],
  };
}
