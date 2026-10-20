// features/launchpad/widgets/catalog.ts — WHAT EACH LAUNCHPAD WIDGET IS, without its body.
//
// Pure (no React bodies), so the launchpad agent tools, the Add panel and the version notes read the same
// `describe` lines the page does. `registry.tsx` attaches each body. Adding a widget = one entry here + one
// body in the registry; `__tests__/registry.test.ts` fails when an entry lacks a section, sizes, describe
// or a body.
//
// Sizes are 12-column grid units with 24px rows (GridCanvas): w 3 = a quarter of the desktop width,
// h 10 ≈ 240px. The Start widgets' old s / m / l are w 3 / 6 / 12 (`START_SIZE_WIDTH`).
import { AppWindow, CalendarDays, Clock, Compass, Gauge, LayoutDashboard, ListChecks, Rocket, Star, Table2, Blocks } from "lucide-react";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { METRIC_CARDS } from "@/features/dashboard/constants/metricCards";
import { USER_LAUNCHPAD_DESTINATIONS } from "../catalog";
import { configText, type LaunchpadWidgetSpec } from "./types";

/**
 * Where a count's tile opens. A count is read as "show me those": the conversation count opens the
 * conversation list, not a new chat (the dashboard's own card still starts one).
 */
const METRIC_HREF: Partial<Record<string, string>> = { conversations: "/work/conversations" };
export function startMetricHref(card: { key: string; href: string }): string {
  return METRIC_HREF[card.key] ?? card.href;
}

/** The kinds the `recent` widget offers (tokens of the search projection, `platform.search_items`). */
export const RECENT_KINDS = [
  { value: "conversation", label: "Conversations", one: "conversation" },
  { value: "note", label: "Notes", one: "note" },
  { value: "file", label: "Files", one: "file" },
  { value: "task", label: "Tasks", one: "task" },
  { value: "project", label: "Projects", one: "project" },
  { value: "document", label: "Documents", one: "document" },
] as const;

/** What a Meet Matrx widget shows (its `part`). Pure here so the agent tools read it without the body. */
export const MEET_MATRX_PART_OPTIONS = [
  { value: "studios", label: "The studios" },
  { value: "blocks", label: "The building blocks" },
  { value: "all", label: "Both" },
] as const;

export const DEFAULT_KPI_KEYS = "agents,conversations,knowledge_files,published_apps,notes,tasks";

const recentLabel = (token: string) => RECENT_KINDS.find((k) => k.value === token)?.label ?? (token || "items");
const metricLabel = (key: string) => METRIC_CARDS.find((c) => c.key === key)?.label ?? (key || "Metric");

/** The old Start sizes as desktop widths (a 4-column grid's 1 / 2 / 4 columns on a 12-column grid). */
export const START_SIZE_WIDTH = { s: 3, m: 6, l: 12 } as const;
export type StartSize = keyof typeof START_SIZE_WIDTH;

export const LAUNCHPAD_WIDGET_CATALOG: readonly LaunchpadWidgetSpec[] = [
  {
    type: "kpis",
    label: "Counts",
    icon: Gauge,
    section: "data",
    sizes: { defaultW: 12, defaultH: 5, minW: 6, minH: 4, maxH: 8 },
    defaultConfig: { keys: DEFAULT_KPI_KEYS },
    fields: [{ key: "keys", label: "Counts", picker: "metricKeys" }],
    describe: (c) => {
      const n = configText(c, "keys")
        .split(",")
        .filter((k) => METRIC_CARDS.some((m) => m.key === k.trim())).length;
      return n ? `Your counts (${n})` : "Your counts";
    },
  },
  {
    type: "metric",
    label: "Count",
    icon: Gauge,
    section: "data",
    sizes: { defaultW: 3, defaultH: 5, minW: 2, minH: 4, maxH: 8 },
    defaultConfig: { metric: "agents" },
    fields: [{ key: "metric", label: "Count", options: METRIC_CARDS.map((c) => ({ value: c.key, label: c.label })) }],
    describe: (c) => `${metricLabel(configText(c, "metric"))} count`,
  },
  {
    type: "recent",
    label: "Recent",
    icon: Clock,
    section: "work",
    sizes: { defaultW: 6, defaultH: 11, minW: 3, minH: 6 },
    defaultConfig: { kind: "conversation" },
    fields: [{ key: "kind", label: "Kind", options: RECENT_KINDS.map((k) => ({ value: k.value, label: k.label })) }],
    describe: (c) => `Recent ${recentLabel(configText(c, "kind")).toLowerCase()}`,
    publishes: [{ key: "selected", label: "Selected item", kind: "record" }],
    accepts: [{ key: "search", label: "Search", kind: "text" }],
  },
  {
    type: "tasks",
    label: "Tasks",
    icon: ListChecks,
    section: "work",
    sizes: { defaultW: 6, defaultH: 11, minW: 3, minH: 6 },
    defaultConfig: {},
    fields: [],
    describe: () => "Open and overdue tasks",
    href: () => "/tasks",
    publishes: [{ key: "selected", label: "Selected task", kind: "record" }],
    accepts: [{ key: "filter", label: "Filter", kind: "text" }],
  },
  {
    type: "agenda",
    label: "Today",
    icon: CalendarDays,
    section: "meetings",
    sizes: { defaultW: 6, defaultH: 11, minW: 3, minH: 6 },
    defaultConfig: {},
    fields: [],
    describe: () => "Today's meetings",
  },
  {
    type: "favorites",
    label: "Favorites",
    icon: Star,
    section: "work",
    sizes: { defaultW: 3, defaultH: 11, minW: 3, minH: 6 },
    defaultConfig: {},
    fields: [],
    describe: () => "Pinned pages",
  },
  {
    type: "agents",
    label: "Agents",
    icon: AGENT_ICON,
    section: "ai",
    sizes: { defaultW: 3, defaultH: 11, minW: 3, minH: 6 },
    defaultConfig: {},
    fields: [],
    describe: () => "Pinned agents",
  },
  {
    type: "page",
    label: "Data page",
    icon: LayoutDashboard,
    section: "data",
    sizes: { defaultW: 12, defaultH: 22, minW: 4, minH: 10 },
    defaultConfig: {},
    fields: [{ key: "pageId", label: "Page", picker: "dataPage" }],
    describe: (c) => (configText(c, "pageId") ? "One of your data pages" : "Data page (none chosen)"),
  },
  {
    type: "table",
    label: "Table",
    icon: Table2,
    section: "data",
    sizes: { defaultW: 6, defaultH: 11, minW: 3, minH: 6 },
    defaultConfig: {},
    fields: [{ key: "tableId", label: "Table", picker: "dataTable" }],
    describe: (c) => (configText(c, "tableId") ? "First rows of one of your tables" : "Table (none chosen)"),
    publishes: [
      { key: "selected", label: "Selected row", kind: "record" },
      { key: "rows", label: "Shown rows", kind: "rows" },
    ],
  },
  {
    type: "applet",
    label: "Applet",
    icon: Blocks,
    section: "ai",
    sizes: { defaultW: 6, defaultH: 18, minW: 3, minH: 8 },
    defaultConfig: {},
    fields: [{ key: "appId", label: "Applet", picker: "applet" }],
    describe: (c) => configText(c, "name") || (configText(c, "appId") ? "Applet" : "Applet (none chosen)"),
    // The Applet reads these with `useValue("in_record")` and publishes with `useValue("out_record")`'s setter.
    publishes: [
      { key: "out_record", label: "Record it picks", kind: "record" },
      { key: "out_text", label: "Text it sets", kind: "text" },
    ],
    accepts: [
      { key: "in_record", label: "Record", kind: "record" },
      { key: "in_file", label: "File", kind: "file" },
      { key: "in_text", label: "Text", kind: "text" },
    ],
  },
  {
    type: "launchpad_link",
    label: "Launchpad link",
    icon: Rocket,
    section: "work",
    sizes: { defaultW: 3, defaultH: 4, minW: 2, minH: 3, maxH: 8 },
    defaultConfig: {},
    fields: [{ key: "key", label: "Launchpad", picker: "launchpad" }],
    describe: (c) => configText(c, "title") || (configText(c, "key") ? `Launchpad ${configText(c, "key")}` : "Launchpad (none chosen)"),
    href: (c) => (configText(c, "key") ? `/launchpad/${encodeURIComponent(configText(c, "key"))}` : null),
  },
  {
    type: "app_page",
    label: "App page",
    icon: AppWindow,
    section: "media",
    sizes: { defaultW: 6, defaultH: 20, minW: 3, minH: 8 },
    defaultConfig: {},
    fields: [{ key: "path", label: "Page address", picker: "appPage" }],
    describe: (c) => (configText(c, "path") ? appPageLabel(configText(c, "path")) : "App page (none chosen)"),
    href: (c) => configText(c, "path") || null,
    accepts: [{ key: "record", label: "Record to open", kind: "record" }],
  },
  {
    // The Meet Matrx stage's cards (the welcome screen's studios and building blocks), each a door to its place.
    type: "meet_matrx",
    label: "Meet Matrx",
    icon: Compass,
    section: "work",
    sizes: { defaultW: 12, defaultH: 13, minW: 4, minH: 6 },
    defaultConfig: { part: "studios" },
    fields: [{ key: "part", label: "Show", options: MEET_MATRX_PART_OPTIONS }],
    describe: (c) => `Meet Matrx: ${(MEET_MATRX_PART_OPTIONS.find((p) => p.value === configText(c, "part")) ?? MEET_MATRX_PART_OPTIONS[0]).label.toLowerCase()}`,
    href: () => "/meet-matrx",
  },
];

/** A page's friendly name: the app's own label for that address (an area before a shortcut), else its last
 *  path word — never the raw path. */
export function appPageLabel(path: string): string {
  const bare = path.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  const same = USER_LAUNCHPAD_DESTINATIONS.filter((d) => d.href.split(/[?#]/)[0] === bare);
  return (same.find((d) => d.kind === "area") ?? same.find((d) => d.kind === "destination"))?.label ?? lastWord(bare);
}

function lastWord(path: string): string {
  const last = path.split("/").filter(Boolean).pop();
  if (!last || /^[0-9a-f-]{20,}$/i.test(last)) return "App page";
  const words = decodeURIComponent(last).replace(/[-_]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function getLaunchpadWidgetSpec(type: string): LaunchpadWidgetSpec | undefined {
  return LAUNCHPAD_WIDGET_CATALOG.find((w) => w.type === type);
}

/** One line for any widget, known or not (the version notes and the agent read this). */
export function describeLaunchpadWidget(widget: { type: string; config: Readonly<Record<string, unknown>> }): string {
  const spec = getLaunchpadWidgetSpec(widget.type);
  return spec ? spec.describe(widget.config) : `Unavailable widget "${widget.type}"`;
}
