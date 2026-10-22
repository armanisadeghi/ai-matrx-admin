// THE RELATED PLACES OF EVERY PRODUCT (Arman, 2026-10-22: every product sidebar's top carries a few
// chosen related places, then "More" with the rest and "Edit sidebar…"; common-docs
// projects/app-frame/VISION.md). ONE declared list per product, in order; the first
// `DEFAULT_PLACES_ABOVE_MORE` sit above More by default (the system rung of the layered knob
// `shell.sidebar.places`: system → organization → person). Plain data, no React.
//
// A place is another PRODUCT (its live entry, its menu as the row's flyout) or one of the few PAGES
// below that people reach from many products (Agents, Workflows, Scheduled…). Defaults were picked
// from the TREE.md lineup and the cross-product link counts in route-flow.json (2026-10-22): e.g.
// CRM ↔ Marketing 62 links, Research ↔ Intelligence 42, Data ↔ Workspace 35, Memory ↔ Research 37.
// The conversation sidebar (Chat) carries its own list and knob (`chat.history.sidebar`); the
// Chat row here mirrors it for chat routes that are not the conversation sidebar.
import { CalendarClock, Folder, ListChecks, NotebookPen, Telescope, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AGENT_ICON } from "@ai-matrx/icons/domain";

/** How many declared places sit above More before anyone chooses. */
export const DEFAULT_PLACES_ABOVE_MORE = 3;

/** The layered knob holding, per product id, the place ids above More. */
export const SIDEBAR_PLACES_KNOB = { feature: "shell.sidebar", key: "places" } as const;

/** A page many products link to; never a product of its own in the grid. */
export interface PagePlace {
  label: string;
  icon: LucideIcon;
  href: string;
}

export const PAGE_PLACES = {
  agents: { label: "Agents", icon: AGENT_ICON as LucideIcon, href: "/agents" },
  workflows: { label: "Workflows", icon: Workflow, href: "/workflows" },
  scheduled: { label: "Scheduled", icon: CalendarClock, href: "/schedules" },
  research: { label: "Research", icon: Telescope, href: "/research" },
  tasks: { label: "Tasks", icon: ListChecks, href: "/tasks" },
  notes: { label: "Notes", icon: NotebookPen, href: "/notes" },
  files: { label: "Files", icon: Folder, href: "/files" },
} as const satisfies Record<string, PagePlace>;

export type PagePlaceId = keyof typeof PAGE_PLACES;

/** `page:<id>` names a page place; anything else is a product id from products.ts. */
export type PlaceRef = `page:${PagePlaceId}` | string;

const SOLUTION_PLACES: readonly PlaceRef[] = ["page:research", "intelligence", "business-tools", "chat", "memory"];

export const RELATED_PLACES: Readonly<Record<string, readonly PlaceRef[]>> = {
  home: ["chat", "workspace", "intelligence", "crm", "page:research", "data"],
  workspace: ["data", "page:tasks", "page:notes", "intelligence", "page:files", "chat"],
  chat: ["page:agents", "page:workflows", "page:scheduled", "page:research", "masterwork", "memory", "intelligence"],
  memory: ["page:research", "intelligence", "audio", "data", "drive", "docs"],
  intelligence: ["chat", "page:research", "data", "memory", "masterwork", "page:scheduled", "workspace"],
  masterwork: ["intelligence", "chat", "page:research", "drive", "data"],
  applets: ["data", "intelligence", "page:research", "code", "home"],
  code: ["intelligence", "connectors", "page:research", "memory", "data"],
  connectors: ["intelligence", "code", "drive", "data", "page:agents"],
  docs: ["page:research", "data", "memory", "drive", "intelligence"],
  data: ["workspace", "page:research", "intelligence", "applets", "marketing", "education"],
  drive: ["media", "page:research", "docs", "memory", "intelligence"],
  media: ["drive", "audio", "page:research", "memory"],
  audio: ["page:research", "memory", "media", "intelligence", "meet"],
  crm: ["marketing", "messages", "meet", "data", "home"],
  hr: ["meet", "data", "messages", "crm"],
  marketing: ["crm", "page:research", "data", "messages", "intelligence"],
  meet: ["messages", "hr", "crm", "intelligence", "workspace"],
  messages: ["crm", "meet", "marketing", "chat", "page:research"],
  "business-tools": ["e-commerce", "page:research", "education", "intelligence", "memory"],
  education: ["data", "business-tools", "page:research", "chat"],
  legal: SOLUTION_PLACES,
  medical: SOLUTION_PLACES,
  "e-commerce": ["business-tools", "drive", "page:research", "intelligence"],
  other: SOLUTION_PLACES,
  more: ["home", "chat", "intelligence"],
};

/** The declared places of a product (empty for an unknown id). */
export function relatedPlacesOf(productId: string): readonly PlaceRef[] {
  return RELATED_PLACES[productId] ?? [];
}

/** The system default above More: the first few declared places. */
export function defaultPlacesAboveMore(productId: string): string[] {
  return relatedPlacesOf(productId).slice(0, DEFAULT_PLACES_ABOVE_MORE);
}

/**
 * The places above More for this product, merged per product key (person, then organization,
 * then the system default). Unknown ids are dropped; a stored empty list means "none above".
 */
export function chosenPlacesAboveMore(productId: string, knobValue: unknown, organizationValue?: unknown): string[] {
  const declared = new Set(relatedPlacesOf(productId));
  const asMap = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  // Per product: the person's entry wins, else the organization's, else the built-in default. The
  // resolver answers the nearest rung's whole map, so the organization's rung is read beside it.
  const own = asMap(knobValue)[productId];
  const stored = Array.isArray(own) ? own : asMap(organizationValue)[productId];
  if (!Array.isArray(stored)) return defaultPlacesAboveMore(productId);
  return stored.filter((id): id is string => typeof id === "string" && declared.has(id));
}
