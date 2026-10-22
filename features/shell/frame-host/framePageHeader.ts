"use client";

// THE PAGE HANDS ITS CRUMBS AND ITS "…" ITEMS TO THE FRAME (owner, 2026-10-22: the new header is
// enforced in frame mode). The record a page shows is NOT declared here: the frame reads the
// current-record primitive (features/shell/current-record) every record header already declares.
//
// In the new app frame the header row's crumb trail is the frame's (SheetHeader). A page-top
// template (EntityModeHeader / RecordPageHeader, CrumbTrailHeader, DerivedBreadcrumb on a list page)
// knows the page's REAL trail; in frame mode it declares that trail here instead of drawing its own
// title row, and puts only its modes and actions into the header slot. FrameHostImpl provides the
// host and swaps the route-table crumbs for the page's. Outside the frame there is no host, the hook
// answers `false`, and every template renders exactly as before.
//
// Tiny and eager on purpose: the classic templates import it, so it carries nothing of the frame.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { FrameAction, FrameCrumb, FrameCrumbDoor, FrameDoorSearchEntry, FrameProduct } from "@/features/shell/frame/types";

export interface FramePageCrumbOption {
  label: string;
  href: string;
  active?: boolean;
}

/** One level of the page's trail (the template's `Crumb`, minus what only the classic row draws). */
export interface FramePageCrumb {
  label: string;
  /**
   * Where the crumb goes. On a template's LAST level it is the template's own address
   * (`useOwnAddress`): when that is an ancestor of the page shown (a header kept in a layout), the
   * level is a link and the levels below it come from the address (`resolvePageTrail`).
   */
  href?: string;
  /** The level's own address (derived trails) — how the levels above and below a template are found. */
  at?: string;
  options?: readonly FramePageCrumbOption[];
  optionsLabel?: string;
  optionsAllHref?: string;
  optionsAllLabel?: string;
  /** Siblings fetched when the level's door first opens (a record's list, the route tree). */
  loadOptions?: () => Promise<readonly FramePageCrumbOption[]>;
}

export interface FramePageHeaderHost {
  /**
   * Declare the page's trail; returns the release. The newest page declaration wins; a `fallback`
   * one (a layout's trail that yields to a deeper page header) counts only when no page declared.
   */
  declareCrumbs: (crumbs: readonly FramePageCrumb[], options?: { fallback?: boolean }) => () => void;
  /**
   * Declare the page's own "…" items (a record's Actions menu, a phone header's overflow); returns
   * the release. Every live declaration is listed, oldest first, before the frame's defaults.
   */
  declareActions: (actions: readonly FrameAction[]) => () => void;
}

export const FramePageHeaderContext = createContext<FramePageHeaderHost | null>(null);

/** True inside the new app frame's host. */
export function useInFrame(): boolean {
  return useContext(FramePageHeaderContext) != null;
}

const crumbKey = (crumbs: readonly FramePageCrumb[] | null) =>
  crumbs
    ? JSON.stringify(
        crumbs.map((c) => [
          c.label,
          c.href ?? null,
          c.options?.map((o) => [o.label, o.href, Boolean(o.active)]) ?? null,
          c.optionsLabel ?? null,
          c.optionsAllHref ?? null,
          c.optionsAllLabel ?? null,
        ]),
      )
    : null;

/**
 * Hand the page's trail to the frame for as long as the caller is mounted. Answers whether a frame
 * took it (true = the caller draws no title row of its own). `null` crumbs declare nothing.
 */
export function useDeclareFrameCrumbs(
  crumbs: readonly FramePageCrumb[] | null,
  options?: { fallback?: boolean },
): boolean {
  const host = useContext(FramePageHeaderContext);
  const latest = useRef(crumbs);
  useEffect(() => {
    latest.current = crumbs;
  });
  // The effect re-runs only when what the trail SAYS changes (a fresh array each render is not a change).
  const key = host ? crumbKey(crumbs) : null;
  const fallback = Boolean(options?.fallback);
  useEffect(() => {
    if (!host || key == null || !latest.current) return;
    return host.declareCrumbs(latest.current, { fallback });
  }, [host, key, fallback]);
  return host != null;
}

const actionKey = (actions: readonly FrameAction[] | null) =>
  actions && actions.length > 0
    ? JSON.stringify(actions.map((a) => [a.id, a.label, Boolean(a.destructive), Boolean(a.disabled)]))
    : null;

/**
 * Hand the page's own "…" items to the frame for as long as the caller is mounted (merged with the
 * frame's Copy link / Open in new tab). Answers whether a frame took them (true = the caller draws
 * no menu of its own for them). A press always runs the caller's LATEST handler.
 */
export function useDeclareFrameActions(actions: readonly FrameAction[] | null): boolean {
  const host = useContext(FramePageHeaderContext);
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });
  const key = host ? actionKey(actions) : null;
  useEffect(() => {
    if (!host || key == null || !latest.current) return;
    return host.declareActions(
      latest.current.map((a) => ({
        ...a,
        onSelect: () => latest.current?.find((now) => now.id === a.id)?.onSelect(),
      })),
    );
  }, [host, key]);
  return host != null;
}

interface Declaration {
  key: number;
  crumbs: readonly FramePageCrumb[];
  fallback: boolean;
}

/** The trail the page declared, or null: the newest page declaration, else the newest fallback. */
export function pickPageCrumbs(declarations: readonly Declaration[]): readonly FramePageCrumb[] | null {
  for (let i = declarations.length - 1; i >= 0; i--) if (!declarations[i].fallback) return declarations[i].crumbs;
  const last = declarations[declarations.length - 1];
  return last ? last.crumbs : null;
}

/** The host half (FrameHostImpl): the context value to provide and the page's current trail. */
export function useFramePageHeaderHost(): {
  host: FramePageHeaderHost;
  pageCrumbs: readonly FramePageCrumb[] | null;
  pageActions: readonly FrameAction[];
} {
  const [declarations, setDeclarations] = useState<readonly Declaration[]>([]);
  const [actionDeclarations, setActionDeclarations] = useState<
    readonly { key: number; actions: readonly FrameAction[] }[]
  >([]);
  const [host] = useState<FramePageHeaderHost>(() => {
    let next = 0;
    return {
      declareCrumbs: (crumbs, options) => {
        const key = next++;
        setDeclarations((list) => [...list, { key, crumbs, fallback: Boolean(options?.fallback) }]);
        return () => setDeclarations((list) => list.filter((d) => d.key !== key));
      },
      declareActions: (actions) => {
        const key = next++;
        setActionDeclarations((list) => [...list, { key, actions }]);
        return () => setActionDeclarations((list) => list.filter((d) => d.key !== key));
      },
    };
  });
  return {
    host,
    pageCrumbs: pickPageCrumbs(declarations),
    pageActions: uniqueActions(actionDeclarations.flatMap((d) => d.actions)),
  };
}

/**
 * One row per action id, in first-declared order. A header mounted twice (a compact and a full
 * layout switched by CSS, both live) declares the same list twice; "…" lists each action once.
 */
export function uniqueActions(actions: readonly FrameAction[]): FrameAction[] {
  const seen = new Set<string>();
  return actions.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

/** A template crumb (`Crumb` from the derived trail) as the frame's crumb data; classic-only drawing hints stay behind. */
export function frameCrumbOf(crumb: FramePageCrumb): FramePageCrumb {
  return {
    label: crumb.label,
    href: crumb.href,
    at: crumb.at,
    options: crumb.options,
    optionsLabel: crumb.optionsLabel,
    optionsAllHref: crumb.optionsAllHref,
    optionsAllLabel: crumb.optionsAllLabel,
    loadOptions: crumb.loadOptions,
  };
}

/**
 * THE FRAME'S ONE CRUMB DERIVATION: the trail the page declared, else the trail derived from the
 * address (`useDerivedTrail` — the same derivation every page-top template declares), both drawn
 * through `pageTrailCrumbs`. The route table no longer names crumbs; it only picks the product.
 */
export function frameHostCrumbs(
  product: FrameProduct,
  declared: readonly FramePageCrumb[] | null,
  derived: readonly FramePageCrumb[],
  go: (href: string) => void,
  pathname?: string,
  doors?: CrumbDoorSources,
): FrameCrumb[] {
  return pageTrailCrumbs(product, resolvePageTrail(declared, derived.map(frameCrumbOf), pathname), go, doors);
}

/** What the host gives the trail's doors: every product, and the full page index for their search. */
export interface CrumbDoorSources {
  products: readonly FrameProduct[];
  loadSearchIndex?: () => Promise<readonly FrameDoorSearchEntry[]>;
}

/** The product's first-tier places (its sidebar rows), the current level's row active. */
export function productPlaces(product: FrameProduct, currentHref?: string): FrameCrumbDoor["options"] {
  const bare = (h: string) => h.split(/[?#]/, 1)[0]!.replace(/\/+$/, "");
  return product.menu.flatMap((section) =>
    section.items
      .filter((item) => !item.external)
      .map((item) => {
        const href = item.href ?? `${product.homeHref}/${item.id}`;
        return { label: item.label, href, icon: item.icon, active: currentHref != null && bare(href) === bare(currentHref) };
      }),
  );
}

const bareAddress = (href: string) => `/${href.split(/[?#]/, 1)[0]!.split("/").filter(Boolean).join("/")}`;
const isBelow = (child: string, parent: string) => child !== parent && child.startsWith(parent === "/" ? "/" : `${parent}/`);
const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * EVERY CRUMB IS A REAL DOOR (Arman, 2026-10-22: "I don't want fake things!!"). The page's declared
 * trail, completed from the address-derived one so no level is text that goes nowhere:
 * - a template kept in a LAYOUT declares its own address on its last level; when the page shown is
 *   deeper, that level links back to it and the derived levels below it follow (Smart Add brand ›
 *   Validate on /marketing/brands/smart-add/validate/<id>);
 * - a template that declared only its own level gets the derived levels above it (Marketing › Brands);
 * - an ancestor declared without an address takes the derived level of the same name, else is
 *   dropped (a crumb that cannot open is not drawn).
 * No declaration: the derived trail.
 */
export function resolvePageTrail(
  declared: readonly FramePageCrumb[] | null,
  derived: readonly FramePageCrumb[],
  pathname?: string,
): FramePageCrumb[] {
  if (!declared || declared.length === 0) return [...derived];
  const here = pathname ? bareAddress(pathname) : null;
  const last = declared[declared.length - 1]!;
  const own = last.href ? bareAddress(last.href) : null;
  const inLayout = here != null && own != null && isBelow(here, own);
  const levelAt = (c: FramePageCrumb) => (c.at ? bareAddress(c.at) : null);
  const above =
    declared.length === 1 && own != null
      ? derived.filter((c) => {
          const at = levelAt(c);
          return at != null && isBelow(own, at);
        })
      : [];
  const below = inLayout
    ? derived.filter((c) => {
        const at = levelAt(c);
        return at != null && isBelow(at, own!);
      })
    : [];
  const ancestors = declared.slice(0, -1).flatMap((c): FramePageCrumb[] => {
    if (c.href) return [c];
    const match = derived.find((d) => d.href && sameLabel(d.label, c.label));
    return match?.href ? [{ ...c, href: match.href }] : [];
  });
  const self: FramePageCrumb = inLayout ? last : { ...last, href: undefined };
  return [...above, ...ancestors, self, ...below];
}

/**
 * The page's own trail (declared by its page-top template) as the frame's crumbs: the product's
 * icon first, then the page's levels; the page's root level is dropped when it only repeats the
 * product, and a level that repeats the next is dropped. The last level is the page itself (no link).
 */
export function pageTrailCrumbs(
  product: FrameProduct,
  trail: readonly FramePageCrumb[],
  go: (href: string) => void,
  doors?: CrumbDoorSources,
): FrameCrumb[] {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  // Never the same level twice: a level that repeats the next one (a list page named like its
  // section, "Brands › Brands") gives way to it.
  const distinct = trail.filter((level, i) => i === trail.length - 1 || !same(level.label, trail[i + 1].label));
  const levels = distinct.length > 1 && same(distinct[0].label, product.name) ? distinct.slice(1) : distinct;
  return [
    {
      id: "product",
      label: product.name,
      icon: product.icon,
      iconOnly: true,
      href: product.homeHref,
      onSelect: () => go(product.homeHref),
      // EVERY CRUMB IS A DOOR: the product icon lists every product (new tab, the app grid's rule;
      // the product you are in goes home here) and searches every page.
      door: doors
        ? {
            kind: "products",
            label: "Products",
            newTab: true,
            options: doors.products.map((p) => ({
              label: p.name,
              href: p.homeHref,
              icon: p.icon,
              active: p.id === product.id,
              onSelect: () => go(p.homeHref),
            })),
            loadSearchIndex: doors.loadSearchIndex,
          }
        : undefined,
    },
    ...levels.map((level, i): FrameCrumb => {
      const isLast = i === levels.length - 1;
      const href = isLast ? undefined : level.href;
      const levelHref = level.href ?? level.at;
      // The product's first level opens the product's first-tier places (+ search over everything).
      const places = i === 0 && doors ? productPlaces(product, levelHref) : undefined;
      return {
        id: `page-${i}`,
        label: level.label,
        href,
        onSelect: href ? () => go(href) : undefined,
        options: level.options?.map((o) => ({ ...o, onSelect: () => go(o.href) })),
        loadOptions: level.loadOptions,
        optionsLabel: level.optionsLabel,
        optionsAllHref: level.optionsAllHref,
        optionsAllLabel: level.optionsAllLabel,
        door:
          places && places.length > 0
            ? {
                kind: "places",
                label: product.name,
                options: places.map((o) => ({ ...o, onSelect: () => go(o.href) })),
                loadSearchIndex: doors?.loadSearchIndex,
              }
            : undefined,
      };
    }),
  ];
}
