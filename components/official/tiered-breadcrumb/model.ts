// components/official/tiered-breadcrumb/model.ts — THE TIERED BREADCRUMB'S DATA (no React).
//
// Notion's breadcrumb: a segment opens "Other pages in <parent>" (tier 1); hovering a page shows
// the databases it holds (tier 2); hovering a database shows its saved views (tier 3). Every row
// navigates. This file is the shape every host fills and the pure rules the menu and the phone
// sheet share: which siblings show before "N more", the search over the rest, and the one lazy
// read per item (load law: read only what is shown, once).

import type { ReactNode } from "react";

/** One row in any tier: a page, a database on a page, or a database's view. */
export interface TieredItem {
  id: string;
  label: string;
  /** The item's own icon (a page's emoji/picture, a Lucide icon); absent = the tier's default. */
  icon?: ReactNode;
  /** Where a click goes. */
  href: string;
  /** The page this breadcrumb segment stands for (marked in its siblings list). */
  current?: boolean;
  /** The next tier, already known (a database's views ride with the page that holds it). */
  children?: readonly TieredItem[];
  /** false = this item never has a next tier (no chevron, no read). */
  expandable?: boolean;
}

/** Tier 1 for one segment: its siblings and the heading over them. */
export interface TieredSiblings {
  /** "Other pages in Client Hub". */
  heading: string;
  items: readonly TieredItem[];
}

/** One breadcrumb segment. */
export interface TieredSegment {
  id: string;
  label: string;
  icon?: ReactNode;
  href: string;
  /** Tier 1, read when the segment's menu opens. Absent = the segment is a plain link. */
  siblings?: () => Promise<TieredSiblings>;
}

/** Tier 2 for an item without known children, read when its submenu first opens. */
export type TieredChildrenLoader = (item: TieredItem) => Promise<readonly TieredItem[]>;

/** How many siblings show before "N more" (Notion shows a handful). */
export const SIBLINGS_SHOWN = 5;

/**
 * The siblings drawn before "N more": the first `cap`, always including the current page (it
 * takes the last slot when it sits further down). `more` = how many are left for the search.
 */
export function capSiblings(items: readonly TieredItem[], cap = SIBLINGS_SHOWN): { shown: TieredItem[]; more: number } {
  if (items.length <= cap) return { shown: [...items], more: 0 };
  const head = items.slice(0, cap);
  const current = items.find((item) => item.current);
  if (current && !head.includes(current)) head[cap - 1] = current;
  return { shown: head, more: items.length - cap };
}

/** The search over every sibling: case-insensitive, every word must appear. */
export function filterItems(items: readonly TieredItem[], query: string): TieredItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...items];
  return items.filter((item) => {
    const label = item.label.toLowerCase();
    return words.every((word) => label.includes(word));
  });
}

/** Whether an item may have a next tier (a chevron and a hover submenu). */
export function hasNextTier(item: TieredItem, loader: TieredChildrenLoader | undefined): boolean {
  if (item.expandable === false) return false;
  if (item.children) return item.children.length > 0;
  return Boolean(loader);
}

/**
 * ONE READ PER KEY. A menu that closes and opens again, or a page hovered twice, asks once; a
 * failed read is forgotten so the next open tries again.
 */
export function createLoadCache<T>() {
  const held = new Map<string, Promise<T>>();
  return {
    load(key: string, read: () => Promise<T>): Promise<T> {
      const known = held.get(key);
      if (known) return known;
      const next = read().catch((error: unknown) => {
        held.delete(key);
        throw error;
      });
      held.set(key, next);
      return next;
    },
    forget(key?: string) {
      if (key === undefined) held.clear();
      else held.delete(key);
    },
  };
}
