// features/shell/breadcrumbs/derive-trail.ts
//
// THE DERIVED BREADCRUMB (feature-pages rule 7). Pure: address + menu (+ record names) in, crumbs out.
//
//   label    override list → the record the page declared → the menu's own label → "All <module>" for
//            /all → the id through the ONE id component (a uuid with no name) → the humanized segment
//   siblings the record's own list (when a layout supplies it) → the menu node's siblings (the first
//            level lists the modules) → the route tree, loaded when the dropdown first opens
//
// A page never types a trail. A record page supplies only its record (token + id, or a known name).

import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import type {
  Crumb,
  CrumbOption,
} from "@/features/shell/components/header/templates/CrumbTrailHeader";
import { trailOverrideFor, TRAIL_LABEL_OVERRIDES } from "./trail-overrides";
import { isPagelessLevel } from "./pageless-levels";
import { PAGELESS_LEVELS } from "./pageless-levels.generated";

/** The slice of a menu node the derivation reads (ShellNavItem / ShellNavChild satisfy it). */
export interface TrailNavNode {
  label: string;
  href: string;
  external?: boolean;
  action?: unknown;
  actionItem?: boolean;
  panelAction?: unknown;
  tileId?: string;
  children?: readonly TrailNavNode[];
}

/** What a layout/page knows about one level of the address (usually a record). */
export interface TrailRecord {
  /** The record's name, when known. */
  label?: string | null;
  /** Entity type token — lets the id chip open the record's doors. */
  token?: string | null;
  /** Sibling records for the dropdown (the Scopes pattern). */
  options?: CrumbOption[];
  /** Sibling records fetched when the door first opens (record-siblings.ts, per entity type). */
  loadOptions?: () => Promise<CrumbOption[]>;
  optionsLabel?: string;
  optionsAllHref?: string;
  optionsAllLabel?: string;
}

export interface DeriveTrailInput {
  pathname: string;
  /** Primary + admin menu roots. */
  nav: readonly TrailNavNode[];
  /** Record levels keyed by the address of that level (`/agents/<id>`). */
  records?: Readonly<Record<string, TrailRecord | undefined>>;
  overrides?: Readonly<Record<string, string | null>>;
  /** Siblings of the level at `parentHref` from the route tree (called when the dropdown opens). */
  loadSiblings?: (parentHref: string, activeSegment: string) => Promise<CrumbOption[]>;
  /**
   * Is this address a folder with no page of its own? Default: the route manifest's table
   * (pageless-levels.generated.ts). Such a level is never a crumb (it could only be a 404 or text).
   */
  isPageless?: (href: string) => boolean;
}

const manifestPageless = (href: string) => isPagelessLevel(href, PAGELESS_LEVELS);

interface NavHit {
  node: TrailNavNode;
  /** The destinations beside it (same parent), actions/panels/external removed. */
  siblings: readonly TrailNavNode[];
}

const isDestination = (n: TrailNavNode): boolean =>
  !n.external && !n.action && !n.actionItem && !n.panelAction && !n.tileId && !n.href.startsWith("#");

const bare = (href: string): string => href.split(/[?#]/, 1)[0]!.replace(/\/+$/, "") || "/";

const indexCache = new WeakMap<readonly TrailNavNode[], Map<string, NavHit>>();

/** Every menu destination by address (children win over their module row, which shares an address). */
function navIndex(nav: readonly TrailNavNode[]): Map<string, NavHit> {
  const hit = indexCache.get(nav);
  if (hit) return hit;
  const index = new Map<string, NavHit>();
  const walk = (nodes: readonly TrailNavNode[]) => {
    const destinations = nodes.filter(isDestination);
    for (const node of nodes) {
      if (isDestination(node)) index.set(bare(node.href), { node, siblings: destinations });
      if (node.children) walk(node.children);
    }
  };
  // Children first so a module row (same address as its first child) never shadows the child.
  for (const root of nav) if (root.children) walk(root.children);
  indexCache.set(nav, index);
  return index;
}

interface ModuleHit {
  row: TrailNavNode;
  /** The rows its crumb's door lists: the top menu, or the group's modules. */
  siblings: readonly TrailNavNode[];
  /** The group the module sits in (Industries), when it is one menu inside another. */
  groupLabel?: string;
}

/**
 * The module row for a first segment: the row whose address or any child's address starts there.
 * A top row that GROUPS modules (its own address is its first module's) (Industries: each industry has its own menu) is never the module
 * itself — the industry inside it is, and its door lists the group's other modules. Before, every
 * industry's trail read "Industries" (/legal, /medical, /commerce/…, and /education by address).
 */
function moduleFor(nav: readonly TrailNavNode[], seg: string): ModuleHit | undefined {
  const starts = (href: string) => bare(href).split("/")[1] === seg;
  const deep = (n: TrailNavNode): boolean =>
    isDestination(n) && (starts(n.href) || (n.children?.some(deep) ?? false));
  const top = nav.find((n) => isDestination(n) && starts(n.href)) ?? nav.find(deep);
  if (!top) return undefined;
  const modules = (top.children ?? []).filter((c) => isDestination(c) && (c.children?.length ?? 0) > 0);
  // A group's own address is one of its modules' (Industries opens Education); a module with
  // sub-menus (Memory › Research) has an address of its own and stays the module.
  const isGroup = modules.some((c) => bare(c.href) === bare(top.href));
  const owner = isGroup
    ? (modules.find((c) => starts(c.href)) ?? modules.find((c) => c.children!.some(deep)))
    : undefined;
  if (owner) {
    return { row: owner, siblings: (top.children ?? []).filter(isDestination), groupLabel: top.label };
  }
  return { row: top, siblings: nav.filter(isDestination) };
}

/** "Agents" → "Agent", "Categories" → "Category": the kind of a record under a list. */
export function singularKind(plural: string | undefined): string | undefined {
  const p = (plural ?? "").trim();
  if (!p) return undefined;
  if (/ies$/i.test(p)) return `${p.slice(0, -3)}y`;
  if (/s$/i.test(p) && !/ss$/i.test(p)) return p.slice(0, -1);
  return p;
}

function prettySegment(segment: string): string {
  return humanizeIdentifier(segment.replace(/[\[\].]/g, " ").trim()) || segment;
}

export function deriveTrail(input: DeriveTrailInput): Crumb[] {
  const { nav, records = {}, overrides = TRAIL_LABEL_OVERRIDES, loadSiblings, isPageless = manifestPageless } = input;
  const segments = bare(input.pathname).split("/").filter(Boolean);
  const index = navIndex(nav);
  const crumbs: Crumb[] = [];
  let parentLabel: string | undefined;

  segments.forEach((segment, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const isLast = i === segments.length - 1;
    const override = trailOverrideFor(href, overrides);
    const record = records[href];

    // Menu knowledge for this level.
    let navHit: NavHit | undefined;
    let moduleRow: TrailNavNode | undefined;
    const moduleHit = i === 0 ? moduleFor(nav, segment) : undefined;
    if (moduleHit) moduleRow = moduleHit.row;
    else navHit = index.get(href);

    let label: string;
    let recordId: Crumb["recordId"];
    if (override === null) {
      return; // hidden level
    } else if (typeof override === "string") {
      label = override;
    } else if (record?.label) {
      label = record.label;
    } else if (moduleRow) {
      label = moduleRow.label;
    } else if (navHit) {
      label = navHit.node.label;
    } else if (segment === "all" && parentLabel) {
      label = `All ${parentLabel}`;
    } else if (isUuidShape(segment)) {
      // No key, no name column: the id through the one id component.
      label = singularKind(parentLabel) ?? "Record";
      recordId = { value: segment, token: record?.token ?? undefined, kind: label };
    } else {
      label = prettySegment(segment);
    }

    // Siblings for this level's dropdown.
    let options: CrumbOption[] | undefined;
    let optionsLabel = record?.optionsLabel;
    let loadOptions: Crumb["loadOptions"];
    if (record?.options) {
      options = record.options;
    } else if (record?.loadOptions) {
      loadOptions = record.loadOptions;
      optionsLabel = optionsLabel ?? parentLabel;
    } else if (moduleHit) {
      options = moduleHit.siblings.map((n) => ({ label: n.label, href: n.href, active: n === moduleRow }));
      optionsLabel = moduleHit.groupLabel ?? "Menu";
    } else if (navHit && navHit.siblings.length > 1) {
      options = navHit.siblings.map((n) => ({
        label: n.label,
        href: n.href,
        active: bare(n.href) === href,
      }));
      optionsLabel = `${parentLabel ?? "Menu"}`;
    } else if (!recordId && loadSiblings && i > 0) {
      const parentHref = `/${segments.slice(0, i).join("/")}`;
      loadOptions = () => loadSiblings(parentHref, segment);
      optionsLabel = parentLabel;
    }

    // EVERY CRUMB IS A REAL DOOR (Arman, 2026-10-22): a level whose address has no page of its own
    // (`…/smart-add/validate`, parent of `/validate/<id>`) is no crumb at all — a link there is a 404
    // and text there is a dead end. Its name still tells the next level what kind it is.
    if (!isLast && !moduleRow && isPageless(href)) {
      parentLabel = label;
      return;
    }

    crumbs.push({
      label,
      at: href,
      // A module's crumb opens where the menu opens it (its list), not the bare address.
      href: isLast ? undefined : (moduleRow?.href ?? href),
      options,
      optionsLabel,
      loadOptions,
      recordId,
      optionsAllHref: record?.optionsAllHref,
      optionsAllLabel: record?.optionsAllLabel,
    });
    parentLabel = label;
  });

  // Never the same level twice: a level that repeats the next one (a list page named like its
  // section, "Brands › Brands") gives way to it — the same rule the new frame applies.
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return crumbs.filter((c, i) => i === crumbs.length - 1 || c.recordId || !same(c.label, crumbs[i + 1]!.label));
}
