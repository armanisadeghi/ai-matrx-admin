"use client";

/**
 * THE PER-PERSON VIEW ACTIONS — one hook for every place they appear (the
 * fix-it bar on a fallen-back value, the render-status strip on the shape
 * page): who is looking, their own layered view if any, and the clicks —
 * Make my view, For my organization, Edit / switch off my view (with its
 * consequence named and Undo). The decision itself is `planKindViewActions`
 * (fixit-plan.ts); the clicks are `fixit-handlers.ts` with real dependencies.
 */

import { useState, useSyncExternalStore } from "react";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsSuperAdminPerson,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useOrgAdminGate } from "@/features/organizations/admin/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useOpenAgentRunWindow } from "@/features/overlays/openers/agentRunWindow";
import { resolveMandate } from "@ai-matrx/chat/mandates/service";
import { KIND_CREATOR_MANDATE_KEY } from "../../studio/constants";
import {
  componentRegistry,
  resolveComponent,
  resolveSharedComponent,
  subscribeKindComponents,
} from "../../registry/component-registry";
import type { FixItLayerFacts, FixItViewer } from "./fixit-plan";
import {
  launchLayerBuilder,
  runLayerSwitchOff,
  type LayerLaunchDeps,
} from "./fixit-handlers";
import {
  readLayerAudience,
  readLayerFallthrough,
  switchOffLayer,
  switchOnLayer,
  type LayerSwitchOffReason,
  type LayerTarget,
} from "./layer-fixit";

/**
 * The viewer's own layered winner for this kind, if any (resolver `layer`).
 * `registryVersion` is unused in the body on purpose: it is the React Compiler's
 * memo key, so a hook caller re-reads when the resolver's tiers change (an
 * overlay load landing after first paint) instead of keeping the first answer.
 */
export function readLayerFacts(kind: string, registryVersion?: number): FixItLayerFacts | null {
  void registryVersion;
  const resolution = resolveComponent(kind, "web", "output");
  if (!resolution?.layer) return null;
  const shared = resolveSharedComponent(kind, "web", "output");
  return {
    scope: resolution.layer.scope,
    rowId: resolution.layer.rowId,
    createdBy: resolution.createdBy,
    updatedAt: resolution.updatedAt,
    sharedUpdatedAt: shared?.resolvedBy === "db" ? shared.updatedAt : null,
  };
}

/** The switch-off toast's life — long enough to find and press Undo. */
const UNDO_TOAST_MS = 60_000;

export function useKindViewActions(input: {
  kind: string;
  value: unknown;
  registered: boolean;
  /** `content_ir.kind_authoring` offer values for the builder. */
  offer: Record<string, string>;
}) {
  const userId = useAppSelector(selectUserId);
  const isSuperAdminPerson = useAppSelector(selectIsSuperAdminPerson);
  const activeOrgId = useAppSelector(selectOrganizationId);
  // Org admin of the ACTIVE organization — the organization a write carries.
  const orgGate = useOrgAdminGate(userId && activeOrgId ? activeOrgId : undefined);
  const openRun = useOpenAgentRunWindow();
  const [busy, setBusy] = useState(false);
  // The last view this person switched off, kept HERE: a switched-off row
  // leaves the overlay, so nothing else remembers its id — and a toast can be
  // gone before it is read. The marker keeps Undo reachable until it is used.
  const [switchedOff, setSwitchedOff] = useState<{
    message: string;
    undo: () => void;
  } | null>(null);
  // Repaint when the resolver's tiers change (an overlay load, a switch-off).
  const registryVersion = useSyncExternalStore(
    subscribeKindComponents,
    () => componentRegistry.getVersion(),
    () => 0,
  );

  const viewer: FixItViewer = {
    userId,
    isSuperAdminPerson,
    isOrgAdmin: orgGate.isAdmin && orgGate.orgId === activeOrgId,
  };
  const layer = userId ? readLayerFacts(input.kind, registryVersion) : null;

  const launchDeps: LayerLaunchDeps = {
    ensureOrgId,
    resolveAgentId: async () => (await resolveMandate(KIND_CREATOR_MANDATE_KEY)).agentId,
    readLayerAudience,
    openRun: (options) => {
      openRun(options);
    },
  };

  const guarded = (failure: string, work: () => Promise<unknown>) => {
    setBusy(true);
    void work()
      .catch((error: unknown) => {
        toast.error(failure, {
          description: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => setBusy(false));
  };

  const launch = (target: LayerTarget | "edit", layerRowId?: string) =>
    guarded("The Shape builder agent is unavailable", () =>
      launchLayerBuilder(launchDeps, {
        kind: input.kind,
        target,
        layerRowId: layerRowId ?? null,
        registered: input.registered,
        instance: input.value,
        offer: input.offer,
      }),
    );

  const switchOff = (rowId: string, reason: LayerSwitchOffReason) =>
    guarded("Switching the view off failed", () =>
      runLayerSwitchOff(
        {
          readLayerAudience,
          readFallthrough: readLayerFallthrough,
          confirm: (options) => confirm(options),
          switchOff: switchOffLayer,
          switchOn: (kind, id) =>
            switchOnLayer(kind, id).catch((error: unknown) => {
              toast.error("Undo failed", {
                description: error instanceof Error ? error.message : String(error),
              });
            }),
          announce: (message, undo) => {
            setSwitchedOff({ message, undo });
            toast.success(message, {
              duration: UNDO_TOAST_MS,
              action: {
                label: "Undo",
                onClick: () => {
                  setSwitchedOff(null);
                  undo();
                },
              },
            });
          },
        },
        { kind: input.kind, rowId, reason },
      ),
    );

  return {
    viewer,
    layer,
    busy,
    setBusy,
    openRun,
    onMakeMine: () => launch("mine"),
    onMakeOrg: () => launch("organization"),
    onEditLayer: (rowId: string) => launch("edit", rowId),
    onRemoveLayer: (rowId: string) => switchOff(rowId, "remove"),
    onUseShared: (rowId: string) => switchOff(rowId, "use_shared"),
    // Only while no view of mine is winning (undoing re-lands it; a new view clears it).
    switchedOff: layer ? null : switchedOff ? { message: switchedOff.message } : null,
    onUndoSwitchOff: () => {
      const last = switchedOff;
      setSwitchedOff(null);
      last?.undo();
    },
  };
}
