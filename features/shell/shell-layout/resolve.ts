// features/shell/shell-layout/resolve.ts — which layout a viewer sees, as the shell's renderers
// already read it. Pure: parsed bodies in, menu trees out.
//
// Order (PLAN.md §5.2): guests → the built-in default, always; the Standard view switch → the
// default; else the person's body wins WHOLE; else the organization's body; else the default.
// Inside the winning body a region it does not carry (`sidebar`/`header`/`dock`/`landing` absent)
// is the default for that region (the `look` region: absent = the standard look). The ONE per-field
// exception is the `accent` (amendment 2026-10-20, lane Q): the organization's accent is its brand color,
// so it shows through a person's layout that names no accent of its own (person > organization > none).
// Refs no catalog entry answers are dropped from render and named
// in `problems`. New catalog entries are offered in `whatsNew`, never injected into the tree.
//
// The output is the nav-data shape: `sidebar` and `dock` are `ShellNavItem[]` trees (top rows
// `ShellNavItem`, rows below `ShellNavChild`), so Sidebar, NavFlyoutGroup, the phone drawer and
// MobileDockItems render a custom layout with the data source swapped and nothing else changed.
// A nav row copies its nav-data node, so the default tree resolves byte-identical to today's menu.

import {
  dockItems,
  primaryNavItems,
  type ShellNavChild,
  type ShellNavItem,
} from "@/features/shell/constants/nav-data";
import type { ShellIconName } from "@/features/shell/shellIconMap";
import { USER_LAUNCHPAD_PATH } from "@/features/launchpad/constants";
import type {
  HeaderButton,
  HeaderControlId,
  ShellAccentRef,
  ShellLanding,
  ShellLayoutBody,
  ShellLayoutSource,
  ShellNode,
} from "./contract";
import {
  buildShellCatalog,
  defaultDockTree,
  defaultHeaderButtons,
  defaultSidebarTree,
  getCatalogEntry,
  getCatalogNavNode,
  type ShellCatalogEntry,
} from "./catalog";
import { resolveRetiredNavId } from "./retired-nav-ids";
import { EDIT_SIDEBAR_HREF } from "./addPagesHref";
import { isShellLookId, STANDARD_SHELL_LOOK, type ShellLookId } from "./looks";

/**
 * A Sidebar/Dock row as the renderers read it: a nav-data `ShellNavItem` whose children are
 * `ShellNavChild` rows. `tileId` is set on a row that launches a Tools-grid tile: its `href` is a
 * `#tile.*` anchor that never navigates, so a renderer must run the tile for such a row.
 */
export type ResolvedNavItem = ShellNavItem & { tileId?: string; children?: ResolvedNavChild[] };
export type ResolvedNavChild = ShellNavChild & { tileId?: string; children?: ResolvedNavChild[] };

/** One header button, ready to draw. */
export type ResolvedHeaderButton =
  | { kind: "control"; id: string; control: HeaderControlId }
  | {
      kind: "destination";
      id: string;
      label: string;
      iconName: ShellIconName;
      href: string;
      external: boolean;
      openInNewTab: boolean;
      tileId?: string;
    }
  | { kind: "mandate"; id: string; label: string; iconName: ShellIconName; mandateKey: string };

export interface ResolveShellLayoutInput {
  /** The person's own parsed body (null = none or unreadable). */
  person: ShellLayoutBody | null;
  /** The organization's parsed body for the organization the page runs in. */
  organization: ShellLayoutBody | null;
  /** The Standard view switch is on. */
  standardView: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  /**
   * Members may customize (the `shell.members_may_customize` knob, organization rung). `false` = the
   * organization locked its layout: the person's own layout is ignored. Default true. (Amendment
   * 2026-10-19, REGISTER.md.)
   */
  personAllowed?: boolean;
}

export interface ResolvedShellLayout {
  source: ShellLayoutSource;
  sidebar: ResolvedNavItem[];
  dock: ResolvedNavItem[];
  /**
   * The winning body carries its own Dock. The phone dock is hidden on every route by default (shell.css
   * §13); a person (or organization) who customized it gets it shown (`data-show-dock` on `.shell-root`).
   */
  customDock: boolean;
  header: ResolvedHeaderButton[];
  /** Where sign-in lands; null = the platform default. `shellLandingHref` turns it into a path. */
  landing: ShellLanding | null;
  /** The Look the shell wears; null = standard (no attribute is stamped). Guests and Standard view: null. */
  look: ShellLookId | null;
  /**
   * The accent color: the person's, else the organization's brand color, else null (the built-in
   * primary). Guests and Standard view: null. The shell stamps it with the design system's
   * `accentAttributes` (no attribute for null).
   */
  accent: ShellAccentRef | null;
  /** Catalog entries newer than the body's `basedOnCatalogVersion`, not dismissed, not placed. */
  whatsNew: ShellCatalogEntry[];
  /** Everything dropped while resolving, by path. Empty for the default. */
  problems: string[];
}

const LAUNCHPAD_ICON: ShellIconName = "LayoutGrid";
const RECORD_ICON: ShellIconName = "FileText";

/** The page a launchpad key opens. */
export function launchpadHref(key: string): string {
  return `${USER_LAUNCHPAD_PATH}/${encodeURIComponent(key)}`;
}

/** The path a landing choice opens; null = the platform default. */
export function shellLandingHref(landing: ShellLanding | null): string | null {
  if (!landing) return null;
  return landing.kind === "launchpad" ? launchpadHref(landing.key) : landing.href;
}

function isAbsoluteUrl(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(href);
}

function tileHref(tileId: string): string {
  return `#${tileId}`;
}

/** The fields a row has at every depth, picked so no top-only or child-only field leaks across. */
function commonFields(node: ShellNavItem | ShellNavChild) {
  return {
    id: node.id,
    label: node.label,
    href: node.href,
    iconName: node.iconName,
    ...(node.description !== undefined ? { description: node.description } : {}),
    ...(node.color !== undefined ? { color: node.color } : {}),
    ...(node.dashboard !== undefined ? { dashboard: node.dashboard } : {}),
    ...(node.profileMenu !== undefined ? { profileMenu: node.profileMenu } : {}),
    ...(node.guestHidden !== undefined ? { guestHidden: node.guestHidden } : {}),
    ...(node.guestHref !== undefined ? { guestHref: node.guestHref } : {}),
    ...(node.external !== undefined ? { external: node.external } : {}),
    ...(node.openInNewTab !== undefined ? { openInNewTab: node.openInNewTab } : {}),
  };
}

function asTopItem(node: ShellNavItem | ShellNavChild): ResolvedNavItem {
  if ("section" in node) {
    const { children: _children, ...rest } = node;
    return { ...rest };
  }
  return { ...commonFields(node), section: "primary" };
}

function asChild(node: ShellNavItem | ShellNavChild, keepGroup: boolean): ResolvedNavChild {
  if ("section" in node) return { ...commonFields(node) };
  const { children: _children, group, ...rest } = node;
  return keepGroup && group !== undefined ? { ...rest, group } : { ...rest };
}

interface Walk {
  isAdmin: boolean;
  problems: string[];
}

/** A row in the shape its depth needs. `parentRef` is the catalog id of the row it sits under. */
type Shaped<D extends 1 | 2> = D extends 1 ? ResolvedNavItem : ResolvedNavChild;

function resolveNode(
  node: ShellNode,
  depth: number,
  parentRef: string | null,
  at: string,
  walk: Walk,
  allowChildren: boolean,
): ResolvedNavItem | ResolvedNavChild | null {
  const top = depth === 1;
  const withChildren = <T extends ResolvedNavItem | ResolvedNavChild>(row: T, children: ShellNode[] | undefined, ref: string | null): T => {
    if (!allowChildren || !children) return row;
    const resolved = resolveNodes(children, depth + 1, ref, `${at}.children`, walk, allowChildren);
    return resolved.length > 0 ? { ...row, children: resolved } : row;
  };
  switch (node.kind) {
    case "nav": {
      const { id: ref } = resolveRetiredNavId(node.ref);
      const entry = ref ? getCatalogEntry(ref, { isAdmin: walk.isAdmin }) : undefined;
      if (!ref || !entry) {
        walk.problems.push(`${at}: "${node.ref}" is not available; not shown`);
        return null;
      }
      const source = getCatalogNavNode(ref);
      let row: ResolvedNavItem | ResolvedNavChild;
      if (source) {
        row = top ? asTopItem(source) : asChild(source, entry.parentId === parentRef);
      } else {
        // A Tools-grid tile: a row that launches it in place.
        const base = {
          id: entry.id,
          label: entry.label,
          href: tileHref(entry.id),
          iconName: entry.iconName,
          ...(entry.tileId ? { tileId: entry.tileId } : {}),
        };
        row = top ? { ...base, section: "primary" } : base;
      }
      if (node.id !== ref) row = { ...row, id: node.id };
      if (node.label) row = { ...row, label: node.label };
      if (node.icon) row = { ...row, iconName: node.icon };
      return withChildren(row, node.children, ref);
    }
    case "link": {
      const external = isAbsoluteUrl(node.href);
      const base = {
        id: node.id,
        label: node.label,
        href: node.href,
        iconName: node.icon,
        ...(external ? { external: true } : {}),
        ...(!external && node.newTab ? { openInNewTab: true } : {}),
      };
      return top ? { ...base, section: "primary" } : base;
    }
    case "record": {
      const base = { id: node.id, label: node.label, href: node.href, iconName: node.icon ?? RECORD_ICON };
      return top ? { ...base, section: "primary" } : base;
    }
    case "launchpad": {
      const base = { id: node.id, label: node.label, href: launchpadHref(node.key), iconName: node.icon ?? LAUNCHPAD_ICON };
      return top ? { ...base, section: "primary" } : base;
    }
    case "group": {
      if (!allowChildren) {
        walk.problems.push(`${at}: groups are not allowed here; not shown`);
        return null;
      }
      const children = resolveNodes(node.children, depth + 1, null, `${at}.children`, walk, allowChildren);
      // A group the person made is shown even while it holds nothing (VS Code keeps an empty folder, Linear
      // an empty favorites folder): its label stays, and its menu offers the one thing to do with it — add
      // pages (the editor, in place). Until 2026-10-19 an empty group was dropped from render, so a saved
      // "QA Group" showed in the editor and nowhere else.
      if (children.length === 0) {
        const base = { id: node.id, label: node.label, href: EDIT_SIDEBAR_HREF, iconName: node.icon };
        const add: ResolvedNavChild = { id: `${node.id}.add`, label: "Add pages…", href: EDIT_SIDEBAR_HREF, iconName: "Plus", action: "edit-sidebar" };
        return top ? { ...base, section: "primary", children: [add] } : { ...base, children: [add] };
      }
      // A group's own href is its first destination, the same way a domain row lands on its first page.
      const base = { id: node.id, label: node.label, href: children[0]?.href ?? USER_LAUNCHPAD_PATH, iconName: node.icon };
      return top ? { ...base, section: "primary", children } : { ...base, children };
    }
  }
}

function resolveNodes(
  nodes: ShellNode[],
  depth: number,
  parentRef: string | null,
  at: string,
  walk: Walk,
  allowChildren: boolean,
): ResolvedNavChild[] {
  const out: ResolvedNavChild[] = [];
  nodes.forEach((node, index) => {
    const row = resolveNode(node, depth, parentRef, `${at}[${index}]`, walk, allowChildren);
    if (row) out.push(row as Shaped<2>);
  });
  return out;
}

function resolveTopNodes(nodes: ShellNode[], at: string, walk: Walk, allowChildren: boolean): ResolvedNavItem[] {
  const out: ResolvedNavItem[] = [];
  nodes.forEach((node, index) => {
    const row = resolveNode(node, 1, null, `${at}[${index}]`, walk, allowChildren);
    if (row) out.push(row as Shaped<1>);
  });
  return out;
}

function resolveHeader(buttons: HeaderButton[], walk: Walk): ResolvedHeaderButton[] {
  const out: ResolvedHeaderButton[] = [];
  buttons.forEach((button, index) => {
    const at = `header[${index}]`;
    switch (button.kind) {
      case "control":
        out.push({ kind: "control", id: button.id, control: button.control });
        return;
      case "nav": {
        const { id: ref } = resolveRetiredNavId(button.ref);
        const entry = ref ? getCatalogEntry(ref, { isAdmin: walk.isAdmin }) : undefined;
        if (!entry) {
          walk.problems.push(`${at}: "${button.ref}" is not available; not shown`);
          return;
        }
        out.push({
          kind: "destination",
          id: button.id,
          label: button.label ?? entry.label,
          iconName: button.icon ?? entry.iconName,
          href: entry.href ?? tileHref(entry.id),
          external: entry.external,
          openInNewTab: entry.openInNewTab,
          ...(entry.tileId ? { tileId: entry.tileId } : {}),
        });
        return;
      }
      case "link": {
        const external = isAbsoluteUrl(button.href);
        out.push({
          kind: "destination",
          id: button.id,
          label: button.label,
          iconName: button.icon,
          href: button.href,
          external,
          openInNewTab: !external && button.newTab === true,
        });
        return;
      }
      case "launchpad":
        out.push({
          kind: "destination",
          id: button.id,
          label: button.label,
          iconName: button.icon ?? LAUNCHPAD_ICON,
          href: launchpadHref(button.key),
          external: false,
          openInNewTab: false,
        });
        return;
      case "mandate":
        out.push({ kind: "mandate", id: button.id, label: button.label, iconName: button.icon, mandateKey: button.mandateKey });
        return;
    }
  });
  return out;
}

function collectRefs(nodes: readonly ShellNode[] | undefined, into: Set<string>): void {
  for (const node of nodes ?? []) {
    if (node.kind === "nav") {
      into.add(resolveRetiredNavId(node.ref).id ?? node.ref);
      collectRefs(node.children, into);
    } else if (node.kind === "group") {
      collectRefs(node.children, into);
    }
  }
}

function whatsNewFor(body: ShellLayoutBody, isAdmin: boolean): ShellCatalogEntry[] {
  const dismissed = new Set(body.dismissedNew ?? []);
  // "Placed" = what the person SEES: a region the body does not carry shows its default (which grows
  // with the catalog on its own), so nothing already showing there is offered as new.
  const placed = new Set<string>();
  collectRefs(body.sidebar ?? defaultSidebarTree(), placed);
  collectRefs(body.dock ?? defaultDockTree(), placed);
  for (const button of body.header ?? defaultHeaderButtons()) if (button.kind === "nav") placed.add(button.ref);
  const catalog = buildShellCatalog({ isAdmin });
  const offered = catalog.filter(
    (entry) =>
      (entry.addedIn ?? 1) > body.basedOnCatalogVersion && !dismissed.has(entry.id) && !placed.has(entry.id),
  );
  // A new menu arrives as ONE offer: an entry under an entry that is itself offered rides in with it (Add
  // places the parent with its children). The Memory menu would otherwise be 24 rows of "New:" (2026-10-22).
  const offeredIds = new Set(offered.map((e) => e.id));
  const parentOf = new Map(catalog.map((e) => [e.id, e.parentId]));
  const underOffered = (id: string): boolean => {
    for (let p = parentOf.get(id) ?? null; p !== null; p = parentOf.get(p) ?? null) if (offeredIds.has(p)) return true;
    return false;
  };
  return offered.filter((entry) => !underOffered(entry.id));
}

function defaultHeader(): ResolvedHeaderButton[] {
  return resolveHeader(defaultHeaderButtons(), { isAdmin: false, problems: [] });
}

function defaultLayout(source: ShellLayoutSource): ResolvedShellLayout {
  return {
    source,
    sidebar: primaryNavItems,
    dock: dockItems,
    customDock: false,
    header: defaultHeader(),
    landing: null,
    look: null,
    accent: null,
    whatsNew: [],
    problems: [],
  };
}

/** The winning body carries its own Dock (shown on phones only then). */
export function bodyShowsDock(body: ShellLayoutBody | null): boolean {
  return body?.dock !== undefined;
}

/** The look a winning body names; null = standard. */
export function bodyShellLook(body: ShellLayoutBody | null): ShellLookId | null {
  const id = body?.look?.id;
  return isShellLookId(id) && id !== STANDARD_SHELL_LOOK ? id : null;
}

/** The accent: the person's own (when allowed), else the organization's brand color, else null. */
export function shellAccentOf(own: ShellLayoutBody | null, organization: ShellLayoutBody | null): ShellAccentRef | null {
  return own?.accent ?? organization?.accent ?? null;
}

/** The layout this viewer sees. See the header of this file for the order. */
export function resolveShellLayout({
  person,
  organization,
  standardView,
  isAdmin,
  isGuest,
  personAllowed = true,
}: ResolveShellLayoutInput): ResolvedShellLayout {
  if (isGuest) return defaultLayout("default");
  if (standardView) return defaultLayout("standard-view");
  const own = personAllowed ? person : null;
  const body = own ?? organization;
  if (!body) return defaultLayout("default");
  const source: ShellLayoutSource = own ? "person" : "organization";
  const walk: Walk = { isAdmin, problems: [] };
  return {
    source,
    sidebar: body.sidebar ? resolveTopNodes(body.sidebar, "sidebar", walk, true) : primaryNavItems,
    dock: body.dock ? resolveTopNodes(body.dock, "dock", walk, false) : dockItems,
    customDock: body.dock !== undefined,
    header: body.header ? resolveHeader(body.header, walk) : defaultHeader(),
    landing: body.landing ?? null,
    look: bodyShellLook(body),
    accent: shellAccentOf(own, organization),
    whatsNew: whatsNewFor(body, isAdmin),
    problems: walk.problems,
  };
}
