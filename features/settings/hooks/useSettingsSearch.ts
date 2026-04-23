"use client";

import { useMemo } from "react";
import { settingsRegistry, getVisibleTabs } from "../registry";
import type { SettingsTabDef } from "../types";

export type SettingsSearchHit = {
  tab: SettingsTabDef;
  /** Field where the match occurred. */
  matchedIn: "label" | "description" | "keyword";
  /** The matched substring (for highlighting). */
  matchText: string;
};

/**
 * Searches the settings registry and returns ranked hits.
 * Results are ordered: label match > keyword match > description match,
 * preserving registry order within each bucket.
 */
export function useSettingsSearch(
  query: string,
  options?: { isAdmin?: boolean },
): SettingsSearchHit[] {
  const trimmed = query.trim().toLowerCase();
  const visible = useMemo(
    () => getVisibleTabs(options?.isAdmin ?? false),
    [options?.isAdmin],
  );

  return useMemo(() => {
    if (!trimmed) return [];
    const byLabel: SettingsSearchHit[] = [];
    const byKeyword: SettingsSearchHit[] = [];
    const byDescription: SettingsSearchHit[] = [];

    for (const tab of visible) {
      const label = tab.label.toLowerCase();
      if (label.includes(trimmed)) {
        byLabel.push({ tab, matchedIn: "label", matchText: trimmed });
        continue;
      }
      const kwHit = tab.searchKeywords?.find((k) =>
        k.toLowerCase().includes(trimmed),
      );
      if (kwHit) {
        byKeyword.push({ tab, matchedIn: "keyword", matchText: kwHit });
        continue;
      }
      if (tab.description?.toLowerCase().includes(trimmed)) {
        byDescription.push({
          tab,
          matchedIn: "description",
          matchText: trimmed,
        });
      }
    }

    return [...byLabel, ...byKeyword, ...byDescription];
  }, [trimmed, visible]);
}

/** Count of tabs that match the query (cheap, for tests / instrumentation). */
export function countSearchHits(query: string, isAdmin = false): number {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return 0;
  const visible = isAdmin
    ? settingsRegistry
    : settingsRegistry.filter((t) => !t.requiresAdmin);
  return visible.filter((t) => {
    if (t.label.toLowerCase().includes(trimmed)) return true;
    if (t.description?.toLowerCase().includes(trimmed)) return true;
    return t.searchKeywords?.some((k) => k.toLowerCase().includes(trimmed));
  }).length;
}
