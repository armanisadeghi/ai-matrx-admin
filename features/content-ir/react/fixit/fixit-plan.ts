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

/** The owner's per-gap repair (the kind's creator, or a super admin IN the admin lane). */
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
  /**
   * `selectIsSuperAdmin` — TRUE only inside the admin lane, so on a user page
   * a super admin is an ordinary person here (invariant 6).
   */
  isSuperAdminInLane: boolean;
  /** `selectIsSuperAdminPerson` — identity only: decides whether the admin LINK shows. */
  isSuperAdminPerson: boolean;
  /** Owner/admin of the ACTIVE organization (org admin, not platform admin). */
  isOrgAdmin: boolean;
}

/** The viewer's own layered winner, when one exists (resolver `layer`). */
export interface FixItLayerFacts {
  scope: ComponentLayerScope;
  rowId: string;
  createdBy: string | null;
  updatedAt: string | null;
  /** The SHARED tier's `updated_at` (db rows only), for "a newer shared view exists". */
  sharedUpdatedAt: string | null;
}

export type FixItPlan =
  | { mode: "none" }
  | {
      mode: "gaps";
      rows: FixItGapRow[];
      makeMine: boolean;
      makeOrg: boolean;
      everyoneHref: string | null;
    }
  | {
      mode: "layer";
      scope: ComponentLayerScope;
      rowId: string;
      canEdit: boolean;
      canRemove: boolean;
      newerShared: boolean;
    };

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
  return registered
    ? `/administration/utilities/kind-registry/${encodeURIComponent(kind)}`
    : "/administration/utilities/kind-registry/build";
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

export function planKindFixIt(
  diagnosis: KindRenderGapDiagnosis | null,
  viewer: FixItViewer,
  layer: FixItLayerFacts | null,
): FixItPlan {
  const signedIn = viewer.userId !== null;

  // THE VIEWER'S OWN VIEW WINS: never claim the generic viewer or the shared
  // ladder over it. Only the viewer's own rows ever reach the overlay, so a
  // user-scope row is theirs; an organization row is edited by its author or
  // an org admin (the database decides the write either way). No admin power.
  if (layer && signedIn) {
    const mineToEdit =
      layer.scope === "user" ||
      layer.createdBy === viewer.userId ||
      viewer.isOrgAdmin;
    return {
      mode: "layer",
      scope: layer.scope,
      rowId: layer.rowId,
      canEdit: mineToEdit,
      canRemove: mineToEdit,
      newerShared: isNewer(layer.sharedUpdatedAt, layer.updatedAt),
    };
  }

  if (!diagnosis || diagnosis.gaps.length === 0) return { mode: "none" };
  // A signed-out visitor never reads why a shape fell back (they cannot fix it).
  if (diagnosis.state === "unreadable" || !signedIn) {
    if (!signedIn && diagnosis.state !== "unreadable") {
      return {
        mode: "gaps",
        rows: diagnosis.gaps.map((gap) => ({ gap, label: GAP_LABEL[gap], ownerAction: null })),
        makeMine: false,
        makeOrg: false,
        everyoneHref: null,
      };
    }
    return { mode: "none" };
  }

  const isOwner =
    viewer.isSuperAdminInLane ||
    diagnosis.kindCreatedBy === viewer.userId ||
    diagnosis.inactiveComponentCreatedBy === viewer.userId;

  return {
    mode: "gaps",
    rows: diagnosis.gaps.map((gap) => ({
      gap,
      label: GAP_LABEL[gap],
      ownerAction: ownerActionFor(gap, isOwner, signedIn),
    })),
    makeMine: true,
    makeOrg: viewer.isOrgAdmin,
    everyoneHref: viewer.isSuperAdminPerson
      ? adminShapePath(diagnosis.kind, diagnosis.kindDefinitionId !== null)
      : null,
  };
}
