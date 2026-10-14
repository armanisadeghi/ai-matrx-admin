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
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

import { toast } from "@/lib/toast";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
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
  type FixItOwnerAction,
  type FixItPlan,
  type FixItViewPlan,
} from "./fixit-plan";
import {
  SHARED_COMPONENT_NOTE,
  SHARED_REGISTER_BRIEF,
  SHARED_SCHEMA_NOTE,
  formatInstanceSample,
} from "./layer-fixit";
import { useKindViewActions } from "./useKindViewActions";
import { crossDeploymentHref } from "@/lib/deployment/surfaces";
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

const KindFixItBarInner: React.FC<KindFixItBarProps> = ({ kind, value }) => {
  const [diagnosis, setDiagnosis] = useState<KindRenderGapDiagnosis | null>(null);
  const [hidden, setHidden] = useState(false);
  const actions = useKindViewActions({
    kind,
    value,
    registered: diagnosis ? diagnosis.kindDefinitionId !== null : true,
    offer: buildKindAuthoringOffer({
      kindSlug: kind,
      kindLabel: diagnosis?.kindLabel ?? null,
      authoringPart: "component",
      renderGapState: diagnosis?.state ?? null,
      kindIsActive: diagnosis?.kindDefinitionId ? diagnosis.kindActive : null,
    }),
  });
  const { busy, setBusy, openRun } = actions;

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
  if (!diagnosis && !actions.layer) return null;

  const plan = planKindFixIt(diagnosis, actions.viewer, actions.layer, {
    slug: kind,
    registered: diagnosis ? diagnosis.kindDefinitionId !== null : true,
  });

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
      onMakeMine={actions.onMakeMine}
      onMakeOrg={actions.onMakeOrg}
      onOwnerAction={runOwnerAction}
      onEditLayer={actions.onEditLayer}
      onRemoveLayer={actions.onRemoveLayer}
      onUseShared={actions.onUseShared}
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

export interface FixItViewHandlers {
  busy: boolean;
  onMakeMine: () => void;
  onMakeOrg: () => void;
  onEditLayer: (rowId: string) => void;
  onRemoveLayer: (rowId: string) => void;
  onUseShared: (rowId: string) => void;
  /** A view this person just switched off — the marker keeps Undo reachable. */
  switchedOff?: { message: string; turnOn?: boolean } | null;
  onUndoSwitchOff?: () => void;
}

/**
 * THE PER-PERSON VIEW ACTIONS as one piece — the "My view" marker, or Make my
 * view / For my organization / Change for everyone. Rendered by the fix-it bar
 * AND the shape page's render-status strip, from the same plan.
 */
export function FixItViewActions(
  props: FixItViewHandlers & { plan: FixItViewPlan },
): React.ReactElement | null {
  const { switchedOff = null, onUndoSwitchOff, busy } = props;
  const body = <ViewActionsPlan {...props} />;
  if (!switchedOff || !onUndoSwitchOff) return body;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div data-fixit-mode="switched-off" className="flex flex-wrap items-center gap-2">
        <span className="type-meta text-muted-foreground">{switchedOff.message}</span>
        <Button variant="quiet" disabled={busy} onClick={onUndoSwitchOff}>
          {switchedOff.turnOn ? "Turn on" : "Undo"}
        </Button>
      </div>
      {body}
    </div>
  );
}

function ViewActionsPlan({
  plan,
  busy,
  onMakeMine,
  onMakeOrg,
  onEditLayer,
  onRemoveLayer,
  onUseShared,
}: FixItViewHandlers & { plan: FixItViewPlan }): React.ReactElement | null {
  if (plan.mode === "none") return null;
  if (plan.mode === "layer") {
    return (
      <div data-fixit-mode="layer" className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="type-meta text-muted-foreground">
          {plan.scope === "user" ? "My view" : "My organization's view"}
        </span>
        {plan.newerShared ? (
          <span className="type-meta text-muted-foreground">· Newer shared view</span>
        ) : null}
        {plan.newerShared && plan.canRemove ? (
          <Button variant="quiet" disabled={busy} onClick={() => onUseShared(plan.rowId)}>
            Use it
          </Button>
        ) : null}
        {plan.canEdit ? (
          <Button variant="quiet" icon={<AGENT_ICON />} disabled={busy} onClick={() => onEditLayer(plan.rowId)}>
            Edit
          </Button>
        ) : null}
        {plan.canRemove && !plan.newerShared ? (
          <Button variant="quiet" removes disabled={busy} onClick={() => onRemoveLayer(plan.rowId)}>
            Remove
          </Button>
        ) : null}
        <PersonActions
          plan={plan}
          busy={busy}
          onMakeMine={onMakeMine}
          onMakeOrg={onMakeOrg}
          variant="quiet"
        />
      </div>
    );
  }
  if (!plan.makeMine && !plan.makeOrg && !plan.everyoneHref) return null;
  return (
    <div data-fixit-mode="actions" className="flex flex-wrap items-center gap-2">
      <PersonActions plan={plan} busy={busy} onMakeMine={onMakeMine} onMakeOrg={onMakeOrg} />
    </div>
  );
}

/** Make my view / For my organization / Change for everyone — one copy for every plan shape. */
function PersonActions({
  plan,
  busy,
  onMakeMine,
  onMakeOrg,
  variant,
}: {
  plan: { makeMine: boolean; makeOrg: boolean; everyoneHref: string | null };
  busy: boolean | undefined;
  onMakeMine: () => void;
  onMakeOrg: () => void;
  /** Beside a marker everything is quiet; standing alone the first action leads. */
  variant?: "quiet";
}): React.ReactElement | null {
  const everyone = plan.everyoneHref
    ? (crossDeploymentHref(plan.everyoneHref) ?? plan.everyoneHref)
    : null;
  return (
    <>
      {plan.makeMine ? (
        <Button
          variant={variant ?? "primary"}
          icon={<AGENT_ICON />}
          disabled={busy}
          onClick={onMakeMine}
        >
          Make my view
        </Button>
      ) : null}
      {plan.makeOrg ? (
        <Button variant={variant ?? "outline"} disabled={busy} onClick={onMakeOrg}>
          For my organization
        </Button>
      ) : null}
      {everyone ? (
        <Button variant="quiet" iconEnd={<ExternalLink />} asChild>
          <OutboundLink href={everyone} target="_blank" rel="noopener noreferrer" data-fixit-everyone="">
            Change for everyone
          </OutboundLink>
        </Button>
      ) : null}
    </>
  );
}

export interface KindFixItBarViewProps extends FixItViewHandlers {
  plan: FixItPlan;
  onOwnerAction: (action: FixItOwnerAction) => void;
}

/** Pure presentation of a {@link FixItPlan} — what the tests render. */
export function KindFixItBarView({
  plan,
  onOwnerAction,
  ...handlers
}: KindFixItBarViewProps): React.ReactElement | null {
  if (plan.mode === "none") return null;

  if (plan.mode === "layer") {
    return (
      <div className="mb-2 rounded-md border border-border bg-card px-2.5 py-1">
        <FixItViewActions plan={plan} {...handlers} />
      </div>
    );
  }

  return (
    <div
      data-fixit-mode="gaps"
      className="mb-2 rounded-md border border-amber-500/35 bg-amber-500/[0.07] px-2.5 py-1.5"
    >
      <ul className="space-y-1">
        {plan.rows.map((row) => (
          <li key={row.gap} data-fixit-gap={row.gap} className="flex items-center gap-2">
            <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="min-w-0 truncate text-xs text-amber-800 dark:text-amber-300">
              {row.label}
            </span>
            {row.ownerAction ? (
              <Button
                variant="quiet"
                icon={OWNER_ACTION_ICON[row.ownerAction]}
                disabled={handlers.busy}
                onClick={() => onOwnerAction(row.ownerAction as FixItOwnerAction)}
              >
                {OWNER_ACTION_LABEL[row.ownerAction]}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-1.5 empty:hidden">
        <FixItViewActions
          plan={{
            mode: "actions",
            makeMine: plan.makeMine,
            makeOrg: plan.makeOrg,
            everyoneHref: plan.everyoneHref,
          }}
          {...handlers}
        />
      </div>
    </div>
  );
}
