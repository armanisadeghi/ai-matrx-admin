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
  resolveSharedComponent,
} from "../../registry/component-registry";
import { GENERIC_STRUCTURED_COMPONENT_KEY } from "../../registry/schema-source-kind-components";
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

/** Who a layered row is for — the organization named, for the consequence line. */
export interface LayerAudience {
  target: LayerTarget;
  organizationId: string | null;
  organizationName: string | null;
}

/** Read by id at click time (the resolver only carries scope + id). */
export async function readLayerAudience(rowId: string): Promise<LayerAudience> {
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
  if (!data.audience_organization_id) {
    return { target: "mine", organizationId: null, organizationName: null };
  }
  const { getOrganizationBySlugOrId } = await import("@/features/organizations/service");
  const organization = await getOrganizationBySlugOrId(data.audience_organization_id).catch(
    () => null,
  );
  return {
    target: "organization",
    organizationId: data.audience_organization_id,
    organizationName: organization?.name ?? null,
  };
}

export type LayerSwitchOffReason = "remove" | "use_shared";

/** What the audience falls through to when the view is switched off. */
export type LayerFallthrough = "organization" | "shared" | "builtin" | "generic";

const FALLTHROUGH_WORDS: Record<LayerFallthrough, string> = {
  organization: "your organization's view",
  shared: "the shared view",
  builtin: "the built-in view",
  generic: "the generic viewer",
};

/**
 * Pure: where a switched-off view falls to. `orgViewBeneath` is only ever true
 * for a personal view (an active organization view sits below it); `shared` is
 * the SHARED tier's answer — a database row, a compiled component, or nothing
 * (generic viewer).
 */
export function decideLayerFallthrough(input: {
  audience: LayerAudience;
  orgViewBeneath: boolean;
  shared: { resolvedBy: "compiled" | "db"; componentKey: string } | null;
}): LayerFallthrough {
  if (input.audience.target === "mine" && input.orgViewBeneath) return "organization";
  const shared = input.shared;
  if (!shared || shared.componentKey === GENERIC_STRUCTURED_COMPONENT_KEY) return "generic";
  return shared.resolvedBy === "db" ? "shared" : "builtin";
}

/**
 * Measured at click time: is an active organization view beneath this one
 * (RLS shows only the organizations I belong to), and what is the shared answer.
 */
export async function readLayerFallthrough(
  kind: string,
  rowId: string,
  audience: LayerAudience,
): Promise<LayerFallthrough> {
  let orgViewBeneath = false;
  if (audience.target === "mine") {
    const supabase = createClient();
    const { data, error } = await supabase
      .schema("content_ir")
      .from("kind_component_layer")
      .select("id")
      .eq("kind", kind)
      .eq("platform", "web")
      .eq("role", "output")
      .eq("is_active", true)
      .is("deleted_at", null)
      .not("audience_organization_id", "is", null)
      .neq("id", rowId)
      .limit(1);
    if (error) throw operationFailed("check what you would see instead", error);
    orgViewBeneath = (data?.length ?? 0) > 0;
  }
  const shared = resolveSharedComponent(kind, "web", "output");
  return decideLayerFallthrough({
    audience,
    orgViewBeneath,
    shared: shared ? { resolvedBy: shared.resolvedBy, componentKey: shared.componentKey } : null,
  });
}

/**
 * THE CONSEQUENCE, said first (destructive-click law): exactly what switching
 * this view off does, to whom — me alone, or everyone in the organization —
 * and what they will see instead (the MEASURED fall-through, never assumed).
 */
export function describeLayerSwitchOff(input: {
  audience: LayerAudience;
  reason: LayerSwitchOffReason;
  fallthrough: LayerFallthrough;
}): { title: string; description: string; confirmLabel: string; done: string } {
  const org = input.audience.organizationName ?? "your organization";
  const mine = input.audience.target === "mine";
  const whose = mine ? "your view" : `${org}'s view`;
  const instead = FALLTHROUGH_WORDS[input.fallthrough];
  const consequence = mine
    ? `Only you are affected, and you will see ${instead}.`
    : `Everyone in ${org} will see ${instead}.`;
  return {
    title: input.reason === "use_shared" ? "Use the newer shared view?" : `Switch off ${whose}?`,
    description:
      input.reason === "use_shared"
        ? `This switches off ${whose}. ${consequence} You can undo.`
        : `${consequence} You can undo.`,
    confirmLabel: input.reason === "use_shared" ? "Use shared view" : "Switch off",
    done: mine ? "Your view is off" : `${org}'s view is off`,
  };
}

/** Switch a layered row back on — the undo of {@link switchOffLayer}. */
export async function switchOnLayer(kind: string, rowId: string): Promise<void> {
  await setLayerActive(kind, rowId, true);
}

/**
 * Switch a layered row off — the shared view (or the next layer down) takes
 * over at once. Reversible (`is_active`), never a delete; the database decides
 * whether this viewer may write the row.
 */
export async function switchOffLayer(kind: string, rowId: string): Promise<void> {
  await setLayerActive(kind, rowId, false);
}

async function setLayerActive(kind: string, rowId: string, isActive: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await tryWriteOne(
    supabase
      .schema("content_ir")
      .from("kind_component_layer")
      .update({ is_active: isActive })
      .eq("id", rowId)
      .select("id"),
    { action: "update", noun: "view" },
  );
  if (error) {
    throw error instanceof WriteDidNotLandError
      ? error
      : operationFailed(isActive ? "switch this view back on" : "switch off this view", error);
  }
  invalidateKindRenderGap(kind);
  // The overlay reloads on a forced sync; the shared tier refreshes too so the
  // next winner paints without a reload.
  await Promise.all([refreshKindComponents(0), componentRegistry.syncOverlay(true)]);
}
