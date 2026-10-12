/**
 * Builder panel — derived reads over `adminDebug.builderFeeds`. FEATURE: ./FEATURE.md.
 */
import { createSelector } from "@reduxjs/toolkit";
import { selectBuilderFeeds } from "@/lib/redux/preferences/adminDebugSlice";
import type { BuilderEntry, BuilderFeed, BuilderRef } from "./types";

const EMPTY: BuilderFeed[] = [];

/** Every feed, most recently updated first. */
export const selectBuilderFeedList = createSelector([selectBuilderFeeds], (feeds): BuilderFeed[] => {
  const list = Object.values(feeds);
  return list.length ? list.sort((a, b) => b.updatedAt - a.updatedAt) : EMPTY;
});

/** The feeds published from this pathname (what "this page" has). */
export function feedsForRoute(feeds: BuilderFeed[], pathname: string | null): BuilderFeed[] {
  if (!pathname) return EMPTY;
  return feeds.filter((f) => f.route === pathname);
}

/** Entries in published order. */
export function feedEntries(feed: BuilderFeed | null | undefined): BuilderEntry[] {
  if (!feed) return [];
  return feed.order.map((k) => feed.entries[k]).filter((e): e is BuilderEntry => Boolean(e));
}

/** Entries pointing at a record of one type (the tabs). */
export function refsOf<T extends BuilderRef["type"]>(
  entries: BuilderEntry[],
  type: T,
): { entry: BuilderEntry; ref: Extract<BuilderRef, { type: T }> }[] {
  const out: { entry: BuilderEntry; ref: Extract<BuilderRef, { type: T }> }[] = [];
  for (const entry of entries) {
    if (entry.ref?.type === type) out.push({ entry, ref: entry.ref as Extract<BuilderRef, { type: T }> });
  }
  return out;
}

/** The whole feed as one plain object (the feed-level copy). */
export function feedSnapshot(feed: BuilderFeed): Record<string, unknown> {
  return {
    surface: feed.surfaceKey,
    route: feed.route,
    updatedAt: new Date(feed.updatedAt).toISOString(),
    entries: feedEntries(feed).map((e) => ({
      key: e.key,
      label: e.label,
      group: e.group,
      source: e.source ?? null,
      certainty: e.certainty ?? null,
      kind: e.kind ?? null,
      ref: e.ref ?? null,
      at: new Date(e.at).toISOString(),
      data: e.data,
    })),
  };
}
