"use client";

/**
 * THE FIX-IT BAR (ratified 2026-08-27; the ladder, shape-layers slice 4,
 * 2026-10-14).
 *
 * When a settled kind value fell back to the generic viewer, this bar sits at
 * the top of the fallback and:
 *   1. lists EVERY gap (not registered, no schema, no shared view, shared view
 *      off or empty, not activated) — one short row each;
 *   2. gives the owner the per-gap one-click repair on that row;
 *   3. gives ANYONE signed in "Make my view" (a personal view built by the
 *      Shape builder against the value on screen), an org admin "For my
 *      organization", and a super admin "Change for everyone" — a LINK to the
 *      admin shape page in a new tab, never admin power on this page.
 * When the viewer already has their own layered view, it never claims the
 * generic viewer: it shows a small "My view" marker with Edit / Remove, and
 * "Newer shared view · Use it" when the shared row is newer.
 *
 * THE LAZY LAW: none of this runs on a successful render. The diagnosis fires
 * only after the fallback is already on screen, once per kind per session
 * (see diagnose-kind-render-gap), and never while the value is still
 * streaming (a half-arrived payload must not be offered as an example).
 */

import React, { useContext, useEffect, useState } from "react";
import { CircleAlert, ExternalLink, Power, Wrench } from "lucide-react";
import { ReactReduxContext } from "react-redux";
import { Button } from "@ai-matrx/design-system/controls";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsSuperAdmin,
  selectIsSuperAdminPerson,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useOrgAdminGate } from "@/features/organizations/admin/hooks";
import { crossDeploymentHref } from "@/lib/deployment/surfaces";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { toast } from "@/lib/toast";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { useOpenAgentRunWindow } from "@/features/overlays/openers/agentRunWindow";
import { resolveMandate } from "@ai-matrx/chat/mandates/service";
import { KIND_CREATOR_MANDATE_KEY } from "../../studio/constants";
import type { Json } from "@/types/database.types";
import {
  diagnoseKindRenderGap,
  type KindRenderGapDiagnosis,
} from "./diagnose-kind-render-gap";
import {
  activateKindUsingInstance,
  reactivateComponent,
} from "./fixit-actions";
import {
  OWNER_ACTION_LABEL,
  planKindFixIt,
  type FixItLayerFacts,
  type FixItOwnerAction,
  type FixItPlan,
} from "./fixit-plan";
import {
  SHARED_COMPONENT_NOTE,
  SHARED_REGISTER_BRIEF,
  SHARED_SCHEMA_NOTE,
  composeLayerSeed,
  formatInstanceSample,
  readLayerAudience,
  switchOffLayer,
  type LayerTarget,
} from "./layer-fixit";
import {
  resolveComponent,
  resolveSharedComponent,
} from "../../registry/component-registry";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { buildKindAuthoringOffer } from "@/features/content-ir/studio/kind-authoring-offer";

export interface KindFixItBarProps {
  kind: string;
  /** The settled instance value (drives example seeding + the agent seed). */
  value: unknown;
}

/**
 * Outer shell: the bar needs the app's Redux store (viewer identity, agent
 * window). A host without one — a unit test, a bare preview — gets nothing
 * rather than a throw; the truth strip on the shape pages covers those.
 */
export const KindFixItBar: React.FC<KindFixItBarProps> = (props) => {
  const store = useContext(ReactReduxContext);
  if (!store) return null;
  return <KindFixItBarInner {...props} />;
};

/** The viewer's own layered winner for this kind, if any (resolver `layer`). */
function readLayerFacts(kind: string): FixItLayerFacts | null {
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

const KindFixItBarInner: React.FC<KindFixItBarProps> = ({ kind, value }) => {
  const userId = useAppSelector(selectUserId);
  const isSuperAdminInLane = useAppSelector(selectIsSuperAdmin);
  const isSuperAdminPerson = useAppSelector(selectIsSuperAdminPerson);
  const activeOrgId = useAppSelector(selectOrganizationId);
  // Org admin of the ACTIVE organization — the organization a write carries.
  const orgGate = useOrgAdminGate(userId && activeOrgId ? activeOrgId : undefined);
  const openRun = useOpenAgentRunWindow();
  const [diagnosis, setDiagnosis] = useState<KindRenderGapDiagnosis | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    void diagnoseKindRenderGap(kind).then((result) => {
      // A visitor never reads why a shape fell back (they cannot fix it); we do, in the error inspector.
      if (result?.state === "unreadable") {
        captureError({
          source: "react-render",
          code: "kind_unreadable_to_viewer",
          message: `"${kind}" rendered through the generic viewer for a signed-out visitor: its definition is not readable to them.`,
          callSite: "KindFixItBar",
          raw: { kind },
        });
      }
      if (alive) setDiagnosis(result);
    });
    return () => {
      alive = false;
    };
  }, [kind]);

  if (hidden) return null;
  const layer = userId ? readLayerFacts(kind) : null;
  if (!diagnosis && !layer) return null;

  const plan = planKindFixIt(
    diagnosis,
    {
      userId,
      isSuperAdminInLane,
      isSuperAdminPerson,
      isOrgAdmin: orgGate.isAdmin && orgGate.orgId === activeOrgId,
    },
    layer,
  );

  const runAction = (label: string, action: () => Promise<void>) => {
    setBusy(true);
    void action()
      .then(() => {
        toast.success(label);
        setHidden(true);
      })
      .catch((error: unknown) => {
        toast.error(`${label} failed`, {
          description: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => setBusy(false));
  };

  const fail = (error: unknown) => {
    toast.error("The Shape builder agent is unavailable", {
      description: error instanceof Error ? error.message : String(error),
    });
  };

  /** The SHARED-view builder paths the owner had before the ladder. */
  const launchSharedBuilder = (brief: "component" | "register" | "schema") => {
    if (!diagnosis) return;
    setBusy(true);
    void resolveMandate(KIND_CREATOR_MANDATE_KEY)
      .then(async (resolved) => {
        const sample = formatInstanceSample(value);
        const seed =
          brief === "register"
            ? {
                draftText: "Let's do it.",
                variables: {
                  task_brief: SHARED_REGISTER_BRIEF(diagnosis.kind),
                  kind_schema: "",
                  user_data_sample: sample,
                },
              }
            : // Click-time import: the full seed (live registration, component,
              // saved examples) stays out of every render path's chunk.
              await (
                await import("@/features/content-ir/studio/kind-edit-seed")
              ).loadKindEditSeed({
                kind: diagnosis.kind,
                label: diagnosis.kindLabel ?? diagnosis.kind,
                part: brief === "schema" ? "edit" : "component",
                emittedJsonSchema: diagnosis.emittedJsonSchema as Json | null,
                note: brief === "schema" ? SHARED_SCHEMA_NOTE : SHARED_COMPONENT_NOTE,
              });
        openRun({
          initialAgentId: resolved.agentId,
          initialDraftText: seed.draftText,
          initialVariableValues: {
            // `content_ir.kind_authoring` mapped-only offers (agent door).
            ...buildKindAuthoringOffer({
              kindSlug: diagnosis.kind,
              kindLabel: diagnosis.kindLabel,
              authoringPart: brief === "component" ? "component" : brief === "schema" ? "edit" : null,
              renderGapState: diagnosis.state,
              kindIsActive: diagnosis.kindDefinitionId ? diagnosis.kindActive : null,
            }),
            ...seed.variables,
            // The live instance always reaches the agent by name (loadKindEditSeed
            // fills user_data_sample with saved examples when there are any).
            ...(seed.variables.user_data_sample ? {} : { user_data_sample: sample }),
          },
        });
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };

  /** "Make my view" / "For my organization" / Edit my view — the LAYER builder. */
  const launchLayerBuilder = (target: LayerTarget | "edit", layerRowId?: string) => {
    setBusy(true);
    void (async () => {
      // Every request carries the active organization, or "mine" is refused.
      const activeOrg = await ensureOrgId(null);
      let resolvedTarget: LayerTarget = target === "edit" ? "mine" : target;
      let organizationId = activeOrg;
      if (target === "edit" && layerRowId) {
        const audience = await readLayerAudience(layerRowId);
        resolvedTarget = audience.target;
        organizationId = audience.organizationId ?? activeOrg;
      }
      const resolved = await resolveMandate(KIND_CREATOR_MANDATE_KEY);
      const seed = composeLayerSeed({
        kind,
        target: resolvedTarget,
        organizationId,
        registered: diagnosis ? diagnosis.kindDefinitionId !== null : true,
        layerRowId: layerRowId ?? null,
        instance: value,
      });
      openRun({
        initialAgentId: resolved.agentId,
        initialDraftText: seed.draftText,
        initialVariableValues: {
          ...buildKindAuthoringOffer({
            kindSlug: kind,
            kindLabel: diagnosis?.kindLabel ?? null,
            authoringPart: "component",
            renderGapState: diagnosis?.state ?? null,
            kindIsActive: diagnosis?.kindDefinitionId ? diagnosis.kindActive : null,
          }),
          ...seed.variables,
        },
      });
    })()
      .catch(fail)
      .finally(() => setBusy(false));
  };

  const runOwnerAction = (action: FixItOwnerAction) => {
    if (!diagnosis) return;
    switch (action) {
      case "register":
        return launchSharedBuilder("register");
      case "add_schema":
        return launchSharedBuilder("schema");
      case "build_shared":
      case "fix_code":
        return launchSharedBuilder("component");
      case "turn_on":
        return runAction("Shared view turned on", () => reactivateComponent(diagnosis));
      case "activate":
        return runAction("Shape activated", () => activateKindUsingInstance(diagnosis, value));
    }
  };

  return (
    <KindFixItBarView
      plan={plan}
      busy={busy}
      onMakeMine={() => launchLayerBuilder("mine")}
      onMakeOrg={() => launchLayerBuilder("organization")}
      onOwnerAction={runOwnerAction}
      onEditLayer={(rowId) => launchLayerBuilder("edit", rowId)}
      onRemoveLayer={(rowId) =>
        runAction("Your view is off", () => switchOffLayer(kind, rowId))
      }
    />
  );
};

const OWNER_ACTION_ICON: Record<FixItOwnerAction, React.ReactNode> = {
  register: <AGENT_ICON />,
  add_schema: <AGENT_ICON />,
  build_shared: <AGENT_ICON />,
  turn_on: <Power />,
  fix_code: <Wrench />,
  activate: <Power />,
};

export interface KindFixItBarViewProps {
  plan: FixItPlan;
  busy: boolean;
  onMakeMine: () => void;
  onMakeOrg: () => void;
  onOwnerAction: (action: FixItOwnerAction) => void;
  onEditLayer: (rowId: string) => void;
  onRemoveLayer: (rowId: string) => void;
}

/** Pure presentation of a {@link FixItPlan} — what the tests render. */
export function KindFixItBarView({
  plan,
  busy,
  onMakeMine,
  onMakeOrg,
  onOwnerAction,
  onEditLayer,
  onRemoveLayer,
}: KindFixItBarViewProps): React.ReactElement | null {
  if (plan.mode === "none") return null;

  if (plan.mode === "layer") {
    return (
      <div
        data-fixit-mode="layer"
        className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1"
      >
        <span className="type-meta text-muted-foreground">
          {plan.scope === "user" ? "My view" : "My organization's view"}
        </span>
        {plan.newerShared ? (
          <span className="type-meta text-muted-foreground">· Newer shared view</span>
        ) : null}
        <span className="flex-1" />
        {plan.newerShared && plan.canRemove ? (
          <Button variant="quiet" disabled={busy} onClick={() => onRemoveLayer(plan.rowId)}>
            Use it
          </Button>
        ) : null}
        {plan.canEdit ? (
          <Button
            variant="quiet"
            icon={<AGENT_ICON />}
            disabled={busy}
            onClick={() => onEditLayer(plan.rowId)}
          >
            Edit
          </Button>
        ) : null}
        {plan.canRemove && !plan.newerShared ? (
          <Button variant="quiet" removes disabled={busy} onClick={() => onRemoveLayer(plan.rowId)}>
            Remove
          </Button>
        ) : null}
      </div>
    );
  }

  const everyone = plan.everyoneHref
    ? (crossDeploymentHref(plan.everyoneHref) ?? plan.everyoneHref)
    : null;
  const hasViewActions = plan.makeMine || plan.makeOrg || everyone !== null;

  return (
    <div
      data-fixit-mode="gaps"
      className="mb-2 rounded-md border border-amber-500/35 bg-amber-500/[0.07] px-2.5 py-1.5"
    >
      <ul className="space-y-1">
        {plan.rows.map((row) => (
          <li key={row.gap} data-fixit-gap={row.gap} className="flex items-center gap-2">
            <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="min-w-0 flex-1 truncate text-xs text-amber-800 dark:text-amber-300">
              {row.label}
            </span>
            {row.ownerAction ? (
              <Button
                variant="quiet"
                icon={OWNER_ACTION_ICON[row.ownerAction]}
                disabled={busy}
                onClick={() => onOwnerAction(row.ownerAction as FixItOwnerAction)}
              >
                {OWNER_ACTION_LABEL[row.ownerAction]}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {hasViewActions ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {plan.makeMine ? (
            <Button variant="primary" icon={<AGENT_ICON />} disabled={busy} onClick={onMakeMine}>
              Make my view
            </Button>
          ) : null}
          {plan.makeOrg ? (
            <Button variant="outline" disabled={busy} onClick={onMakeOrg}>
              For my organization
            </Button>
          ) : null}
          {everyone ? (
            <Button variant="quiet" iconEnd={<ExternalLink />} asChild>
              <a href={everyone} target="_blank" rel="noopener noreferrer" data-fixit-everyone="">
                Change for everyone
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
