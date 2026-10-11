import type { MyCostGroup, MyCostRecord } from "./myCostService";

/** The three ways the cost table can be read. */
export type MyCostTab = "feature" | "organization" | "day";

export interface MyCostDrill {
  feature: { key: string; label: string } | null;
  activity: { key: string; label: string } | null;
  day: string | null;
}
export const NO_DRILL: MyCostDrill = { feature: null, activity: null, day: null };

/** Which grouping the table shows: By activity goes feature -> activity; the others are one level. */
export function levelFor(tab: MyCostTab, drill: MyCostDrill): MyCostGroup {
  return tab === "feature" ? (drill.feature ? "activity" : "feature") : tab;
}

/** Where a click on a row's charge count leads. */
export function drillInto(
  tab: MyCostTab,
  drill: MyCostDrill,
  row: { key: string; label: string },
): { tab: MyCostTab; drill: MyCostDrill; organization?: { id: string; label: string } } {
  if (tab === "organization") return { tab: "feature", drill: NO_DRILL, organization: { id: row.key, label: row.label } };
  if (tab === "day") return { tab, drill: { ...NO_DRILL, day: row.key } };
  if (!drill.feature) return { tab, drill: { feature: { key: row.key, label: row.label }, activity: null, day: null } };
  return { tab, drill: { ...drill, activity: { key: row.key, label: row.label } } };
}

/** The one-day window a "By day" row opens (days are UTC, as the door groups them). */
export function dayWindow(day: string): { from: string; to: string } {
  const start = new Date(`${day}T00:00:00Z`);
  return { from: start.toISOString(), to: new Date(start.getTime() + 86_400_000).toISOString() };
}

/**
 * THE MONEY RULE: dollars exist only for an admin person (the door withholds `costUsd` from everyone
 * else), and then points sit beside them; a member reads points alone.
 */
export function costDisplay(usd: number | null, points: number): { primary: "usd" | "points"; usd: number | null; points: number } {
  return usd === null ? { primary: "points", usd: null, points } : { primary: "usd", usd, points };
}

const FEATURE_HOME: Record<string, string> = {
  ai_chat: "/chat",
  ai_agents: "/agents",
  research: "/research",
  social_data: "/marketing/social",
  web_search: "/scraper/search",
  messaging: "/messages",
  scraping: "/scraper",
  files: "/files",
  media: "/images",
  scheduled: "/schedules",
  batch: "/schedules",
  connected_services: "/agents",
};

/**
 * Where a charge opens what it was for. The exact record when its source names one, else the home of
 * its activity, so a row is never a dead end ("other" is the only row with no link).
 */
export function chargeHref(r: Pick<MyCostRecord, "feature" | "linkKind" | "linkId" | "conversationId">): string | null {
  const id = r.linkId && /^[0-9a-f-]{36}$/i.test(r.linkId) ? r.linkId : null;
  if (r.conversationId) return `/chat/${r.conversationId}`;
  switch (r.linkKind) {
    case "rs_topic": return id ? `/research/topics/${id}` : "/research";
    case "cld_file": return id ? `/files/f/${id}` : "/files";
    case "processed_document": return id ? `/documents/${id}` : "/documents";
    case "workflow": return id ? `/workflows/${id}` : "/workflows";
    case "sch_run": return "/schedules";
    case "web_site":
    case "web_crawl_session":
    case "scraper_data_fetch_job": return "/scraper";
    default: return FEATURE_HOME[r.feature] ?? null;
  }
}
