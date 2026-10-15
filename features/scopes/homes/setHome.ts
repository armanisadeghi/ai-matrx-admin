// features/scopes/homes/setHome.ts
//
// THE ONE MOVE DOOR, for any record with a home: `platform.set_home`. The home
// changes and the organization follows, in one write. Same organization needs
// editor; another organization needs the owner (or full access) and membership
// of both — the database decides and its sentence is what the caller shows.
//
// `expectedVersion` is the record's `version` as the caller last read it: a
// mismatch is refused (40001, "This was changed somewhere else…"). Null skips
// the check — only for callers that hold no version.

import { supabase } from "@/utils/supabase/client";
import {
  homeReceiptFrom,
  homeRefusalMessage,
  placeholderGeneralOrganization,
  type HomeReceipt,
} from "./homeModel";

/**
 * A real home scope id for `scopeId`: an organization's General that does not
 * exist yet (a placeholder) is created once, as the system, by
 * `platform.ensure_general_scope` — only when a person actually chooses it.
 */
export async function resolveHomeScopeId(
  scopeId: string,
): Promise<{ ok: true; scopeId: string } | { ok: false; message: string }> {
  const organizationId = placeholderGeneralOrganization(scopeId);
  if (!organizationId) return { ok: true, scopeId };
  const { data, error } = await supabase
    .schema("platform")
    .rpc("ensure_general_scope", { p_org: organizationId });
  if (error) return { ok: false, message: homeRefusalMessage(error) };
  if (typeof data !== "string") return { ok: false, message: "That organization's General could not be opened." };
  return { ok: true, scopeId: data };
}

export type SetHomeResult = { ok: true; receipt: HomeReceipt } | { ok: false; message: string; code?: string };

/** Move one record to a (real, resolved) home scope. Never throws: a refusal is the database's sentence. */
export async function setHome(args: {
  entityType: string;
  entityId: string;
  scopeId: string;
  expectedVersion: number | null;
}): Promise<SetHomeResult> {
  const { data, error } = await supabase.schema("platform").rpc("set_home", {
    p_entity_type: args.entityType,
    p_entity_id: args.entityId,
    p_scope_id: args.scopeId,
    ...(args.expectedVersion === null ? {} : { p_expected_version: args.expectedVersion }),
  });
  if (error) return { ok: false, message: homeRefusalMessage(error), ...(error.code ? { code: error.code } : {}) };
  try {
    return { ok: true, receipt: homeReceiptFrom(data) };
  } catch (malformed) {
    return { ok: false, message: (malformed as Error).message };
  }
}
