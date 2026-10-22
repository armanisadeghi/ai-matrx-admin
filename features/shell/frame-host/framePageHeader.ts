"use client";

// THE PAGE HANDS ITS CRUMBS TO THE FRAME (owner, 2026-10-22: the new header is enforced in frame mode).
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
import type { FrameCrumb, FrameProduct } from "@/features/shell/frame/types";

export interface FramePageCrumbOption {
  label: string;
  href: string;
  active?: boolean;
}

/** One level of the page's trail (the template's `Crumb`, minus what only the classic row draws). */
export interface FramePageCrumb {
  label: string;
  href?: string;
  options?: readonly FramePageCrumbOption[];
  optionsLabel?: string;
  optionsAllHref?: string;
  optionsAllLabel?: string;
}

export interface FramePageHeaderHost {
  /**
   * Declare the page's trail; returns the release. The newest page declaration wins; a `fallback`
   * one (a layout's trail that yields to a deeper page header) counts only when no page declared.
   */
  declareCrumbs: (crumbs: readonly FramePageCrumb[], options?: { fallback?: boolean }) => () => void;
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
export function useFramePageHeaderHost(): { host: FramePageHeaderHost; pageCrumbs: readonly FramePageCrumb[] | null } {
  const [declarations, setDeclarations] = useState<readonly Declaration[]>([]);
  const [host] = useState<FramePageHeaderHost>(() => {
    let next = 0;
    return {
      declareCrumbs: (crumbs, options) => {
        const key = next++;
        setDeclarations((list) => [...list, { key, crumbs, fallback: Boolean(options?.fallback) }]);
        return () => setDeclarations((list) => list.filter((d) => d.key !== key));
      },
    };
  });
  return { host, pageCrumbs: pickPageCrumbs(declarations) };
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
    },
    ...levels.map((level, i): FrameCrumb => {
      const isLast = i === levels.length - 1;
      const href = isLast ? undefined : level.href;
      return {
        id: `page-${i}`,
        label: level.label,
        href,
        onSelect: href ? () => go(href) : undefined,
        options: level.options?.map((o) => ({ ...o, onSelect: () => go(o.href) })),
        optionsLabel: level.optionsLabel,
        optionsAllHref: level.optionsAllHref,
        optionsAllLabel: level.optionsAllLabel,
      };
    }),
  ];
}
