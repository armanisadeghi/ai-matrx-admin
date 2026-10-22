// features/shell/shell-layout/offers.ts — THE What's new offers (custom-experience PLAN §5.5). Pure.
//
// One source for every place that shows them (the Sidebar's slot at its top, the band at the top of every
// launchpad): `layoutOffers(held, viewer)` answers
//   • `news`      — catalog destinations added since the person's own Sidebar was last reviewed
//                   ("New: X" — Add / Dismiss; the resolver's `whatsNew`);
//   • `orgUpdate` — her organization saved its layout after she last reviewed it ("Your organization
//                   updated its menu" — Review / Dismiss), with what its menu has that hers lacks.
// Both come from the held layouts the server seeds, so the server and the first client render agree and
// nothing is reserved when there is nothing to offer. The reviewed version lives in HER layout body
// (`reviewedOrgLayouts`, amendment 2026-10-22 lane AA), so a dismissal follows her to every device.

import { buildShellCatalog, getCatalogEntry, SHELL_CATALOG_VERSION, type ShellCatalogEntry } from "./catalog";
import type { ShellLayoutBody, ShellNode, StoredShellLayout } from "./contract";
import { resolveHeldShellLayout, type HeldShellLayouts, type ShellViewer } from "./held";
import { resolveRetiredNavId } from "./retired-nav-ids";
import { parseShellLayoutBody } from "./validate";
import { allIds, freshId } from "./editor/tree";
import { sidebarOf } from "./editor/regions";
import type { ShellIconName } from "@/features/shell/shellIconMap";

export interface OrgMenuUpdate {
  organizationId: string;
  /** The organization layout's store version: what Dismiss / Review records as reviewed. */
  version: number;
  /** Rows of the organization's Sidebar she does not have (each with whatever sits under it). */
  additions: OrgMenuAddition[];
}

export interface OrgMenuAddition {
  /** The row as the organization stores it (ids are re-made when it is added to hers). */
  node: ShellNode;
  label: string;
  icon: ShellIconName;
}

export interface LayoutOffers {
  news: ShellCatalogEntry[];
  orgUpdate: OrgMenuUpdate | null;
}

export const NO_LAYOUT_OFFERS: LayoutOffers = { news: [], orgUpdate: null };

/** The version of `organizationId`'s layout this body last reviewed (undefined = never recorded). */
export function reviewedOrgVersion(body: ShellLayoutBody, organizationId: string): number | undefined {
  return body.reviewedOrgLayouts?.[organizationId];
}

/**
 * Whether the organization's layout is newer than what she reviewed. With no recorded review, it is newer
 * when it was saved after her own layout (her layout made after it already took it into account).
 */
export function orgLayoutIsNewer(body: ShellLayoutBody, person: StoredShellLayout, organization: StoredShellLayout): boolean {
  const reviewed = reviewedOrgVersion(body, organization.organizationId);
  if (reviewed !== undefined) return organization.version > reviewed;
  const orgAt = Date.parse(organization.updatedAt);
  const ownAt = Date.parse(person.updatedAt);
  return Number.isFinite(orgAt) && Number.isFinite(ownAt) && orgAt > ownAt;
}

/** What identifies a row across two menus (ids are per body, so never the id). */
function rowKey(node: ShellNode): string {
  switch (node.kind) {
    case "nav":
      return `nav:${resolveRetiredNavId(node.ref).id ?? node.ref}`;
    case "link":
      return `link:${node.href}`;
    case "record":
      return `record:${node.token}:${node.recordId}`;
    case "launchpad":
      return `launchpad:${node.key}`;
    case "group":
      return `group:${node.label.trim().toLowerCase()}`;
  }
}

function keysOf(nodes: readonly ShellNode[], into: Set<string> = new Set()): Set<string> {
  for (const node of nodes) {
    into.add(rowKey(node));
    if (node.kind === "nav" || node.kind === "group") keysOf(node.children ?? [], into);
  }
  return into;
}

/** A row minus everything under it she already has, or what the viewer cannot open; null = nothing left. */
function withoutHeld(node: ShellNode, held: Set<string>, canOpen: (ref: string) => boolean): ShellNode | null {
  if (node.kind === "nav" && !canOpen(resolveRetiredNavId(node.ref).id ?? node.ref)) return null;
  if (node.kind !== "nav" && node.kind !== "group") return node;
  const children = (node.children ?? []).filter((c) => !held.has(rowKey(c))).map((c) => withoutHeld(c, held, canOpen)).filter((c): c is ShellNode => c !== null);
  if (node.kind === "group") return children.length > 0 ? { ...node, children } : null;
  if (!node.children) return node;
  const { children: _drop, ...rest } = node;
  return children.length > 0 ? { ...rest, children } : rest;
}

function displayOf(node: ShellNode): { label: string; icon: ShellIconName } {
  if (node.kind === "nav") {
    const entry = getCatalogEntry(resolveRetiredNavId(node.ref).id ?? node.ref);
    return { label: node.label ?? entry?.label ?? node.ref, icon: node.icon ?? entry?.iconName ?? "Link2" };
  }
  return { label: node.label, icon: node.icon ?? "Link2" };
}

/**
 * The rows of the organization's Sidebar that hers lacks: the highest row she does not have, with what sits
 * under it (minus rows she already has elsewhere). A row she has is looked into for rows under it she lacks.
 */
export function orgMenuAdditions(own: ShellLayoutBody, organization: ShellLayoutBody, opts: { isAdmin: boolean }): OrgMenuAddition[] {
  const held = keysOf(sidebarOf(own));
  const visible = new Set(buildShellCatalog({ isAdmin: opts.isAdmin }).map((e) => e.id));
  const canOpen = (ref: string) => visible.has(ref);
  const out: OrgMenuAddition[] = [];
  const walk = (nodes: readonly ShellNode[]) => {
    for (const node of nodes) {
      if (held.has(rowKey(node))) {
        if (node.kind === "nav" || node.kind === "group") walk(node.children ?? []);
        continue;
      }
      const kept = withoutHeld(node, held, canOpen);
      if (kept) out.push({ node: kept, ...displayOf(kept) });
    }
  };
  walk(sidebarOf(organization));
  return out;
}

/** Everything the offer places read. Guests, Standard view, other route groups and the lock: nothing. */
export function layoutOffers(held: HeldShellLayouts, viewer: ShellViewer): LayoutOffers {
  if (!held.enabled || viewer.isGuest || held.standardView || held.previewBody || held.personAllowed === false || !held.person) return NO_LAYOUT_OFFERS;
  const own = parseShellLayoutBody(held.person.body).body;
  if (!own) return NO_LAYOUT_OFFERS;
  const resolved = resolveHeldShellLayout(held, viewer);
  const news = own.sidebar !== undefined ? resolved.whatsNew : [];
  const stored = held.organizationId ? held.organizations[held.organizationId] : undefined;
  let orgUpdate: OrgMenuUpdate | null = null;
  if (stored && orgLayoutIsNewer(own, held.person, stored)) {
    const organization = parseShellLayoutBody(stored.body).body;
    if (organization) {
      orgUpdate = { organizationId: stored.organizationId, version: stored.version, additions: orgMenuAdditions(own, organization, viewer) };
    }
  }
  return news.length === 0 && !orgUpdate ? NO_LAYOUT_OFFERS : { news, orgUpdate };
}

// ── the verbs (the offer places write through these) ─────────────────────────

/** Records `version` of the organization's layout as reviewed (Dismiss, Done, "Use the organization's menu"). */
export function markOrgReviewed(body: ShellLayoutBody, organizationId: string, version: number): ShellLayoutBody {
  return { ...body, reviewedOrgLayouts: { ...body.reviewedOrgLayouts, [organizationId]: version } };
}

function rekey(node: ShellNode, taken: Set<string>): ShellNode {
  const id = freshId(taken, node.id);
  taken.add(id);
  if (node.kind === "group") return { ...node, id, children: node.children.map((c) => rekey(c, taken)) };
  if (node.kind === "nav" && node.children) return { ...node, id, children: node.children.map((c) => rekey(c, taken)) };
  return { ...node, id };
}

/** Adds one of the organization's rows to the bottom of her Sidebar (unchanged when she already has it). */
export function addOrgRow(body: ShellLayoutBody, node: ShellNode): ShellLayoutBody {
  const sidebar = sidebarOf(body);
  if (keysOf(sidebar).has(rowKey(node))) return body;
  return { ...body, sidebar: [...sidebar, rekey(node, allIds(sidebar))] };
}

/** Her Sidebar becomes the organization's (the rest of her layout stays hers); the version is reviewed. */
export function takeOrganizationSidebar(body: ShellLayoutBody, organization: ShellLayoutBody, organizationId: string, version: number): ShellLayoutBody {
  const { sidebar: _own, ...rest } = body;
  const next: ShellLayoutBody = organization.sidebar !== undefined ? { ...rest, sidebar: organization.sidebar } : rest;
  // The organization's menu is today's catalog as far as it goes; What's new keeps offering only what it lacks.
  return markOrgReviewed({ ...next, basedOnCatalogVersion: Math.max(body.basedOnCatalogVersion, Math.min(organization.basedOnCatalogVersion, SHELL_CATALOG_VERSION)) }, organizationId, version);
}
