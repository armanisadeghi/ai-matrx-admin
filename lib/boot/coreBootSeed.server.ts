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

export async function readCoreBootSeedServer(supabase: ServerClient, userId: string): Promise<CoreBootSeed | null> {
  const answer = await bounded(CORE_SEED_DEADLINE_MS, "iam.core_boot_seed", (signal) =>
    (supabase.schema("iam") as unknown as UntypedRpc).rpc("core_boot_seed").abortSignal(signal),
  );
  if (!answer) return null;
  if (answer.error) {
    console.warn(`[core-boot-seed] iam.core_boot_seed failed: ${answer.error.message}`);
    return null;
  }
  const seed = parseCoreBootSeed(answer.data, userId);
  if (!seed) console.warn("[core-boot-seed] iam.core_boot_seed answered an unexpected shape; not seeding");
  return seed;
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

export async function readKnobSeedServer(
  supabase: ServerClient,
  seed: CoreBootSeed | null,
  deviceId: string | null,
  search: string | null,
): Promise<KnobSnapshotSeed | null> {
  if (!seed || !deviceId) return null; // no device cookie: the rung cannot be addressed the same way
  const organizationId = predictedOrganizationId(seed, search);
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
