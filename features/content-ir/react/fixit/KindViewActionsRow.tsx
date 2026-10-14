"use client";

/**
 * The per-person view actions for a place that already explains the render
 * itself (the shape page's render-status strip): only the "My view" marker, or
 * Make my view / For my organization / Change for everyone — the same plan
 * (`planKindViewActions`) and the same clicks (`useKindViewActions`) as the
 * fix-it bar, never a second copy.
 */

import React, { useContext } from "react";
import { ReactReduxContext } from "react-redux";

import { buildKindAuthoringOffer } from "@/features/content-ir/studio/kind-authoring-offer";
import { planKindViewActions } from "./fixit-plan";
import { FixItViewActions, type FixItExtraAction } from "./KindFixItBar";
import { useKindViewActions } from "./useKindViewActions";

export interface KindViewActionsRowProps {
  kind: string;
  label: string | null;
  registered: boolean;
  /** The value the builder designs against (the canonical example on the shape page). */
  value: unknown;
  /** False when the shared view is already a custom component — then only a layer marker shows. */
  offerNewView: boolean;
  /** Further actions folded into the row's "…" menu (the owner's shared-view builder). */
  extraActions?: FixItExtraAction[];
}

export function KindViewActionsRow(props: KindViewActionsRowProps): React.ReactElement | null {
  const store = useContext(ReactReduxContext);
  if (!store) return null;
  return <KindViewActionsRowInner {...props} />;
}

function KindViewActionsRowInner({
  kind,
  label,
  registered,
  value,
  offerNewView,
  extraActions,
}: KindViewActionsRowProps): React.ReactElement | null {
  const actions = useKindViewActions({
    kind,
    value,
    registered,
    offer: buildKindAuthoringOffer({ kindSlug: kind, kindLabel: label, authoringPart: "component" }),
  });
  const plan = planKindViewActions(actions.viewer, actions.layer, { slug: kind, registered });
  // A view just switched off keeps its Undo marker even when nothing else shows.
  if (plan.mode === "actions" && !offerNewView && !actions.switchedOff && !extraActions?.length) return null;
  return <FixItViewActions plan={plan} instance={value} compact extraActions={extraActions} {...actions} />;
}
