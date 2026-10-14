"use client";

/**
 * SHAPE LAYERS from the fix-it bar and the Fix badge: seeding the Shape builder
 * (mandate `content_ir.kind_creator`) to build or edit a PERSONAL or
 * ORGANIZATION view, and switching one off.
 *
 * The server's `kindcomp_*` tools take `target` ("mine" | "organization"),
 * `organization_id` (organization target), `kind` (the slug — no registration
 * needed) and, for an unregistered or unreadable kind, `kindcomp_get_context`
 * takes `sample` = the on-screen instance. THE USER-INPUT LAW: every one of
 * those facts rides a NAMED variable — the composer gets only a short kick
 * phrase the person can edit. `task_brief` carries the instruction (which names
 * the target), `user_data_sample` the instance, and the `layer_*` variables the
 * raw values for an agent that declares them.
 */

import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";
import { WriteDidNotLandError, tryWriteOne } from "@/utils/supabase/writeOne";
import {
  componentRegistry,
  refreshKindComponents,
} from "../../registry/component-registry";
import { invalidateKindRenderGap } from "./diagnose-kind-render-gap";

export type LayerTarget = "mine" | "organization";

/** Agent-facing notes for the owner's SHARED-view paths (never rendered). */
export const SHARED_SCHEMA_NOTE =
  "Give this Shape its real JSON schema, derived from the live instance the user was looking at (your data sample).";
export const SHARED_COMPONENT_NOTE =
  "Design against the live instance the user was looking at (your data sample).";
export const SHARED_REGISTER_BRIEF = (kind: string): string =>
  `Register the shape (kind) \`${kind}\` — it is already being emitted by a live agent but has no registration. ` +
  `Derive the schema from the real instance in your data sample, keep the slug EXACTLY \`${kind}\`, then build its output component.`;

/** Instance JSON for the agent, capped — its tools can fetch more. */
const INSTANCE_MAX = 6_000;

export function formatInstanceSample(value: unknown): string {
  try {
    const text =
      typeof value === "string" ? value.trim() : JSON.stringify(value, null, 2);
    if (!text) return "";
    return text.length > INSTANCE_MAX ? `${text.slice(0, INSTANCE_MAX)}\n… (truncated)` : text;
  } catch {
    return "";
  }
}

export interface LayerSeedInput {
  kind: string;
  target: LayerTarget;
  /** Required for `organization`; the active organization (ensureOrgId(null)). */
  organizationId: string;
  /** False when the name is unregistered or unreadable — the sample stands in. */
  registered: boolean;
  /** Set when EDITING an existing layered row (`component_id` on the tools). */
  layerRowId?: string | null;
  instance: unknown;
}

export interface LayerSeed {
  draftText: string;
  variables: Record<string, string>;
}

/** Pure: the builder seed for "Make my view" / "For my organization" / editing a layer. */
export function composeLayerSeed(input: LayerSeedInput): LayerSeed {
  const who =
    input.target === "mine"
      ? "for me alone (target \"mine\")"
      : `for my whole organization (target "organization", organization_id "${input.organizationId}")`;
  const toolArgs =
    input.target === "mine"
      ? `target "mine" and kind "${input.kind}"`
      : `target "organization", organization_id "${input.organizationId}" and kind "${input.kind}"`;
  const editing = Boolean(input.layerRowId);
  const lines = [
    editing
      ? `Edit my existing view of the Shape (kind) \`${input.kind}\` ${who}. Its component_id is "${input.layerRowId}".`
      : `Build a view of the Shape (kind) \`${input.kind}\` ${who}.`,
    `Call every kindcomp tool with ${toolArgs}${editing ? `, and component_id "${input.layerRowId}"` : ""}. Never change the shared view, the kind's registration or its schema.`,
    input.registered
      ? "Load the kind's context first, then design against the real instance in your data sample."
      : `This name has no readable registration — call kindcomp_get_context with ${toolArgs} and sample = the JSON object in your data sample.`,
  ];
  const variables: Record<string, string> = {
    task_brief: lines.join("\n\n"),
    user_data_sample: formatInstanceSample(input.instance),
    layer_target: input.target,
  };
  if (input.target === "organization") variables.layer_organization_id = input.organizationId;
  if (input.layerRowId) variables.layer_component_id = input.layerRowId;
  return {
    draftText: editing ? "What I want changed: " : "Let's do it.",
    variables,
  };
}

/** Who a layered row is for — read by id at click time (the resolver only carries scope + id). */
export async function readLayerAudience(
  rowId: string,
): Promise<{ target: LayerTarget; organizationId: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("content_ir")
    .from("kind_component_layer")
    .select("id, audience_user_id, audience_organization_id")
    .eq("id", rowId)
    .maybeSingle<{
      id: string;
      audience_user_id: string | null;
      audience_organization_id: string | null;
    }>();
  if (error) throw operationFailed("read this view", error);
  if (!data) throw new Error("This view is no longer available.");
  return data.audience_organization_id
    ? { target: "organization", organizationId: data.audience_organization_id }
    : { target: "mine", organizationId: null };
}

/**
 * Switch a layered row off — the shared view (or the next layer down) takes
 * over at once. Reversible (`is_active`), never a delete; the database decides
 * whether this viewer may write the row.
 */
export async function switchOffLayer(kind: string, rowId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await tryWriteOne(
    supabase
      .schema("content_ir")
      .from("kind_component_layer")
      .update({ is_active: false })
      .eq("id", rowId)
      .select("id"),
    { action: "update", noun: "view" },
  );
  if (error) {
    throw error instanceof WriteDidNotLandError ? error : operationFailed("switch off this view", error);
  }
  invalidateKindRenderGap(kind);
  // The overlay reloads on the kindComponents invalidation path; this forces
  // the shared tier fresh too so the next winner paints without a reload.
  await Promise.all([refreshKindComponents(0), componentRegistry.syncOverlay(true)]);
}
