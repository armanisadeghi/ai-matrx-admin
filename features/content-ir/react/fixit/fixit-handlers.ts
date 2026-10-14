/**
 * The fix-it ladder's CLICKS, with every side effect injected — so the order
 * that matters is testable: the active organization is answered BEFORE the
 * builder opens (a request without one is refused for target "mine"), and a
 * layer is switched off only after its consequence was confirmed, with undo.
 *
 * `useKindFixIt` wires the real dependencies; the tests wire fakes.
 */

import type { OpenAgentRunWindowOptions } from "@/features/overlays/openers/agentRunWindow";
import {
  composeLayerSeed,
  describeLayerSwitchOff,
  type LayerAudience,
  type LayerSwitchOffReason,
  type LayerTarget,
} from "./layer-fixit";

export interface LayerLaunchDeps {
  ensureOrgId: (orgId: null) => Promise<string>;
  resolveAgentId: () => Promise<string>;
  readLayerAudience: (rowId: string) => Promise<LayerAudience>;
  openRun: (options: OpenAgentRunWindowOptions) => void;
}

export interface LayerLaunchInput {
  kind: string;
  /** "edit" = the viewer's existing layered row (`layerRowId`). */
  target: LayerTarget | "edit";
  layerRowId?: string | null;
  registered: boolean;
  instance: unknown;
  /** `content_ir.kind_authoring` offer values (named variables). */
  offer: Record<string, string>;
}

export async function launchLayerBuilder(
  deps: LayerLaunchDeps,
  input: LayerLaunchInput,
): Promise<void> {
  // Every request carries the active organization, or "mine" is refused.
  const activeOrg = await deps.ensureOrgId(null);
  let target: LayerTarget = input.target === "edit" ? "mine" : input.target;
  let organizationId = activeOrg;
  if (input.target === "edit") {
    if (!input.layerRowId) throw new Error("No view to edit.");
    const audience = await deps.readLayerAudience(input.layerRowId);
    target = audience.target;
    organizationId = audience.organizationId ?? activeOrg;
  }
  const agentId = await deps.resolveAgentId();
  const seed = composeLayerSeed({
    kind: input.kind,
    target,
    organizationId,
    registered: input.registered,
    layerRowId: input.target === "edit" ? input.layerRowId : null,
    instance: input.instance,
  });
  deps.openRun({
    initialAgentId: agentId,
    initialDraftText: seed.draftText,
    initialVariableValues: { ...input.offer, ...seed.variables },
  });
}

export interface LayerSwitchOffDeps {
  readLayerAudience: (rowId: string) => Promise<LayerAudience>;
  confirm: (options: {
    title: string;
    description: string;
    confirmLabel: string;
    variant: "destructive";
  }) => Promise<boolean>;
  switchOff: (kind: string, rowId: string) => Promise<void>;
  switchOn: (kind: string, rowId: string) => Promise<void>;
  announce: (message: string, undo: () => void) => void;
}

/**
 * "Remove" / "Use it": name the consequence, ask, switch off (never delete),
 * then offer Undo (switch it back on).
 */
export async function runLayerSwitchOff(
  deps: LayerSwitchOffDeps,
  input: { kind: string; rowId: string; reason: LayerSwitchOffReason },
): Promise<"cancelled" | "off"> {
  const audience = await deps.readLayerAudience(input.rowId);
  const words = describeLayerSwitchOff({ audience, reason: input.reason });
  const yes = await deps.confirm({
    title: words.title,
    description: words.description,
    confirmLabel: words.confirmLabel,
    variant: "destructive",
  });
  if (!yes) return "cancelled";
  await deps.switchOff(input.kind, input.rowId);
  deps.announce(words.done, () => {
    void deps.switchOn(input.kind, input.rowId);
  });
  return "off";
}
