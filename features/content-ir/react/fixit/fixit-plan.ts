/**
 * THE FIX-IT LADDER as a pure plan (shape-layers PLAN v2, slice 4).
 *
 * Arman's ruling (2026-10-14): anyone who sees a shape render badly can fix it
 * FOR THEMSELVES in one click; an org admin can also fix it for their
 * organization; a super admin's global change is a LINK to the admin shape
 * page, never admin power on a user route. The bar lists EVERY gap, each with
 * the owner's one-click repair where the viewer is the owner.
 *
 * Pure so the rights are testable without a store, a network or a render:
 * the bar (KindFixItBar) only reads this plan and wires the clicks.
 */

import type {
  KindRenderGap,
  KindRenderGapDiagnosis,
} from "./diagnose-kind-render-gap";
import type { ComponentLayerScope } from "@ai-matrx/content-ir-react";

/**
 * The owner's per-gap repair — the kind's creator (or the shared component's
 * saver). Never admin power: on a user route a super admin is a person, and
 * their global change is the "Change for everyone" LINK (invariant 6).
 */
export type FixItOwnerAction =
  | "register"
  | "add_schema"
  | "build_shared"
  | "turn_on"
  | "fix_code"
  | "activate";

export interface FixItGapRow {
  gap: KindRenderGap;
  label: string;
  ownerAction: FixItOwnerAction | null;
}

/** Who is looking — every field is a fact the bar reads, never a guess. */
export interface FixItViewer {
  userId: string | null;
  /** `selectIsSuperAdminPerson` — identity only: decides whether the admin LINK shows. */
  isSuperAdminPerson: boolean;
  /** Owner/admin of the ACTIVE organization (org admin, not platform admin). */
  isOrgAdmin: boolean;
  /** The active organization (writes carry it) — null when none is known. */
  activeOrganizationId?: string | null;
}

/** The viewer's own layered winner, when one exists (resolver `layer`). */
export interface FixItLayerFacts {
  scope: ComponentLayerScope;
  rowId: string;
  createdBy: string | null;
  /** The organization an organization-scope layer belongs to; null until read. */
  organizationId?: string | null;
  updatedAt: string | null;
  /** The SHARED tier's `updated_at` (db rows only), for "a newer shared view exists". */
  sharedUpdatedAt: string | null;
}

/** The viewer's own layered view, as the marker shows it. */
export interface FixItLayerPlan {
  mode: "layer";
  scope: ComponentLayerScope;
  rowId: string;
  canEdit: boolean;
  canRemove: boolean;
  newerShared: boolean;
  /**
   * The per-person actions that stay ALONGSIDE the marker: a view of one tier
   * never takes the other tiers' repairs away (a member under an org view can
   * still make their own; an org admin under their own view can still make the
   * organization's; a super admin always keeps the link).
   */
  makeMine: boolean;
  makeOrg: boolean;
  everyoneHref: string | null;
}

/** The per-person view actions — the same everywhere they appear (bar, shape page). */
export type FixItViewPlan =
  | { mode: "none" }
  | FixItLayerPlan
  | { mode: "actions"; makeMine: boolean; makeOrg: boolean; everyoneHref: string | null };

export type FixItPlan =
  | { mode: "none" }
  | {
      mode: "gaps";
      rows: FixItGapRow[];
      makeMine: boolean;
      makeOrg: boolean;
      everyoneHref: string | null;
    }
  | FixItLayerPlan;

export const GAP_LABEL: Record<KindRenderGap, string> = {
  unregistered: "Not registered, or not shared with you",
  unreadable: "Not readable to you",
  no_schema: "No schema yet",
  no_component: "No shared view yet",
  component_inactive: "Shared view is switched off",
  component_empty: "Shared view has no code",
  kind_inactive: "Not activated yet",
};

export const OWNER_ACTION_LABEL: Record<FixItOwnerAction, string> = {
  register: "Register",
  add_schema: "Add schema",
  build_shared: "Build shared view",
  turn_on: "Turn on",
  fix_code: "Fix code",
  activate: "Activate",
};

/** The admin shape page for a kind — the ONLY door to a change for everyone. */
export function adminShapePath(kind: string, registered: boolean): string {
  if (registered) return `/administration/utilities/kind-registry/${encodeURIComponent(kind)}`;
  // The builder page reads `?kind=` so the slug the viewer saw is not lost.
  const base = "/administration/utilities/kind-registry/build";
  return kind ? `${base}?kind=${encodeURIComponent(kind)}` : base;
}

function ownerActionFor(
  gap: KindRenderGap,
  isOwner: boolean,
  signedIn: boolean,
): FixItOwnerAction | null {
  // An unregistered name has no owner yet: any signed-in person may register
  // it as their own Shape (the pre-ladder bar's "Build kind & component").
  if (gap === "unregistered") return signedIn ? "register" : null;
  if (!isOwner) return null;
  switch (gap) {
    case "no_schema":
      return "add_schema";
    case "no_component":
      return "build_shared";
    case "component_inactive":
      return "turn_on";
    case "component_empty":
      return "fix_code";
    case "kind_inactive":
      return "activate";
    default:
      return null;
  }
}

function isNewer(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const left = Date.parse(a);
  const right = Date.parse(b);
  return Number.isFinite(left) && Number.isFinite(right) && left > right;
}

/**
 * THE ONE per-person decision: the viewer's own layered view wins (a marker,
 * never the generic claim); otherwise anyone signed in may make their own
 * view, an org admin their organization's, and a super admin (identity) gets
 * the link to the admin shape page. Signed out: nothing.
 */
export function planKindViewActions(
  viewer: FixItViewer,
  layer: FixItLayerFacts | null,
  kind: { slug: string; registered: boolean },
): FixItViewPlan {
  if (viewer.userId === null) return { mode: "none" };
  if (layer) {
    // Only the viewer's own rows ever reach the overlay, so a user-scope row is
    // theirs; an organization row is edited by its author or an org admin (the
    // database decides the write either way). No admin power.
    const mineToEdit =
      layer.scope === "user" || layer.createdBy === viewer.userId || viewer.isOrgAdmin;
    return {
      mode: "layer",
      scope: layer.scope,
      rowId: layer.rowId,
      canEdit: mineToEdit,
      canRemove: mineToEdit,
      newerShared: isNewer(layer.sharedUpdatedAt, layer.updatedAt),
      // Under my own view there is nothing more to make for me; under an org
      // view there is. An org admin editing the org view already has "Edit".
      makeMine: layer.scope === "organization",
      // Hidden only where "Edit" already is the organization repair: an org view
      // that belongs to the viewer's ACTIVE organization. Another organization's
      // view (or one not yet known) never takes the active one's repair away.
      makeOrg:
        viewer.isOrgAdmin &&
        (layer.scope === "user" ||
          (layer.organizationId != null &&
            layer.organizationId !== (viewer.activeOrganizationId ?? null))),
      everyoneHref: viewer.isSuperAdminPerson ? adminShapePath(kind.slug, kind.registered) : null,
    };
  }
  return {
    mode: "actions",
    makeMine: true,
    makeOrg: viewer.isOrgAdmin,
    everyoneHref: viewer.isSuperAdminPerson ? adminShapePath(kind.slug, kind.registered) : null,
  };
}

export function planKindFixIt(
  diagnosis: KindRenderGapDiagnosis | null,
  viewer: FixItViewer,
  layer: FixItLayerFacts | null,
  kind?: { slug: string; registered: boolean },
): FixItPlan {
  const signedIn = viewer.userId !== null;

  if (layer && signedIn) {
    const view = planKindViewActions(viewer, layer, {
      slug: kind?.slug ?? diagnosis?.kind ?? "",
      registered: kind?.registered ?? (diagnosis ? diagnosis.kindDefinitionId !== null : true),
    });
    if (view.mode === "layer") return view;
  }

  if (!diagnosis || diagnosis.gaps.length === 0) return { mode: "none" };
  // A signed-out visitor never reads why a shape fell back (they cannot fix it).
  if (diagnosis.state === "unreadable") return { mode: "none" };
  if (!signedIn) {
    return {
      mode: "gaps",
      rows: diagnosis.gaps.map((gap) => ({ gap, label: GAP_LABEL[gap], ownerAction: null })),
      makeMine: false,
      makeOrg: false,
      everyoneHref: null,
    };
  }

  const isOwner =
    diagnosis.kindCreatedBy === viewer.userId ||
    diagnosis.inactiveComponentCreatedBy === viewer.userId;
  const view = planKindViewActions(viewer, null, {
    slug: diagnosis.kind,
    registered: diagnosis.kindDefinitionId !== null,
  });
  const actions =
    view.mode === "actions" ? view : { makeMine: false, makeOrg: false, everyoneHref: null };

  return {
    mode: "gaps",
    rows: diagnosis.gaps.map((gap) => ({
      gap,
      label: GAP_LABEL[gap],
      ownerAction: ownerActionFor(gap, isOwner, signedIn),
    })),
    makeMine: actions.makeMine,
    makeOrg: actions.makeOrg,
    everyoneHref: actions.everyoneHref,
  };
}
