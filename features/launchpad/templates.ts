// features/launchpad/templates.ts — STARTING LAUNCHPADS BY ROLE (custom-experience §5.6 Templates).
//
// Each template is a real LaunchpadDoc built from registered widgets (catalog.ts), placed on the 12-column
// grid. "Default" is today's launcher: the static /launchpad page stays where it is, so choosing Default makes
// an empty launchpad that links back to it. A template is a starting point: "New launchpad" copies it into
// the person's own row, which they then tune.
//
// Not the labeled-template mechanism (features/spaces/state/templates.ts): that labels ENTITY rows (a Space,
// a board) through `platform.associations`, and a launchpad is a typed-table record with no entity token to
// label. "Duplicate" on any launchpad is the per-person "save as a starting point" until that exists.
import { Briefcase, Clapperboard, Gavel, LayoutGrid, Rocket, TrendingUp, Users, type LucideIcon } from "lucide-react";
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";
import { EMPTY_LAUNCHPAD_DOC, addWidget } from "./doc";
import { DEFAULT_KPI_KEYS } from "./widgets/catalog";

export interface LaunchpadTemplate {
  id: string;
  title: string;
  /** One line for the picker (≤60 characters). */
  hint: string;
  icon: LucideIcon;
  doc: () => LaunchpadDoc;
}

type Placed = { type: string; config?: Record<string, unknown>; w?: number; h?: number; id?: string };

/** Widgets in reading order, packed onto the grid by the same verb the editor uses. */
function build(widgets: readonly Placed[]): LaunchpadDoc {
  let doc = EMPTY_LAUNCHPAD_DOC;
  widgets.forEach((w, i) => {
    doc = addWidget(doc, { ...w, id: w.id ?? `w_${i}_${w.type}` }, doc.widgets.length);
  });
  return doc;
}

/** The first-visit Start launchpad (today's Start page layout, on the new grid). */
export function startLaunchpadDoc(): LaunchpadDoc {
  return build([
    { id: "w_kpis", type: "kpis", config: { keys: DEFAULT_KPI_KEYS }, w: 12 },
    { id: "w_tasks", type: "tasks", w: 6 },
    { id: "w_agenda", type: "agenda", w: 6 },
    { id: "w_recent_chats", type: "recent", config: { kind: "conversation" }, w: 6 },
    { id: "w_favorites", type: "favorites", w: 3 },
    { id: "w_agents", type: "agents", w: 3 },
  ]);
}

export const LAUNCHPAD_TEMPLATES: readonly LaunchpadTemplate[] = [
  {
    id: "default",
    title: "Default",
    hint: "Empty, with a door back to the full launcher",
    icon: LayoutGrid,
    doc: () => build([{ type: "favorites", w: 6 }, { type: "app_page", config: { path: "/launchpad" }, w: 12, h: 24 }]),
  },
  {
    id: "founder",
    title: "Founder",
    hint: "Counts, tasks, today and your agents",
    icon: Rocket,
    doc: () =>
      build([
        { type: "kpis", config: { keys: DEFAULT_KPI_KEYS }, w: 12 },
        { type: "tasks", w: 4 },
        { type: "agenda", w: 4 },
        { type: "agents", w: 4 },
        { type: "recent", config: { kind: "project" }, w: 6 },
        { type: "recent", config: { kind: "conversation" }, w: 6 },
      ]),
  },
  {
    id: "sales",
    title: "Sales",
    hint: "Meetings, follow-ups and your pipeline pages",
    icon: TrendingUp,
    doc: () =>
      build([
        { type: "agenda", w: 6 },
        { type: "tasks", w: 6 },
        { type: "app_page", config: { path: "/crm" }, w: 12, h: 22 },
        { type: "recent", config: { kind: "conversation" }, w: 6 },
        { type: "favorites", w: 6 },
      ]),
  },
  {
    id: "attorney",
    title: "Attorney",
    hint: "Documents, files and today's matters",
    icon: Gavel,
    doc: () =>
      build([
        { type: "agenda", w: 4 },
        { type: "tasks", w: 4 },
        { type: "favorites", w: 4 },
        { type: "recent", config: { kind: "document" }, w: 6 },
        { type: "recent", config: { kind: "file" }, w: 6 },
        { type: "agents", w: 6 },
      ]),
  },
  {
    id: "hr",
    title: "HR",
    hint: "People work, meetings and your tables",
    icon: Users,
    doc: () =>
      build([
        { type: "app_page", config: { path: "/hr" }, w: 12, h: 22 },
        { type: "agenda", w: 6 },
        { type: "tasks", w: 6 },
        { type: "table", w: 6 },
        { type: "recent", config: { kind: "document" }, w: 6 },
      ]),
  },
  {
    id: "creator",
    title: "Creator",
    hint: "Notes, files, Applets and agents",
    icon: Clapperboard,
    doc: () =>
      build([
        { type: "recent", config: { kind: "note" }, w: 6 },
        { type: "recent", config: { kind: "file" }, w: 6 },
        { type: "applet", w: 8, h: 18 },
        { type: "agents", w: 4, h: 18 },
      ]),
  },
  {
    id: "blank",
    title: "Blank",
    hint: "Start empty and add widgets",
    icon: Briefcase,
    doc: () => EMPTY_LAUNCHPAD_DOC,
  },
];

export function launchpadTemplate(id: string): LaunchpadTemplate | undefined {
  return LAUNCHPAD_TEMPLATES.find((t) => t.id === id);
}
