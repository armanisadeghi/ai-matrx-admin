// The `auth.one_tap_auto_select` knob, read for a SIGNED-OUT visitor.
//
// The browser's knob reader answers `undefined` for a visitor with no session (anon is refused by
// `knob_defaults` / `knob_snapshot`), and One Tap exists only for that visitor — so the value is read
// here, in the Server Component that mounts the prompt, through the service lane. One register read
// (`knob_defaults`, the whole platform register, content-versioned) per server instance per minute,
// plus the organization's override set when the page belongs to an organization (a shared agent page
// answers with its owner's choice). Never throws: a failed read answers `false` loudly — the prompt
// still shows and the visitor clicks it; nobody is signed in automatically on a value nobody read.

import "server-only";

import { createAdminClient } from "@/utils/supabase/adminClient";

const ADDRESS = "auth.one_tap_auto_select";
const TTL_MS = 60_000;

type Rpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

let platform: { at: number; value: boolean } | null = null;
const orgs = new Map<string, { at: number; value: boolean | undefined }>();

function rpc(): Rpc {
  const platformSchema = createAdminClient().schema("platform") as unknown as { rpc: Rpc };
  return platformSchema.rpc.bind(platformSchema);
}

async function platformValue(): Promise<boolean> {
  if (platform && Date.now() - platform.at < TTL_MS) return platform.value;
  const { data, error } = await rpc()("knob_defaults", { p_known_version: null });
  if (error) throw new Error(error.message);
  const value = ((data ?? {}) as { defaults?: Record<string, unknown> }).defaults?.[ADDRESS];
  if (typeof value !== "boolean") throw new Error(`${ADDRESS} is not seeded in platform.feature_knob`);
  platform = { at: Date.now(), value };
  return value;
}

async function organizationValue(organizationId: string): Promise<boolean | undefined> {
  const cached = orgs.get(organizationId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const { data, error } = await rpc()("knob_snapshot_delta", {
    p_organization_id: organizationId,
    p_user_id: null,
    p_scopes: null,
    p_etag: null,
  });
  if (error) throw new Error(error.message);
  const raw = ((data ?? {}) as { overrides?: Record<string, unknown> }).overrides?.[ADDRESS];
  const value = typeof raw === "boolean" ? raw : undefined;
  orgs.set(organizationId, { at: Date.now(), value });
  return value;
}

export async function readOneTapAutoSelect(organizationId?: string | null): Promise<boolean> {
  try {
    const own = organizationId ? await organizationValue(organizationId) : undefined;
    return own ?? (await platformValue());
  } catch (error) {
    console.error(`[one-tap] LOUD: ${ADDRESS} could not be read; the prompt shows without automatic sign-in.`, error);
    return false;
  }
}
