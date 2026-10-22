// nav-data.ts — Pure data, no React/JSX imports
// Single source of truth for primary + admin shell navigation (all layouts).

/**
 * Where an **admin** row is listed (primary nav ignores this).
 * - `sidebar` — desktop secondary admin strip (when the admin indicator is visible)
 * - `headerMenu` — profile / header dropdown → Admin section
 * Omit on a row → both surfaces (default). Keeps one definition without deleting routes.
 */
export type AdminNavSurface = "sidebar" | "headerMenu";

/**
 * Declarative client-side actions a nav entry can trigger INSTEAD of navigating
 * (e.g. open an overlay/window). Pure data lives here; the actual handlers are
 * wired in `features/shell/navigation/navActions.ts` (`useNavActions`).
 *
 * Progressive enhancement is the contract: a surface that understands actions
 * renders a button that runs the handler; a surface that does NOT yet
 * understand them simply falls back to the entry's `href` (navigation). Adding
 * an action therefore never breaks a surface — it only upgrades the ones that
 * opt in. Add the next action's id to this union and register its handler.
 */
import { MARKETING_PILLARS } from "@/features/marketing/lib/marketing-nav";
import {
  MESSENGER_AGENTS_HREF,
  MESSENGER_AGENTS_LABEL,
  MESSENGER_HREF,
  MESSENGER_LABEL,
} from "@/features/messaging/messenger/messenger-route";
import {
  EDU_TOOL_NAV,
  eduToolHref,
} from "@/features/education/lib/education-nav";
import {
  hrAssetsHref,
  hrComplianceHref,
  hrDocumentsHref,
  hrEngagementHref,
  hrHiringHref,
  hrHref,
  hrLeaveHref,
  hrMeHref,
  hrOnboardingHref,
  hrPeopleHref,
  hrPerformanceHref,
  hrReportsHref,
  hrScheduleHref,
  hrSettingsHref,
  hrTasksHref,
  hrTimeHref,
  hrTrainingHref,
} from "@/features/hr/routes";
import type { ShellIconName } from "@/features/shell/shellIconMap";
import { SETTINGS_BASE } from "@/features/settings/route-shell/routing";
import type { ShellNavPanelActionId } from "./nav-window-panels";

/**
 * The sidebar knows no employer — see the block on the HR item below. Naming the `null` is what
 * makes it a decision in the diff rather than a forgotten argument.
 */
const NO_EMPLOYER = null;
import {
  SHAPES_ALL_HREF,
  SHAPES_ROUTE_BASE,
} from "@/features/content-ir/studio/constants";
import { NAV_WINDOW_PANEL_ICON } from "./nav-window-panels";
import { AGENT_ICON_NAME, INTELLIGENCE_ICON_NAME } from "@/components/icons/domain-icons";
import { USER_LAUNCHPAD_PATH } from "@/features/launchpad/constants";
import { SEARCH_LAB_PATH } from "@/features/knowledge/hub/legacyRoutes";

export type { ShellNavPanelActionId };
export { NAV_WINDOW_PANEL_ICON };

export type ShellNavActionId =
  | "create-project"
  | "create-task"
  | "create-war-room"
  | "create-note"
  | "create-document"
  | "create-workbook"
  | "create-pick-list"
  | "create-crm-person"
  | "create-crm-company"
  | "manage-favorites"
  | "edit-sidebar";

export const DEFAULT_ADMIN_SURFACES: AdminNavSurface[] = [
  "sidebar",
  "headerMenu",
];

/**
 * Separately-hosted Matrx apps that live on their own origin (not Next routes).
 * These are reached via absolute URLs + `external: true` so the shell renders
 * a real `<a target="_blank">` (new tab) with an external-link affordance,
 * instead of an in-app `<Link>` transition. Add future standalone apps here.
 */
export const WORKFLOWS_APP_URL = "https://workflows.aimatrx.com";

/** Standalone admin SPA (separate Vite app on its own origin). */
export const ADMIN_APP_URL = "https://admin.aimatrx.com";

export function adminItemOnSurface(
  item: ShellNavItem,
  surface: AdminNavSurface,
): boolean {
  if (item.section !== "admin") return false;
  const surfaces = item.adminSurfaces ?? DEFAULT_ADMIN_SURFACES;
  return surfaces.includes(surface);
}

export interface ShellNavChild {
  /**
   * PERMANENT id — literal, dotted, human-readable, unique across the whole menu
   * ("data.tables"). Stored custom layouts reference it, so it is never derived from a label,
   * never reused and never removed without a row in `shell-layout/retired-nav-ids.ts`
   * (guard: features/shell/__tests__/nav-ids.test.ts).
   */
  id: string;
  label: string;
  href: string;
  iconName: ShellIconName;
  exact?: boolean;
  /** Optional subgroup label in sidebar / mobile flyouts (e.g. "Knowledge"). */
  group?: string;
  /**
   * Group-child metadata. A group parent is a sidebar-only organizational
   * node (`dashboard: false`); its real destinations live on the children.
   * These optional fields let a child surface as a dashboard tile / profile
   * menu entry just like a top-level item, so nesting the sidebar never
   * removes a destination from the dashboard or profile menu.
   */
  description?: string;
  color?: string;
  dashboard?: boolean;
  profileMenu?: boolean;
  guestHidden?: boolean;
  guestHref?: string;
  /**
   * Points at a separately-hosted app on its own origin. When true, `href` is
   * an absolute URL and the shell renders an `<a target="_blank">` (new tab)
   * with an external-link icon instead of an in-app `<Link>` transition.
   */
  external?: boolean;
  /** Open an internal destination in a new tab, beside the current workspace. */
  openInNewTab?: boolean;
  /**
   * When set, action-aware surfaces render this entry as a button that runs the
   * registered handler (see `useNavActions`) instead of navigating. The `href`
   * stays as the fallback for surfaces that don't yet understand actions.
   */
  action?: ShellNavActionId;
  /**
   * Opens a registered window panel in place (middle flyout section — divider +
   * `NAV_WINDOW_PANEL_ICON`, above create actions). See `nav-window-panels.ts`.
   */
  panelAction?: ShellNavPanelActionId;
  /**
   * A custom layout's row that launches a Tools-grid tile (`tile.*`) in place: its `href` is a
   * `#tile.*` anchor that never navigates, so every renderer runs the tile instead
   * (`useRunNavTile`; shell-layout/FEATURE.md). Never set in nav-data itself.
   */
  tileId?: string;
  /**
   * Marks this child as an **action** (a create/add affordance) rather than a
   * navigation destination. Action children always render together in a
   * dedicated section at the BOTTOM of the menu, below a divider, regardless of
   * their position in this array — the house standard for every nav group (see
   * `partitionNavChildren`). A child with an overlay `action` is treated as an
   * action automatically; set this flag for plain-link creates (e.g. an
   * "Add X" that navigates to `/x/new` with no overlay handler).
   */
  actionItem?: boolean;
  /**
   * THE THIRD LEVEL. A child that carries its own `children` is a SUB-AREA
   * (an industry, a part of a big domain): its `href` is its landing page and
   * its children are its full menu, grouped by `group` exactly like a top-level
   * menu. The desktop flyout opens it as a submenu beside the row; the phone
   * drawer opens it as a drill-in. Three levels is the ceiling — a sub-area's
   * children are leaves (nav-no-loss.test.ts holds it).
   */
  children?: ShellNavChild[];
}

/** True when this child is a sub-area that opens its own menu. */
export function navChildHasSubmenu(child: ShellNavChild): boolean {
  return (child.children?.length ?? 0) > 0;
}

/**
 * Every node under `children`, depth first: each child, then (for a sub-area)
 * its own children. The ONE walker every flat consumer uses, so no surface can
 * silently drop third-level rows. `leavesOnly` skips the sub-area rows
 * themselves (they are organizational; their landing is also one of their rows).
 */
export function expandNavChildren(
  children: readonly ShellNavChild[] | undefined,
  { leavesOnly = false }: { leavesOnly?: boolean } = {},
): ShellNavChild[] {
  const out: ShellNavChild[] = [];
  for (const child of children ?? []) {
    const nested = child.children ?? [];
    if (nested.length === 0 || !leavesOnly) out.push(child);
    if (nested.length > 0) out.push(...expandNavChildren(nested, { leavesOnly }));
  }
  return out;
}

/**
 * The Marketing module's sidebar children, derived from `MARKETING_PILLARS`
 * so the shell menu and the `/marketing` hub can never disagree. Pillars
 * become flyout subgroups. Mixed pillars expose only their live surfaces;
 * fully reserved pillars get one top-level placeholder instead of listing
 * every promised child route. `navHidden` entries (the inlined public
 * analyzers, which already have their own "SEO Tools" destination) stay off
 * the menu.
 */
/**
 * A marketing entry's stable key: the last segment of its route (query and hash dropped, an
 * absolute URL read by its path). Routes are the entries' identity; a label never is. A route
 * change surfaces as a vanished nav id in nav-ids.test.ts, which forces a retired-nav-ids row.
 */
function marketingEntryKey(href: string): string {
  const path = href.replace(/^[a-z]+:\/\/[^/]+/i, "").split(/[?#]/)[0] ?? "";
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "home";
}

function marketingNavChildren(): ShellNavChild[] {
  const hub: ShellNavChild = {
    id: "marketing.hub",
    label: "Marketing Hub",
    href: "/marketing",
    iconName: "TrendingUp",
    exact: true,
    group: "Overview",
    description: "Every marketing surface in one map",
    color: "green",
    profileMenu: true,
    dashboard: true,
  };
  const fromPillars = MARKETING_PILLARS.flatMap((pillar) => {
    const visibleEntries = pillar.entries.filter((entry) => !entry.navHidden);
    const liveEntries = visibleEntries.filter(
      (entry) => entry.status !== "coming-soon",
    );

    if (liveEntries.length === 0) {
      const destination = visibleEntries[0];
      if (!destination) return [];
      return [
        {
          // Permanent id from the pillar's stable key (never its label).
          id: `marketing.${pillar.key}`,
          label: pillar.label,
          href: pillar.landingHref ?? destination.href,
          iconName: pillar.iconName,
          description: `Coming soon — ${pillar.description}`,
          color: "green",
        } satisfies ShellNavChild,
      ];
    }

    return liveEntries.map((entry): ShellNavChild => ({
      // Permanent id from the pillar key + the entry's route key (never its label).
      id: `marketing.${pillar.key}.${marketingEntryKey(entry.href)}`,
      label: entry.label,
      href: entry.href,
      iconName: entry.iconName,
      group: pillar.label,
      description: entry.description,
      color: "green",
      external: entry.external,
      profileMenu: true,
      dashboard: true,
    }));
  });
  return [hub, ...fromPillars];
}

/**
 * The Education Hub's sidebar children: the 16 application TOOLS a learner
 * actually studies in, followed by the public browse axes.
 *
 * Derived from `EDU_TOOL_NAV` so the shell menu and the education hub can never
 * disagree about which tools exist — the same guarantee `marketingNavChildren`
 * gives Marketing. Guarded by `education-nav.test.ts` (slug parity with the
 * `EDU_TOOLS` registry) and by this file's icon-registration test.
 *
 * Before 2026-08-17 this list held ONLY the browse axes, so a signed-in learner
 * had no path from the shell to flashcards, the tutor, or FastFire — all 16
 * tools were reachable by typed URL only. (WP1, launch gate G12.)
 */
function educationNavChildren(): ShellNavChild[] {
  const tools = EDU_TOOL_NAV.map((tool): ShellNavChild => ({
    // Permanent id from the tool's registry slug (never its label).
    id: `industries.education.${tool.slug}`,
    label: tool.label,
    href: eduToolHref(tool.slug),
    iconName: tool.iconName,
    group: tool.group,
    description: tool.description,
    color: "emerald",
    profileMenu: true,
    dashboard: true,
  }));

  const browse: ShellNavChild[] = [
    {
      id: "industries.education.browse-the-hub",
      label: "Browse the Hub",
      href: "/education",
      iconName: "GraduationCap",
      group: "Browse",
      description: "Every subject, level, exam, study aid, and feature",
      color: "emerald",
      profileMenu: true,
      dashboard: true,
    },
    {
      id: "industries.education.subjects",
      label: "Subjects",
      href: "/education/subjects",
      iconName: "BookOpen",
      group: "Browse",
      description: "Math, science, history, languages, and more",
      color: "emerald",
      profileMenu: true,
      dashboard: true,
    },
    {
      id: "industries.education.levels",
      label: "Levels",
      href: "/education/levels",
      iconName: "GraduationCap",
      group: "Browse",
      description: "Elementary through college and professional boards",
      color: "emerald",
      profileMenu: true,
      dashboard: true,
    },
    {
      id: "industries.education.exam-prep",
      label: "Exam Prep",
      href: "/education/exam-prep",
      iconName: "Target",
      group: "Browse",
      description: "SAT, ACT, AP, MCAT, LSAT, bar, NCLEX, CPA",
      color: "emerald",
      profileMenu: true,
      dashboard: true,
    },
    {
      id: "industries.education.study-aids",
      label: "Study Aids",
      href: "/education/study-aids",
      iconName: "Layers",
      group: "Browse",
      description: "Flashcards, quizzes, podcasts, mind maps",
      color: "teal",
      profileMenu: true,
      dashboard: true,
    },
    {
      id: "industries.education.quick-math",
      label: "Quick Math",
      href: "/education/subjects/quick-math",
      iconName: "BookOpen",
      group: "Browse",
      description: "Interactive algebra lessons (preview content)",
      color: "emerald",
      profileMenu: true,
      dashboard: true,
    },
  ];

  return [...tools, ...browse];
}

export interface ShellNavItem {
  /** PERMANENT id — see `ShellNavChild.id`. Dock rows carry the id of the menu node they mirror. */
  id: string;
  label: string;
  href: string;
  iconName: ShellIconName;
  section: "primary" | "admin";
  dockOrder?: number;
  description?: string;
  color?: string;
  children?: ShellNavChild[];
  /** Admin dropdown grouping (Desktop admin menu). */
  category?: string;
  /** Profile / header navigation menu. */
  profileMenu?: boolean;
  /** Dashboard app grid tiles. */
  dashboard?: boolean;
  /**
   * Admin rows only: which UI surfaces show this link.
   * Default when omitted: sidebar + header Admin menu.
   */
  adminSurfaces?: AdminNavSurface[];
  /**
   * Hide this row from guest (unauthenticated) visitors. Use for surfaces
   * that have no meaningful guest experience (e.g. personal DMs).
   * Defaults to `false` — every row is guest-visible unless explicitly
   * hidden. Children pages are still reachable by direct URL; the soft
   * auth gate handles access there.
   */
  guestHidden?: boolean;
  /**
   * Where the row points for guest visitors. When set, the guest nav
   * uses this href instead of `href` — typically a marketing landing
   * (`/chat`) instead of the workspace URL (`/chat/new`) so guests
   * don't bounce off a workspace they can't use yet.
   */
  guestHref?: string;
  /**
   * Points at a separately-hosted app on its own origin. When true, `href` is
   * an absolute URL and the shell renders an `<a target="_blank">` (new tab)
   * with an external-link icon instead of an in-app `<Link>` transition.
   */
  external?: boolean;
  /** Open an internal destination beside the current workspace. */
  openInNewTab?: boolean;
  /** A custom layout's Tools-grid tile row — see `ShellNavChild.tileId`. */
  tileId?: string;
  /**
   * Additional first-party route namespaces owned by this item. Children are
   * matched under each prefix by replacing the canonical parent prefix, so an
   * alias such as `/rag` keeps `/knowledge/data-stores` selected at
   * `/rag/data-stores` without duplicating the child registry.
   */
  ownedRoutePrefixes?: readonly string[];
  /**
   * A deliberate visual marker on the item's icon. `attention` paints it pink
   * so a temporary holding pen (the "Other" domain) is never forgotten.
   */
  tone?: ShellNavTone;
}

export type ShellNavTone = "attention";

/** The icon class for a nav item's `tone` (styles/shell.css; light and dark both readable). */
export function navToneIconClass(tone: ShellNavTone | undefined): string | undefined {
  if (tone === "attention") return "shell-nav-icon-attention";
  return undefined;
}

/** A named list of children that more than one surface renders (a hub page and the menu). */
export interface ShellNavGroupDef {
  label: string;
  color: string;
  children: ShellNavChild[];
}

/**
 * Re-labels every child's subgroup. Used when a whole former top-level menu
 * (Print, the Education Hub) folds into a domain as one subgroup.
 */
function inGroup(children: ShellNavChild[], group: string): ShellNavChild[] {
  return children.map((child) => ({ ...child, group }));
}

/**
 * The AI Work menu as it stood before the domain reorganization. Its overview
 * page (`features/ai-work`) still lists these five doors, so they live here as
 * ONE named list; the Chat domain takes the two `/work` destinations and the
 * three shortcuts sit in their own domains (Chat, Agents, Coding).
 */
export const AI_WORK_NAV_GROUP: ShellNavGroupDef = {
  label: "AI Work",
  color: "violet",
  children: [
    {
      id: "ai-work.overview",
      label: "Overview",
      href: "/work",
      iconName: "LayoutDashboard",
      exact: true,
    },
    {
      id: "ai-work.live",
      label: "Live",
      href: "/work/live",
      iconName: "Radio",
    },
    {
      id: "ai-work.provider-conversations",
      label: "Provider Conversations",
      href: "/work/conversations",
      iconName: "MessageSquare",
    },
    {
      id: "ai-work.start-ai-matrx-chat",
      label: "Start AI Matrx Chat",
      href: "/chat/new",
      iconName: "MessageCircle",
    },
    {
      id: "ai-work.skills",
      label: "Skills",
      href: "/agent-connections/skills",
      iconName: "Brain",
    },
    {
      id: "ai-work.coding-connections",
      label: "Coding Connections",
      href: "/agent-connections/plugins",
      iconName: "Plug",
    },
  ],
};

/** The Projects domain's rows: projects and tasks (schema `projects`). */
const PROJECTS_NAV_CHILDREN: ShellNavChild[] = [
  {
    id: "workspace.projects",
    label: "Projects",
    href: "/projects",
    iconName: "Folder",
    description: "Create and manage projects, collaborate with teams",
    color: "violet",
    profileMenu: true,
    dashboard: true,
  },
  {
    id: "workspace.tasks",
    label: "Tasks",
    href: "/tasks",
    iconName: "ListTodo",
    description: "Organize and track your tasks and projects",
    color: "emerald",
    profileMenu: true,
    dashboard: true,
  },
  {
    id: "workspace.tasks-window",
    label: "Tasks Window",
    href: "/tasks",
    iconName: NAV_WINDOW_PANEL_ICON,
    panelAction: "open-tasks-panel",
  },
  // Actions — each opens its overlay/window in place; `href` is the graceful
  // fallback for non-action-aware surfaces (mobile sheet, ctrl-click).
  {
    id: "workspace.new-project",
    label: "New Project",
    href: "/projects/new",
    iconName: "Plus",
    action: "create-project",
  },
  {
    id: "workspace.new-task",
    label: "New Task",
    href: "/tasks/new",
    iconName: "Plus",
    action: "create-task",
  },
];

/** The War Room — a live board, so it lives in the Workspace group (Arman, 2026-10-09). */
const WAR_ROOM_NAV_CHILDREN: ShellNavChild[] = [
  {
    id: "workspace.war-room",
    label: "War Room",
    href: "/war-room",
    iconName: "Radar",
    description:
      "Session-based command center — tasks, notes, and audio side by side",
    color: "rose",
    profileMenu: true,
    dashboard: true,
  },
  {
    id: "workspace.new-war-room",
    label: "New War Room",
    href: "/war-room/all",
    iconName: "Plus",
    action: "create-war-room",
  },
];

/**
 * Projects, Tasks and the War Room — the destination strip the projects and
 * tasks hubs render (features/projects ProjectsHub, features/tasks
 * TasksWorkbenchHome). In the menu, all three sit in Workspace.
 */
export const WORKSPACES_NAV_GROUP: ShellNavGroupDef = {
  label: "Projects",
  color: "violet",
  children: [...PROJECTS_NAV_CHILDREN, ...WAR_ROOM_NAV_CHILDREN],
};

/**
 * Tables, Templates and Pick Lists — the record store's rows in the Data domain (Make, Pages and Dashboards left for Workspace, Arman 2026-10-09) (Workbooks sit in Data too). NO ROW HERE IS EVER HIDDEN BEHIND A SWITCH
 * (Arman, 2026-10-03: "EVERYTHING IS ON by default … Don't limit what users can do"): the
 * record store is the only data system, so Make and Records always show, with or without an
 * active organization. Guard: features/shell/__tests__/no-nav-row-is-gated.test.ts.
 */
export const DATA_NAV_CHILDREN: ShellNavChild[] = [
  {
    id: "data.tables",
    label: "Tables",
    href: "/data",
    iconName: "Table",
    description: "Manage your custom data or create tables in a Chat",
    color: "cyan",
    profileMenu: true,
    dashboard: true,
  },
  {
    id: "data.bases",
    // Bases: each Home's group of tables (/data/bases), one door from the Data menu.
    label: "Bases",
    href: "/data/bases",
    iconName: "Database",
    description: "Every base of tables you can open",
    color: "cyan",
    guestHidden: true,
  },
  {
    id: "data.templates",
    // THE template gallery (lane CHAIR-GALLERY): one public route for everyone, signed in or out.
    label: "Templates",
    href: "/templates",
    iconName: "LayoutTemplate",
    description: "Ready-made tables, forms and booking pages with sample data",
    color: "cyan",
  },
  {
    id: "data.library",
    // The data library's task home, as it has always been ("what do you need done", browse).
    label: "Data Library",
    href: "/data/library",
    iconName: "Library",
    description: "Reviews, places, products, jobs and more, ready to fetch",
    color: "cyan",
    dashboard: true,
    guestHidden: true,
  },
  {
    id: "data.tools",
    // The Tools home: search thousands of Tools, try one, give it to an agent. Its own door.
    label: "Tools",
    href: "/data/library?view=tools",
    iconName: "Library",
    description: "Find, try and give Tools to your agents",
    color: "cyan",
    dashboard: true,
    guestHidden: true,
  },
  {
    id: "data.compare",
    // One list of same-type things, the real facts, a ranked side-by-side. Metered in points.
    label: "Compare",
    href: "/compare",
    iconName: "GitCompareArrows",
    description: "Line up companies, places or products and see the numbers side by side",
    color: "cyan",
    dashboard: true,
    guestHidden: true,
  },
  {
    id: "data.data-to-model",
    // Fetched records beside what a model would receive: handed over vs fetched by a tool.
    label: "Data to Model",
    href: "/data/library/lab",
    iconName: "FlaskConical",
    description: "What a model receives from fetched data, and its cost",
    color: "cyan",
    guestHidden: true,
  },
  {
    id: "data.data-tables-window",
    label: "Data Tables Window",
    href: "/data",
    iconName: NAV_WINDOW_PANEL_ICON,
    panelAction: "open-data-tables-panel",
  },
  {
    id: "data.pick-lists",
    label: "Pick Lists",
    href: "/pick-lists",
    iconName: "ListChecks",
    description: "Reusable option lists for forms, fields, and data",
    color: "teal",
    profileMenu: true,
    dashboard: true,
  },
  {
    id: "data.pick-lists-window",
    label: "Pick Lists Window",
    href: "/pick-lists",
    iconName: NAV_WINDOW_PANEL_ICON,
    panelAction: "open-pick-lists-panel",
  },
  // Actions — collected at the bottom below a divider.
  {
    id: "data.new-table",
    label: "New Table",
    href: "/data",
    iconName: "Plus",
    actionItem: true,
  },
  {
    id: "data.new-pick-list",
    // Opens the Pick List manager (create + edit) in place.
    label: "New Pick List",
    href: "/pick-lists",
    iconName: "Plus",
    action: "create-pick-list",
  },
];

/** The Print hub's shortcuts. The full index lives at /print (features/print/hub/catalog.ts). */
const PRINT_NAV_CHILDREN: ShellNavChild[] = [
  { id: "publish.print.all-printables", label: "All printables", href: "/print", iconName: "Printer", description: "The full index of everything this platform can print", color: "violet" },
  { id: "publish.print.flashcard-decks", label: "Flashcard decks", href: "/print/flashcards", iconName: "Layers", description: "Decks as cut-apart cards, duplex-mirrored or stacked", color: "emerald" },
  { id: "publish.print.cheat-sheets-and-study-aids", label: "Cheat sheets & study aids", href: "/print/education", iconName: "GraduationCap", description: "Formula sheets, glossaries, and dated study calendars", color: "emerald" },
  { id: "publish.print.practice-tests-and-bubble-sheets", label: "Practice tests & bubble sheets", href: "/print/exams", iconName: "ClipboardCheck", description: "A test, its scannable answer form, and the answer key", color: "emerald" },
  { id: "publish.print.certificates-and-workbooks", label: "Certificates & workbooks", href: "/print/certificates", iconName: "BadgeCheck", description: "Completion certificates and composed workbooks", color: "emerald" },
  { id: "publish.print.label-sheets-and-rolls", label: "Label sheets & rolls", href: "/print/labels", iconName: "Barcode", description: "Avery sheets and roll stock, laid out inch-exact", color: "amber" },
  { id: "publish.print.qr-codes", label: "QR codes", href: "/print/qr", iconName: "QrCode", description: "QR symbols with their real capacity and scan margin shown", color: "amber" },
  { id: "publish.print.branded-qr", label: "Branded QR", href: "/print/branded-qr", iconName: "QrCode", color: "amber" },
  { id: "publish.print.barcodes", label: "Barcodes", href: "/print/barcodes", iconName: "Barcode", description: "Code 128, EAN and UPC at scanner-legal widths", color: "amber" },
  { id: "publish.print.zpl-labels", label: "ZPL labels", href: "/print/zpl", iconName: "Barcode", color: "amber" },
  { id: "publish.print.markdown-to-print-or-pdf", label: "Markdown to print or PDF", href: "/print/documents", iconName: "FileText", description: "Written content as a styled document or a PDF", color: "blue" },
  { id: "publish.print.booklet-imposition", label: "Booklet imposition", href: "/print/booklet", iconName: "BookOpen", description: "Pages reordered so a folded stack reads in order", color: "blue" },
  { id: "publish.print.order-printed-copies", label: "Order printed copies", href: "/print/order", iconName: "Printer", description: "Price a real book and have it printed, bound, and shipped", color: "violet" },
];

/**
 * The industries, one row each. Every industry is a SUB-AREA: its `href` is its
 * landing page and its `children` are its full menu (grouped by `group`), which
 * opens beside the Industries flyout and as a drill-in on a phone.
 */
const INDUSTRY_NAV_CHILDREN: ShellNavChild[] = [
  {
    id: "industries.education",
    label: "Education",
    href: "/education",
    iconName: "GraduationCap",
    description: "Study tools, subjects, exams and classes",
    color: "emerald",
    children: [
      ...educationNavChildren(),
      { id: "industries.education.create-a-study-kit", label: "Create a Study Kit", href: "/education/kits/new", iconName: "Plus", group: "More" },
      { id: "industries.education.overview", label: "Overview", href: "/education/overview", iconName: "LayoutDashboard", group: "More", guestHidden: true },
      { id: "industries.education.learn", label: "Learn", href: "/education/learn", iconName: "BookOpen", group: "More" },
      { id: "industries.education.library", label: "Library", href: "/education/library", iconName: "BookOpen", exact: true, group: "More", guestHidden: true },
      { id: "industries.education.community-library", label: "Community Library", href: "/education/library/community", iconName: "Users", group: "More" },
      { id: "industries.education.library-suggestions", label: "Library Suggestions", href: "/education/library/suggestions", iconName: "Lightbulb", group: "More", guestHidden: true },
      { id: "industries.education.progress", label: "Progress", href: "/education/progress", iconName: "BarChart3", exact: true, group: "More", guestHidden: true },
      { id: "industries.education.learning-gain", label: "Learning Gain", href: "/education/progress/learning-gain", iconName: "TrendingUp", group: "More", guestHidden: true },
      { id: "industries.education.sessions", label: "Sessions", href: "/education/sessions", iconName: "CalendarClock", group: "More", guestHidden: true },
      { id: "industries.education.join-a-class", label: "Join a Class", href: "/education/classes/join", iconName: "LogIn", group: "More", guestHidden: true },
      { id: "industries.education.host-a-game", label: "Host a Game", href: "/education/game/host", iconName: "Gamepad2", group: "More", guestHidden: true },
      { id: "industries.education.join-a-game", label: "Join a Game", href: "/education/game/join", iconName: "Gamepad2", group: "More" },
      { id: "industries.education.solo-arcade", label: "Solo Arcade", href: "/education/game/solo", iconName: "Gamepad2", group: "More" },
      { id: "industries.education.education-features", label: "Education Features", href: "/education/features", iconName: "List", group: "More" },
      { id: "industries.education.your-education-data", label: "Your Education Data", href: "/education/data", iconName: "Database", group: "More", guestHidden: true },
      { id: "industries.education.offline", label: "Offline", href: "/education/offline", iconName: "Eye", group: "More", guestHidden: true },
    ],
  },
  {
    id: "industries.legal",
    label: "Legal",
    href: "/legal",
    iconName: "Scale",
    description: "Legal tools, calculators, and case utilities",
    color: "slate",
    children: [
      {
        id: "industries.legal.legal-hub",
        label: "Legal Hub",
        href: "/legal",
        iconName: "Scale",
        exact: true,
        description: "Legal tools, calculators, and case utilities",
        color: "slate",
        profileMenu: true,
        dashboard: true,
      },
      { id: "industries.legal.ca-workers-comp", label: "CA Workers' Comp", href: "/legal/ca-wc", iconName: "Scale", exact: true, group: "Workers' Comp" },
      { id: "industries.legal.wc-cases", label: "WC Cases", href: "/legal/ca-wc/cases", iconName: "FolderOpen", group: "Workers' Comp", guestHidden: true },
      { id: "industries.legal.pd-ratings-calculator", label: "PD Ratings Calculator", href: "/legal/ca-wc/pd-ratings-calculator", iconName: "Hash", group: "Workers' Comp" },
      { id: "industries.legal.wc-utilities", label: "WC Utilities", href: "/legal/ca-wc/utilities", iconName: "Wrench", group: "Workers' Comp" },
    ],
  },
  {
    id: "industries.commerce",
    // Commerce gains product-capture (the warehouse capture → analysis →
    // listing pipeline). Its landing is Capture Products because that page
    // works signed out; every /commerce row stays members-only.
    label: "Commerce",
    href: "/tools/product-capture",
    iconName: "Package",
    description: "Product capture, intake, listings, labels and stores",
    color: "orange",
    children: [
      {
        id: "industries.commerce.capture-products",
        label: "Capture Products",
        href: "/tools/product-capture",
        iconName: "PackagePlus",
        exact: true,
        description: "Rapid-fire product photos, QR item switching, and voice notes ahead of listing",
        color: "orange",
        profileMenu: true,
        dashboard: true,
        group: "Capture",
      },
      {
        id: "industries.commerce.instant-capture",
        label: "Instant Capture",
        href: "/tools/product-capture/instant",
        iconName: "ScanLine",
        description: "Capture product photos and process them on the spot — the analysis streams back live",
        color: "orange",
        profileMenu: true,
        dashboard: true,
        group: "Capture",
      },
      {
        id: "industries.commerce.product-pipeline",
        label: "Product Pipeline",
        href: "/tools/product-capture/manage",
        iconName: "TableProperties",
        description: "Manage captured products through AI analysis, research, review, and listing approval",
        color: "orange",
        profileMenu: true,
        dashboard: true,
        group: "Capture",
      },
      { id: "industries.commerce.all-products", label: "All Products", href: "/tools/product-capture/all", iconName: "Package", guestHidden: true, group: "Capture" },
      { id: "industries.commerce.product-questions", label: "Product Questions", href: "/tools/product-capture/answer", iconName: "CircleHelp", guestHidden: true, group: "Capture" },
      { id: "industries.commerce.needs-you", label: "Needs You", href: "/capture/needs-you", iconName: "Inbox", guestHidden: true, group: "Capture" },
      { id: "industries.commerce.intake", label: "Intake", href: "/commerce/intake", iconName: "PackagePlus", exact: true, group: "Intake", guestHidden: true },
      { id: "industries.commerce.instant-intake", label: "Instant Intake", href: "/commerce/intake/instant", iconName: "ScanLine", group: "Intake", guestHidden: true },
      { id: "industries.commerce.intake-answers", label: "Intake Answers", href: "/commerce/intake/answer", iconName: "CircleHelp", group: "Intake", guestHidden: true },
      { id: "industries.commerce.intake-assets", label: "Intake Assets", href: "/commerce/intake/assets", iconName: "Images", group: "Intake", guestHidden: true },
      { id: "industries.commerce.needs-attention", label: "Needs Attention", href: "/commerce/attention", iconName: "Inbox", group: "Listings", guestHidden: true },
      { id: "industries.commerce.triage", label: "Triage", href: "/commerce/triage", iconName: "ListChecks", group: "Listings", guestHidden: true },
      { id: "industries.commerce.drafts", label: "Drafts", href: "/commerce/drafts", iconName: "FileText", group: "Listings", guestHidden: true },
      { id: "industries.commerce.qr-labels", label: "QR Labels", href: "/commerce/labels", iconName: "QrCode", exact: true, group: "Labels & stores", guestHidden: true },
      { id: "industries.commerce.certified-printers", label: "Certified Printers", href: "/commerce/labels/printers", iconName: "Printer", group: "Labels & stores", guestHidden: true },
      { id: "industries.commerce.connect-a-store", label: "Connect a Store", href: "/commerce/stores/connect", iconName: "Link2", group: "Labels & stores", guestHidden: true },
    ],
  },
  {
    id: "industries.medical",
    label: "Medical",
    href: "/medical",
    iconName: "HeartPulse",
    description: "Medical calculators and clinical tools",
    color: "rose",
    children: [
      {
        id: "industries.medical.medical-hub",
        label: "Medical Hub",
        href: "/medical",
        iconName: "HeartPulse",
        exact: true,
        description: "Medical calculators and clinical tools",
        color: "rose",
        profileMenu: true,
        dashboard: true,
      },
    ],
  },
];

/*
 * PRIMARY NAVIGATION — THE DOMAIN TREE (Arman, 2026-10-02; corrected tree
 * ruled 2026-10-04).
 *
 * The top level is the product domains of common-docs/policies/domain-tree.md
 * ("Product — what users see"), then ONE "Industries" entry, then a temporary
 * "Other" holding pen (pink icon) for anything with no clear home yet. Every
 * Other row has a line in common-docs/operations/conflicts.md.
 *
 * Order: Board first (the home), Projects beside it (the two daily-work
 * surfaces sit together), then the tree's Product order. The five
 * "stuff" domains read as one run — Content (authored text), Data (records),
 * Files (the cloud drive), Media (images, video, capture), Audio (speech and
 * transcripts) — with Code right after.
 *
 * NOTHING IS LOST: every href the menu reached before this reorganization is
 * frozen in features/shell/__tests__/nav-no-loss.test.ts, which fails if one
 * stops being reachable. Never delete a destination here — the domain tree
 * forbids it; move it, or park it in Other.
 *
 * Each destination href lives in exactly ONE domain (no cross-domain
 * shortcuts), so the group that lights up for a route is unambiguous.
 */
export const primaryNavItems: ShellNavItem[] = [
  {
    id: "workspace",
    // workspace: every place a person works from — launchpad, dashboard, start page, spaces, boards,
    // pages, dashboards, make, war room, projects and tasks (Arman, 2026-10-09: "Change Board at the
    // top level of the menu to Workspace… pages and things like that cannot be in Data"). Authed
    // users get their dashboard; guests get the public `/features` page (the middleware
    // hard-redirects guests off `/dashboard`).
    label: "Workspace",
    href: "/dashboard",
    guestHref: "/features",
    iconName: "LayoutDashboard",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Boards, pages, projects and dashboards",
    color: "sky",
    children: [
      {
        id: "workspace.launchpad",
        label: "Launchpad",
        href: USER_LAUNCHPAD_PATH,
        iconName: "Rocket",
        description: "Keep one starting point open while every destination launches beside it",
        color: "green",
        guestHidden: true,
        // A launchpad stays open while what it launches opens beside it.
        openInNewTab: true,
      },
      {
        id: "workspace.dashboard",
        label: "Dashboard",
        href: "/dashboard",
        guestHref: "/features",
        iconName: "LayoutDashboard",
        description: "Your central hub for all activities and insights",
        color: "sky",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "workspace.start-page",
        // The person's start launchpad (Start moved into launchpads; /start redirects here).
        label: "Start Page",
        href: "/launchpad/start",
        iconName: "Compass",
        description: "Your own start page, built from your tables",
        color: "sky",
        guestHidden: true,
      },
      {
        id: "workspace.spaces",
        label: "Spaces",
        href: "/spaces",
        iconName: "NotebookTabs",
        description: "Pages, databases and templates in one workspace",
        color: "amber",
        guestHidden: true,
      },
      {
        id: "workspace.board",
        // THE BOARD — `/board` is the LIST (recents first); one opens at `/board/<id>`. What a board can
        // hold is added from the board's own Add menu (features/board/home/AddMenu), never from this
        // menu (Arman, 2026-10-09 follow-up: the 27 add rows were clutter in a home menu).
        label: "Board",
        href: "/board",
        iconName: "LayoutGrid",
        description: "Your boards — every feature side by side",
        color: "teal",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
      },
      {
        id: "workspace.pages",
        // Every page built from tables (a dashboard record whose presentation is a page).
        label: "Pages",
        href: "/data/pages",
        iconName: "AppWindow",
        description: "Pages built from your tables",
        color: "cyan",
        guestHidden: true,
      },
      {
        id: "workspace.dashboards",
        // Every dashboard built from tables, across organizations (ItemsHome kind "dashboard").
        label: "Dashboards",
        href: "/data/dashboards",
        iconName: "LayoutDashboard",
        description: "Dashboards built from your tables",
        color: "cyan",
        guestHidden: true,
      },
      {
        id: "workspace.make",
        // The /make hub (lane MAKE-HOME): every thing the record store makes, in one place.
        label: "Make",
        href: "/make",
        iconName: "LayoutGrid",
        description: "Make a table, form, booking page or dashboard",
        color: "cyan",
      },
      ...WAR_ROOM_NAV_CHILDREN,
      ...PROJECTS_NAV_CHILDREN,
    ],
  },
  {
    id: "agents",
    // Sidebar points at the gallery (`/agents/all`) for authed users; for
    // guests, the marketing landing (`/agents`) so they see the pitch
    // instead of the deep-link compact card.
    label: "Agents",
    href: "/agents/all",
    guestHref: "/agents",
    iconName: AGENT_ICON_NAME,
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "AI Agent Harness Management",
    color: "blue",
    children: [
      { id: "agents.all-agents", label: "All Agents", href: "/agents/all", iconName: "List", exact: true, group: "Agents" },
      { id: "agents.templates", label: "Templates", href: "/agents/templates", iconName: "LayoutTemplate", group: "Agents" },
      { id: "agents.shortcuts", label: "Shortcuts", href: "/agents/shortcuts", iconName: "Zap", group: "Agents" },
      { id: "agents.prompt-blocks", label: "Prompt blocks", href: "/agents/prompt-blocks", iconName: "Boxes", group: "Agents", guestHidden: true },
      { id: "agents.categories", label: "Categories", href: "/agents/categories", iconName: "Folder", group: "Agents" },
      { id: "agents.org-chart", label: "Org Chart", href: "/agents/org-chart", iconName: "Network", group: "Agents", guestHidden: true },
      { id: "agents.orchestra-studio", label: "Orchestra Studio", href: "/agents/orchestra-studio", iconName: "Network", group: "Agents", guestHidden: true },
      {
        id: "agents.agent-battle",
        label: "Agent Battle",
        href: "/agents/battle",
        iconName: "Swords",
        description: "Compare agents side by side — models, prompts, and outputs",
        group: "Agents",
      },
      { id: "agents.compare-agents", label: "Compare Agents", href: "/agents/compare", iconName: "GitCompareArrows", group: "Agents", guestHidden: true },
      {
        id: "agents.agent-connections",
        label: "Agent Connections",
        href: "/agent-connections",
        iconName: "Plug",
        description: "Tools, skills, MCP servers, and plugins your agents can reach",
        group: "Build with",
      },
      { id: "agents.skills", label: "Skills", href: "/agent-connections/skills", iconName: "Brain", group: "Build with" },
      { id: "agents.content-blocks", label: "Content Blocks", href: "/agent-connections/render-blocks", iconName: "FileText", group: "Build with" },
      { id: "agents.term-lists", label: "Term Lists", href: "/resources/term-lists", iconName: "ListChecks", group: "Build with", guestHidden: true },
      { id: "agents.surfaces", label: "Surfaces", href: "/surfaces", iconName: "LayoutPanelLeft", group: "Build with", guestHidden: true },
      { id: "agents.agent-connections-window", label: "Agent Connections Window", href: "/agent-connections", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-agent-connections-panel" },
      { id: "agents.agent-settings-window", label: "Agent Settings Window", href: "/agents/all", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-agent-settings-panel" },
      { id: "agents.agent-advanced-editor-window", label: "Agent Advanced Editor Window", href: "/agents/all", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-agent-advanced-editor-panel" },
      { id: "agents.run-history-window", label: "Run History Window", href: "/agents/all", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-run-history-panel" },
      { id: "agents.import-agent-window", label: "Import Agent Window", href: "/agents/new/import", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-import-agent-panel" },
      { id: "agents.new-agent", label: "New Agent", href: "/agents/new", iconName: "Plus", actionItem: true },
    ],
  },
  {
    id: "applets",
    // applets (> applets): what customers build with agents, own UI and landing.
    label: "Applets",
    href: "/applets",
    iconName: "Puzzle",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Applets built from agents",
    color: "emerald",
    children: [
      {
        id: "applets.all-applets",
        label: "All Applets",
        href: "/applets",
        iconName: "Puzzle",
        exact: true,
        description: "Browse and run interactive applets built from agents",
        color: "emerald",
        profileMenu: true,
        dashboard: true,
      },
      { id: "applets.applet-templates", label: "Applet Templates", href: "/templates/applets", iconName: "LayoutTemplate", guestHidden: true },
      { id: "applets.build-an-applet", label: "Build an Applet", href: "/applets/build", iconName: "Plus", actionItem: true, guestHidden: true },
    ],
  },
  {
    id: "chat",
    // Sidebar points at the workspace (`/chat/new`) for authed users; for
    // guests, the marketing landing (`/chat`).
    label: "Chat",
    href: "/chat/new",
    guestHref: "/chat",
    iconName: "MessageCircle",
    section: "primary",
    profileMenu: true,
    dashboard: false,
    description: "Interact with our reimagined chat interface",
    color: "indigo",
    // AI Work (/work) is the chat domain's ai-work feature.
    ownedRoutePrefixes: ["/work"],
    children: [
      { id: "chat.new", label: "Chat", href: "/chat/new", iconName: "MessageCircle", exact: true, profileMenu: true, group: "Chat" },
      { id: "chat.voice", label: "Voice", href: "/chat/voice", iconName: "Mic", group: "Chat" },
      { id: "chat.talk", label: "Talk", href: "/chat/talk", iconName: "Speech", group: "Chat" },
      { id: "chat.messenger-agents", label: MESSENGER_AGENTS_LABEL, href: MESSENGER_AGENTS_HREF, iconName: "MessagesSquare", group: "Chat", guestHidden: true },
      ...AI_WORK_NAV_GROUP.children
        .filter((child) => child.href.startsWith("/work"))
        .map((child): ShellNavChild => ({
          ...child,
          group: "AI Work",
          description:
            "Conversations and connected work across AI Matrx and coding platforms",
          color: "violet",
          profileMenu: child.href === "/work",
          dashboard: child.href === "/work",
        })),
      { id: "chat.chat-window", label: "Chat Window", href: "/chat/new", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-chat-panel" },
      { id: "chat.chat-history-window", label: "Chat History Window", href: "/chat/new", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-chat-history-panel" },
    ],
  },
  {
    id: "workflows",
    // ONE Workflows: the in-app catalog where a workflow is RUN and watched,
    // AND the external Vite canvas app (apps/workflow-studio) where the graph
    // is authored. /workflows itself is the marketing page; the signed-in
    // catalog is /workflows/all.
    label: "Workflows",
    href: "/workflows/all",
    iconName: "Workflow",
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Run multi-step workflows and watch every step live",
    color: "cyan",
    ownedRoutePrefixes: ["/schedules"],
    children: [
      { id: "workflows.all-workflows", label: "All Workflows", href: "/workflows/all", iconName: "Workflow", exact: true, group: "Workflows" },
      {
        id: "workflows.workflow-studio",
        label: "Workflow Studio",
        href: WORKFLOWS_APP_URL,
        external: true,
        iconName: "Workflow",
        description: "Design workflow graphs on the canvas (opens the studio app)",
        color: "purple",
        profileMenu: true,
        dashboard: true,
        group: "Workflows",
      },
      { id: "workflows.workflow-runs", label: "Workflow Runs", href: "/workflows/runs", iconName: "Workflow", group: "Workflows", guestHidden: true },
      { id: "workflows.waiting-on-you", label: "Waiting on You", href: "/workflows/waiting", iconName: "Inbox", group: "Workflows", guestHidden: true },
      { id: "workflows.review", label: "Review", href: "/workflows/review", iconName: "Flag", group: "Workflows", guestHidden: true },
      { id: "workflows.analyze-runs", label: "Analyze Runs", href: "/workflows/runs/analyze", iconName: "BarChart3", group: "Workflows", guestHidden: true },
      { id: "workflows.workflow-battle", label: "Workflow Battle", href: "/workflows/battle", iconName: "Swords", group: "Workflows", guestHidden: true },
      { id: "workflows.orchestras", label: "Orchestras", href: "/agents/orchestras", iconName: "Users", group: "Workflows", guestHidden: true },
      {
        id: "workflows.schedules",
        label: "Schedules",
        href: "/schedules",
        iconName: "CalendarClock",
        description: "Create and manage recurring agent and task schedules",
        color: "blue",
        profileMenu: true,
        dashboard: true,
        group: "Automations",
      },
      { id: "workflows.new-schedule", label: "New Schedule", href: "/schedules/new", iconName: "Plus", actionItem: true },
    ],
  },
  {
    id: "intelligence",
    // Intelligence (Arman, 2026-09-25): how agents, workflows and models serve
    // the application. Mandates are never under Agents. Gains reports.
    label: "Intelligence",
    href: "/mandates/list-preview",
    iconName: INTELLIGENCE_ICON_NAME,
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "How agents and workflows serve the app",
    color: "teal",
    children: [
      {
        id: "intelligence.by-feature",
        // The per-feature intelligence pages (features/mandates/
        // feature-intelligence): every part of the app that uses AI.
        label: "By feature",
        href: "/intelligence",
        iconName: "LayoutGrid",
        description: "Every part of the app that uses AI, and what runs each job for you",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "intelligence.mandates",
        label: "Mandates",
        href: "/mandates/list-preview",
        iconName: "BrainCircuit",
        color: "red",
        description: "The jobs in the app your agents and workflows do, and which one does each",
        profileMenu: true,
        dashboard: true,
      },
      { id: "intelligence.all-mandates", label: "All Mandates", href: "/mandates", iconName: "List", exact: true, guestHidden: true },
      {
        id: "intelligence.decisions",
        // Moved out of admin on Arman's ruling (2026-09-20): a playground is
        // normal UI, never an admin page.
        label: "Decisions",
        href: "/decisions",
        iconName: "Scale",
        description: "Ask a typed decision model named Choice, Score, and Noul questions",
      },
      { id: "intelligence.review-answers", label: "Review Answers", href: "/decisions/review", iconName: "ClipboardCheck", guestHidden: true },
      {
        id: "intelligence.reports",
        label: "Reports",
        href: "/reports",
        iconName: "FileChartColumn",
        description: "Cross-cutting reports — agent drift and more",
        color: "amber",
        profileMenu: true,
        dashboard: true,
      },
      { id: "intelligence.agent-drift", label: "Agent Drift", href: "/reports/agent-drift", iconName: "GitCompareArrows" },
      { id: "intelligence.assists", label: "Assists", href: "/assists", iconName: "Lightbulb", guestHidden: true },
      { id: "intelligence.new-mandate", label: "New Mandate", href: "/mandates/new-preview", iconName: "Plus", actionItem: true, guestHidden: true },
    ],
  },
  {
    id: "masterwork",
    // Masterwork — the feature. The Studio is one surface INSIDE it.
    label: "Masterwork",
    href: "/masterwork",
    iconName: "BookOpen",
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Your expertise as a Rulebook — rules the AI enforces exactly your way",
    color: "violet",
    children: [
      { id: "masterwork.home", label: "Masterwork", href: "/masterwork", iconName: "BookOpen", exact: true },
      { id: "masterwork.all-rulebooks", label: "All Rulebooks", href: "/masterwork/all", iconName: "List" },
      {
        id: "masterwork.ways-to-build-one",
        // The standing Approach catalog — every way to build a Rulebook.
        label: "Ways to build one",
        href: "/masterwork/approaches",
        iconName: "Compass",
        description: "Every way to capture what you know — and what's coming",
      },
      { id: "masterwork.vision-interviews", label: "Vision Interviews", href: "/masterwork/vision-interview", iconName: "Mic", guestHidden: true },
      {
        id: "masterwork.encore",
        // Encore — the Operator door: run a released Masterwork.
        label: "Encore",
        href: "/masterwork/encore",
        iconName: "Zap",
        description: "Run a released Masterwork — expert judgment on demand",
      },
      {
        id: "masterwork.import-your-ai-chats",
        // The provider gallery lives in (public) — anonymous search traffic —
        // but it is a real Masterwork capture lane.
        label: "Import your AI chats",
        href: "/import/ai-chats",
        iconName: "FileInput",
        description: "Export your history from ChatGPT, Claude, Gemini and more — then turn it into rules",
      },
    ],
  },
  {
    id: "knowledge",
    // MEMORY (Arman, 2026-10-20: "Memory" replaces "Knowledge" as the product name —
    // Matrx Memory). The id stays "knowledge" (stored layouts point at ids) and every
    // /knowledge/* address keeps working. The rows follow the Memory sections of
    // common-docs/projects/app-frame/TREE.md: Ask & search, Topics, Everything,
    // Concepts, Research, Capture, Forget & archive, Advanced. Duplicates are allowed
    // (research topics sit under Topics AND Research); they are listed in
    // common-docs/projects/app-frame/MEMORY-DUPLICATES.md. Guests hit `/knowledge`.
    label: "Memory",
    href: "/memory",
    guestHref: "/knowledge",
    iconName: "Brain",
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "What you and your agents remember",
    color: "amber",
    children: [
      {
        id: "memory.ask-search",
        label: "Ask & search",
        href: "/knowledge/hub",
        iconName: "Search",
        children: [
          { id: "knowledge.knowledge-hub", label: "Knowledge hub", href: "/knowledge/hub", iconName: "Search" },
          {
            id: "knowledge.search-lab",
            label: "Search Lab",
            href: SEARCH_LAB_PATH,
            iconName: "FlaskConical",
            description: "Test a search and see why each hit ranked",
          },
        ],
      },
      {
        id: "memory.topics",
        label: "Topics",
        href: "/memory/topics",
        iconName: "Tag",
        guestHidden: true,
        children: [
          { id: "memory.topics-home", label: "Topics", href: "/memory/topics", iconName: "Tag", guestHidden: true },
          { id: "memory.research-topics", label: "Research topics", href: "/research", iconName: "BookOpen" },
          { id: "memory.topics-data-stores", label: "Data Stores", href: "/knowledge/data-stores", iconName: "Database" },
        ],
      },
      {
        id: "memory.everything",
        label: "Everything",
        href: "/memory/everything",
        iconName: "FolderOpen",
        guestHidden: true,
        children: [
          { id: "memory.everything-home", label: "Everything", href: "/memory/everything", iconName: "FolderOpen", guestHidden: true },
          { id: "memory.my-memory", label: "My memory", href: "/memory/my-memory", iconName: "StickyNote", guestHidden: true },
          { id: "memory.agent-memory", label: "Agent memories", href: "/memory/agent-memory", iconName: "Brain", guestHidden: true },
        ],
      },
      {
        id: "memory.concepts",
        label: "Concepts",
        href: "/memory/concepts",
        iconName: "Lightbulb",
        guestHidden: true,
        children: [
          { id: "memory.concepts-home", label: "Concepts", href: "/memory/concepts", iconName: "Lightbulb", guestHidden: true },
          { id: "memory.concepts-graph", label: "Knowledge Graph", href: "/knowledge/graph", iconName: "Network" },
        ],
      },
      {
        id: "memory.research",
        label: "Research",
        href: "/research",
        iconName: "FlaskConical",
        children: [
          {
            id: "knowledge.research",
            label: "Research",
            href: "/research",
            iconName: "FlaskConical",
            description: "Deep research with automated topic analysis",
            color: "purple",
            profileMenu: true,
            dashboard: true,
            group: "Research",
          },
          { id: "knowledge.new-research", label: "New Research", href: "/research/topics/new", iconName: "Plus", actionItem: true },
          {
            id: "knowledge.news",
            label: "News",
            href: "/news",
            iconName: "Newspaper",
            description: "Top headlines and curated news feeds",
            profileMenu: true,
            dashboard: true,
            group: "Research",
          },
          { id: "knowledge.news-window", label: "News Window", href: "/news", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-news-panel" },
          { id: "knowledge.library-catalog", label: "Library Catalog", href: "/knowledge/library-catalog", iconName: "BookOpen", group: "Library" },
          { id: "knowledge.curate-library", label: "Curate Library", href: "/knowledge/library-curate", iconName: "BookmarkCheck", group: "Library", guestHidden: true },
          {
            id: "knowledge.suggestions",
            label: "Suggestions",
            href: "/suggestions",
            iconName: "Lightbulb",
            description: "Review AI-found field values and scope links from your notes, tasks, and files",
            profileMenu: true,
            dashboard: true,
            group: "Library",
          },
          { id: "knowledge.sources", label: "Sources", href: "/knowledge/library", iconName: "FileText", group: "Sources" },
          { id: "knowledge.acquisition-console", label: "Acquisition Console", href: "/acquisition", iconName: "Radar", exact: true, guestHidden: true, group: "Sources" },
          { id: "knowledge.acquisition-blocks", label: "Acquisition Blocks", href: "/acquisition/blocks", iconName: "Boxes", guestHidden: true, group: "Sources" },
          { id: "knowledge.knowledge-graph", label: "Knowledge Graph", href: "/knowledge/graph", iconName: "Network", group: "Graph & data" },
          {
            id: "knowledge.extractions",
            label: "Extractions",
            href: "/knowledge/extractions",
            iconName: "Table",
            description: "Review, manage, and export structured datasets extracted from documents",
            group: "Graph & data",
          },
          { id: "knowledge.data-stores", label: "Data Stores", href: "/knowledge/data-stores", iconName: "Database", group: "Graph & data" },
        ],
      },
      { id: "memory.capture", label: "Capture", href: "/memory/capture", iconName: "Inbox", guestHidden: true },
      { id: "memory.forget", label: "Forget & archive", href: "/memory/trash", iconName: "Trash2", guestHidden: true },
      {
        id: "memory.advanced",
        label: "Advanced",
        href: SEARCH_LAB_PATH,
        iconName: "SlidersHorizontal",
        children: [
          { id: "memory.advanced-search-lab", label: "Search Lab", href: SEARCH_LAB_PATH, iconName: "FlaskConical" },
          { id: "memory.observational", label: "Memory inspector", href: "/memory/observational", iconName: "Eye", guestHidden: true },
          { id: "memory.lab", label: "Memory Lab", href: "/memory/lab", iconName: "Telescope", guestHidden: true },
          { id: "memory.embeddings", label: "Embedding Lab", href: "/memory/embeddings", iconName: "Braces", guestHidden: true },
          { id: "knowledge.repositories", label: "Repositories", href: "/knowledge/repositories", iconName: "Code2" },
          { id: "knowledge.pipeline-flow", label: "Pipeline Flow", href: "/knowledge/flow", iconName: "Workflow", group: "About", guestHidden: true },
          { id: "memory.knowledge-overview", label: "Knowledge overview", href: "/knowledge", iconName: "Library", group: "About" },
          { id: "knowledge.about-knowledge", label: "About Knowledge", href: "/knowledge/about", iconName: "CircleHelp", group: "About" },
          { id: "memory.knowledge-admin", label: "Knowledge admin map", href: "/knowledge/admin", iconName: "ShieldCheck", group: "Admin", guestHidden: true },
          { id: "memory.dictionary-admin", label: "Dictionary admin map", href: "/dictionary/admin", iconName: "Library", group: "Admin", guestHidden: true },
          { id: "memory.old-pages", label: "Old pages to review", href: "/compare/old", iconName: "FolderOpen", group: "Admin", guestHidden: true },
        ],
      },
    ],
  },
  {
    id: "content",
    // content: notes, documents, visual-maps, esign, utilities —
    // authored text and the content store.
    label: "Content",
    href: "/notes",
    iconName: "FileText",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Notes, documents, maps",
    color: "amber",
    children: [
      {
        id: "content.notes",
        label: "Notes",
        href: "/notes",
        iconName: "NotebookPen",
        description: "Create and manage your notes and documents",
        color: "amber",
        profileMenu: true,
        dashboard: true,
        group: "Write",
      },
      {
        id: "content.documents",
        label: "Documents",
        href: "/documents",
        iconName: "FileText",
        description: "Cloud documents — realtime co-editing, full history",
        color: "indigo",
        profileMenu: true,
        dashboard: true,
        group: "Write",
      },
      {
        id: "content.visual-maps",
        label: "Visual Maps",
        href: "/maps",
        iconName: "Network",
        description: "Think visually with editable boxes, sections, and arrows",
        color: "violet",
        profileMenu: true,
        dashboard: true,
        group: "Write",
      },
      // Same destinations as the Workspace / Data / Utilities / Publish / Communications menus, linked here too so
      // everything authored is one click from Content (domain tree: content = spaces, notes, documents, workbooks, utilities).
      { id: "content.visual-map-lab", label: "Visual Map Lab", href: "/visual-maps/lab", iconName: "Network", guestHidden: true, group: "Write" },
      { id: "content.e-signatures", label: "E-Signatures", href: "/esign", iconName: "FileSignature", guestHidden: true, group: "Write" },
      { id: "content.e-sign-templates", label: "E-Sign Templates", href: "/esign/templates", iconName: "FileSignature", guestHidden: true, group: "Write" },
      { id: "content.notes-window", label: "Notes Window", href: "/notes", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-notes-panel" },
      // Creates a blank draft note / cloud document in place, then opens it.
      { id: "content.new-note", label: "New Note", href: "/notes", iconName: "Plus", action: "create-note" },
      { id: "content.new-document", label: "New Document", href: "/documents", iconName: "Plus", action: "create-document" },
      { id: "content.send-for-signature", label: "Send for Signature", href: "/esign/new", iconName: "FileSignature", actionItem: true, guestHidden: true },
    ],
  },
  {
    id: "data",
    // data: custom-data (the record store), data-tables (records, kits,
    // pick-lists), forms, drill-down, scopes-context — records an
    // organization defines and owns.
    label: "Data",
    href: "/data",
    iconName: "Database",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Tables, workbooks, pick lists, shapes and scopes",
    color: "cyan",
    children: [
      ...DATA_NAV_CHILDREN,
      {
        id: "data.workbooks",
        label: "Workbooks",
        href: "/workbooks",
        iconName: "FileSpreadsheet",
        description: "Lossless spreadsheets — multi-sheet, formulas, formatting",
        color: "emerald",
        profileMenu: true,
        dashboard: true,
      },
      { id: "data.new-workbook", label: "New Workbook", href: "/workbooks", iconName: "Plus", action: "create-workbook" },
      {
        id: "data.shapes",
        // User-facing Shape System studio (features/content-ir/studio/) —
        // the shape of structured content is designed where data is.
        label: "Shapes",
        href: SHAPES_ALL_HREF,
        guestHref: SHAPES_ROUTE_BASE,
        iconName: "Shapes",
        description: "Design custom structured-content shapes with an agent",
        color: "violet",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "data.scopes",
        label: "Scopes",
        href: "/scopes",
        iconName: "Layers",
        description:
          "Define the dimensions your team works in — clients, products, teams, repos. Scopes carry context into every agent run.",
        color: "emerald",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
        group: "Scopes",
      },
      { id: "data.context-items", label: "Context Items", href: "/context-items", iconName: "ListTree", guestHidden: true, group: "Scopes" },
      { id: "data.context-switcher-window", label: "Scope Switcher Window", href: "/scopes", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-context-switcher-panel", guestHidden: true },
    ],
  },
  {
    id: "files",
    // files: file-service, pdf, media-durability, storage-sources — the
    // cloud drive (its own service and schema). Not Media.
    label: "Files",
    href: "/files/all",
    guestHref: "/files",
    iconName: "Cloud",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Your cloud files, folders and PDFs",
    color: "blue",
    children: [
      {
        id: "files.all-files",
        label: "All Files",
        href: "/files/all",
        guestHref: "/files",
        iconName: "FolderOpen",
        description: "Browse and manage your files and documents",
        color: "blue",
        profileMenu: true,
        dashboard: true,
      },
      { id: "files.recents", label: "Recents", href: "/files/recents", iconName: "CalendarClock", guestHidden: true },
      { id: "files.starred", label: "Starred", href: "/files/starred", iconName: "Star", guestHidden: true },
      { id: "files.shared", label: "Shared", href: "/files/shared", iconName: "Share2", guestHidden: true },
      { id: "files.folders", label: "Folders", href: "/files/folders", iconName: "Folder", guestHidden: true },
      { id: "files.photos", label: "Photos", href: "/files/photos", iconName: "Image", guestHidden: true },
      { id: "files.google-drive", label: "Google Drive", href: "/files/google-drive", iconName: "FolderOpen", guestHidden: true },
      {
        id: "files.pdf-extractor",
        label: "PDF Extractor",
        href: "/tools/pdf-extractor",
        iconName: "FileScan",
        description: "Upload, extract, and process PDF documents",
        color: "orange",
        profileMenu: true,
        dashboard: true,
        group: "PDF",
      },
      { id: "files.file-requests", label: "File Requests", href: "/files/requests", iconName: "Inbox", group: "Manage", guestHidden: true },
      { id: "files.file-activity", label: "File Activity", href: "/files/activity", iconName: "List", group: "Manage", guestHidden: true },
      { id: "files.file-webhooks", label: "File Webhooks", href: "/files/webhooks", iconName: "Link2", group: "Manage", guestHidden: true },
      { id: "files.file-trash", label: "File Trash", href: "/files/trash", iconName: "Trash2", group: "Manage", guestHidden: true },
      { id: "files.files-window", label: "Files Window", href: "/files/all", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-files-panel" },
      { id: "files.file-upload-window", label: "File Upload Window", href: "/files/all", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-file-upload-panel" },
      { id: "files.pdf-extractor-window", label: "PDF Extractor Window", href: "/tools/pdf-extractor", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-pdf-extractor-panel" },
    ],
  },
  {
    id: "media",
    // media: images, media-capture, media-source-catalog.
    label: "Media",
    href: "/images",
    iconName: "Images",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Images, video libraries and capture",
    color: "pink",
    children: [
      {
        id: "media.presentations",
        label: "Presentations",
        href: "/presentations",
        iconName: "Presentation",
        description: "Slide decks — edit in place, present, share",
        color: "amber",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
      },
      {
        id: "media.images",
        label: "Images",
        href: "/images",
        iconName: "Aperture",
        description: "Browse, generate, edit, annotate, and convert images",
        color: "pink",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "media.libraries",
        // Media Source Catalog — paste a channel, get every video cataloged.
        label: "Libraries",
        href: "/libraries",
        iconName: "Video",
        description: "Catalog a whole YouTube channel, then transcribe and act on it.",
        color: "red",
        profileMenu: true,
        dashboard: true,
      },
      { id: "media.camera", label: "Camera", href: "/camera", iconName: "Aperture", guestHidden: true, group: "Capture" },
      {
        id: "media.scanner",
        label: "Scanner",
        href: "/tools/scanner",
        iconName: "ScanLine",
        description: "Use your phone as a scanner — photos to one searchable PDF",
        color: "orange",
        profileMenu: true,
        dashboard: true,
        group: "Capture",
      },
      { id: "media.gallery-window", label: "Gallery Window", href: "/images", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-gallery-panel" },
      { id: "media.crop-studio-window", label: "Crop Studio Window", href: "/images", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-crop-studio-panel" },
    ],
  },
  {
    id: "audio",
    // audio: audio-tts (the speech engine), transcription, voice settings and
    // read-aloud. `/transcripts` is BOTH the public landing and the processor
    // workspace (server-side branched).
    label: "Audio",
    href: "/transcripts",
    iconName: "AudioLines",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Transcripts, voices and speech",
    color: "rose",
    children: [
      {
        id: "audio.all-transcripts",
        label: "All Transcripts",
        href: "/transcripts",
        iconName: "Mic",
        exact: true,
        description: "Record, transcribe, and manage audio.",
        color: "rose",
        profileMenu: true,
        dashboard: true,
        group: "Transcripts",
      },
      { id: "audio.processor", label: "Processor", href: "/transcripts/processor", iconName: "FileText", group: "Transcripts" },
      { id: "audio.studio", label: "Studio", href: "/transcripts/studio", iconName: "Columns2", group: "Transcripts" },
      { id: "audio.scribe", label: "Scribe", href: "/transcripts/scribe", iconName: "Mic", group: "Transcripts" },
      { id: "audio.unsorted-scribe", label: "Unsorted Scribe", href: "/transcripts/scribe/unsorted", iconName: "Inbox", guestHidden: true, group: "Transcripts" },
      { id: "audio.cleanup", label: "Cleanup", href: "/transcripts/cleanup", iconName: "Eraser", group: "Transcripts" },
      // `/voice` is the public landing for guests and bounces members to the playground.
      { id: "audio.voice-playground", label: "Voice Playground", href: "/voice", iconName: "Speech", group: "Speech" },
      { id: "audio.voice-tester", label: "Voice Tester", href: "/voice/tester", iconName: "Headphones", guestHidden: true, group: "Speech" },
      { id: "audio.voice-settings", label: "Voice Settings", href: `${SETTINGS_BASE}/voice/voices`, iconName: "SlidersHorizontal", guestHidden: true, group: "Speech" },
      { id: "audio.transcript-studio-window", label: "Transcript Studio Window", href: "/transcripts/studio", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-transcript-studio-panel" },
      { id: "audio.voice-pad-window", label: "Voice Pad Window", href: "/transcripts", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-voice-pad-panel" },
      { id: "audio.advanced-voice-pad-window", label: "Advanced Voice Pad Window", href: "/transcripts", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-advanced-voice-pad-panel" },
      { id: "audio.ai-voice-window", label: "AI Voice Window", href: "/transcripts", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-ai-voice-panel" },
      { id: "audio.transcription-cleanup-window", label: "Transcription Cleanup Window", href: "/transcripts/cleanup", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-transcription-cleanup-panel" },
      { id: "audio.new-transcript", label: "New Transcript", href: "/transcripts/new", iconName: "Plus", actionItem: true },
    ],
  },
  {
    id: "code",
    // code (renamed from coding): code-workspace, agent-fs,
    // coding-session-bridge, ide-plugins.
    label: "Code",
    href: "/code",
    iconName: "Code2",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Code, sandboxes and devices",
    color: "indigo",
    children: [
      {
        id: "code.code-workspace",
        label: "Code Workspace",
        href: "/code",
        iconName: "Code2",
        description: "VSCode-style workspace for sandbox and cloud projects",
        color: "indigo",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "code.sandboxes",
        label: "Sandboxes",
        href: "/sandbox",
        iconName: "Container",
        description: "Your AI Agents in a cloud computer with your stuff!",
        color: "orange",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "code.devices",
        label: "Devices",
        href: "/devices",
        iconName: "Laptop",
        description: "Your computers: terminal and files from anywhere",
        color: "sky",
        profileMenu: true,
        dashboard: true,
      },
      { id: "code.coding-connections", label: "Coding Connections", href: "/agent-connections/plugins", iconName: "Plug" },
      { id: "code.code-editor-window", label: "Code Editor Window", href: "/code", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-code-editor-panel" },
      { id: "code.smart-code-editor-window", label: "Smart Code Editor Window", href: "/code", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-smart-code-editor-panel" },
      { id: "code.code-files-window", label: "Code Files Window", href: "/code", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-code-files-panel" },
      // `?create=1` opens the canonical Create Sandbox modal on the list page.
      { id: "code.new-sandbox", label: "New Sandbox", href: "/sandbox?create=1", iconName: "Plus", actionItem: true },
    ],
  },
  {
    id: "publish",
    // publish: cms, html-pages, podcasts, artifacts, printing — everything
    // that leaves the platform.
    label: "Publish",
    href: "/podcast",
    iconName: "Megaphone",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Podcasts, artifacts, sites and print",
    color: "violet",
    // CMS lives in its own route namespace. Keep Publish selected there.
    ownedRoutePrefixes: ["/cms"],
    children: [
      {
        id: "publish.podcasts",
        label: "Podcasts",
        href: "/podcast/studio",
        iconName: "Radio",
        description: "Browse shows and manage podcast studio production",
        color: "violet",
        profileMenu: true,
        dashboard: true,
        group: "Publish",
      },
      {
        id: "publish.artifacts",
        label: "Artifacts",
        href: "/artifacts",
        iconName: "LayoutGrid",
        description: "Agent-generated content library and rich outputs",
        color: "indigo",
        profileMenu: true,
        dashboard: true,
        group: "Publish",
      },
      {
        id: "publish.cms",
        label: "CMS",
        href: "/cms",
        iconName: "Globe",
        description: "Build and manage client sites and published pages",
        color: "sky",
        profileMenu: true,
        dashboard: true,
        group: "Publish",
      },
      { id: "publish.html-pages", label: "HTML Pages", href: "/cms/html-pages", iconName: "FileText", guestHidden: true, group: "Publish" },
      ...inGroup(PRINT_NAV_CHILDREN, "Print"),
      { id: "publish.new-podcast", label: "New Podcast", href: "/podcast/studio/create", iconName: "Plus", actionItem: true },
    ],
  },
  {
    id: "communications",
    // Hidden from guests — DMs and team threads have no meaningful guest
    // experience. Direct-URL access still renders the marketing landing.
    label: "Communications",
    href: "/messages",
    iconName: "Mail",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Messages, meetings and notifications",
    color: "pink",
    guestHidden: true,
    children: [
      {
        id: "communications.messages",
        label: "Messages",
        href: "/messages",
        iconName: "MessageSquare",
        description: "Direct messages and conversations",
        color: "pink",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
      },
      {
        id: "communications.messenger",
        label: MESSENGER_LABEL,
        href: MESSENGER_HREF,
        iconName: "MessagesSquare",
        description: "Your conversations in a desktop messenger",
        color: "pink",
        guestHidden: true,
      },
      {
        id: "communications.meetings",
        label: "Meetings",
        href: "/meetings",
        iconName: "Video",
        description: "Start or schedule a video meeting",
        color: "pink",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
      },
      { id: "communications.notifications", label: "Notifications", href: "/notifications", iconName: "Inbox", guestHidden: true },
      { id: "communications.message-templates", label: "Message Templates", href: "/chat/message-templates", iconName: "MessageSquareQuote", guestHidden: true },
      { id: "communications.your-staff", label: "Your Staff", href: "/staff", iconName: "Users", guestHidden: true },
      { id: "communications.email-window", label: "Email Window", href: "/messages", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-email-panel", guestHidden: true },
      { id: "communications.messages-window", label: "Messages Window", href: "/messages", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-messages-panel", guestHidden: true },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    href: "/crm",
    iconName: "Handshake",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Manage contacts and their history",
    color: "teal",
    guestHidden: true,
    children: [
      {
        id: "crm.people-and-companies",
        label: "Contacts",
        href: "/crm",
        iconName: "Users",
        exact: true,
        description: "Manage people, companies, contact methods, and relationship history",
        color: "teal",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
      },
      {
        id: "crm.deals",
        label: "Deals",
        href: "/crm/deals",
        iconName: "Handshake",
        description: "Track deals through kanban pipelines — value, stage, owner, and expected close",
        color: "teal",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
      },
      {
        id: "crm.outreach-lists",
        label: "Outreach Lists",
        href: "/crm/outreach-lists",
        iconName: "Megaphone",
        description: "Build calling and outreach lists over your CRM records and work them from a queue",
        color: "teal",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
      },
      { id: "crm.outreach-inbox", label: "Outreach Inbox", href: "/crm/inbox", iconName: "Inbox", guestHidden: true },
      { id: "crm.chasebox", label: "Chasebox", href: "/crm/chasebox", iconName: "Mail", guestHidden: true },
      {
        id: "crm.sending-mailboxes",
        label: "Sending Mailboxes",
        href: "/crm/sending-identities",
        iconName: "Send",
        description: "Connect the mailbox your outreach is sent from, prove you own its domain, and watch its delivery health",
        color: "teal",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
      },
      { id: "crm.import-contacts", label: "Import Contacts", href: "/crm/import", iconName: "FileInput", guestHidden: true },
      { id: "crm.duplicates", label: "Duplicates", href: "/crm/duplicates", iconName: "Users", guestHidden: true },
      { id: "crm.crm-manager-window", label: "CRM Manager Window", href: "/crm", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-crm-manager-panel", guestHidden: true },
      { id: "crm.new-person", label: "New Person", href: "/crm", iconName: "Plus", action: "create-crm-person", guestHidden: true },
      { id: "crm.new-company", label: "New Company", href: "/crm", iconName: "Plus", action: "create-crm-company", guestHidden: true },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/marketing",
    iconName: "TrendingUp",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Brands and websites, planning, search and reach, channels, intelligence, and measurement",
    color: "green",
    // GENERATED from features/marketing/lib/marketing-nav.ts — the ONE
    // declaration of this module's shape. Never hand-edit these children.
    children: marketingNavChildren(),
  },
  {
    id: "human-resources",
    // HR — SPEC-UI-IA §2.1. ONE primary entry with the section children below;
    // WHICH of those children a given person sees inside `/hr` is resolved by
    // `resolveHrNav` from their CAPABILITIES, never from a role string.
    //
    // ⚠️ MODULE-OFF ABSENCE IS NOT ENFORCED HERE, AND CANNOT BE: this file is
    // static, server-agnostic data. `/hr` itself renders the enable door for
    // an owner/admin and a plain not-enabled page for everyone else.
    /*
      🚨 THE HR DOORS ARE BUILT, NOT SPELLED — AND `NO_EMPLOYER` IS THE HONEST ARGUMENT.

      `features/hr/routes.ts` bans hand-assembled `/hr/*` URLs because the employer travels in
      `?org=` and HR is strictly single-employer. This file genuinely CANNOT carry the employer
      (static data, no per-org runtime gate), so it passes `null` VISIBLY and the honesty is
      moved to the LANDING: the page names the employer it opened (HrShell's context bar, or
      `HrPageState`'s substitution notice on the PageHeader routes). Building the hrefs also
      keeps this file honest about paths: a route renamed in `routes.ts` moves the sidebar too.
    */
    label: "Human Resources",
    href: hrHref(NO_EMPLOYER),
    iconName: "Users",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "People, time, pay and HR records",
    color: "indigo",
    guestHidden: true,
    children: [
      { id: "human-resources.hr-home", label: "HR Home", href: hrHref(NO_EMPLOYER), iconName: "LayoutDashboard", exact: true, description: "What needs you today", color: "indigo", guestHidden: true },
      { id: "human-resources.my-info", label: "My Info", href: hrMeHref(NO_EMPLOYER), iconName: "User", description: "Your own record — always yours, in every role", color: "indigo", profileMenu: true, guestHidden: true },
      { id: "human-resources.people", label: "People", href: hrPeopleHref({ org: NO_EMPLOYER }), iconName: "Users", description: "The employee directory and the org chart", color: "indigo", guestHidden: true },
      { id: "human-resources.hiring", label: "Hiring", href: hrHiringHref(NO_EMPLOYER), iconName: "Handshake", description: "Requisitions, candidates, interviews and offers", color: "indigo", guestHidden: true },
      { id: "human-resources.time", label: "Time", href: hrTimeHref(NO_EMPLOYER), iconName: "CalendarClock", description: "Timesheets, punches, exceptions and pay periods", color: "indigo", guestHidden: true },
      { id: "human-resources.schedule", label: "Schedule", href: hrScheduleHref(NO_EMPLOYER), iconName: "CalendarDays", description: "Build, publish and staff the schedule", color: "indigo", guestHidden: true },
      { id: "human-resources.time-off", label: "Time Off", href: hrLeaveHref(NO_EMPLOYER), iconName: "HeartPulse", description: "Requests, balances and the team calendar", color: "indigo", guestHidden: true },
      { id: "human-resources.onboarding", label: "Onboarding", href: hrOnboardingHref(NO_EMPLOYER), iconName: "ClipboardCheck", description: "New-hire runs, templates and offboarding", color: "indigo", guestHidden: true },
      { id: "human-resources.documents", label: "Documents", href: hrDocumentsHref(NO_EMPLOYER), iconName: "FileText", description: "The library, acknowledgments and signatures", color: "indigo", guestHidden: true },
      { id: "human-resources.training", label: "Training", href: hrTrainingHref(NO_EMPLOYER), iconName: "GraduationCap", description: "Assignments, certifications and compliance", color: "indigo", guestHidden: true },
      { id: "human-resources.performance", label: "Performance", href: hrPerformanceHref(NO_EMPLOYER), iconName: "Target", description: "Reviews — yours, and your team's", color: "indigo", guestHidden: true },
      { id: "human-resources.assets", label: "Assets", href: hrAssetsHref(NO_EMPLOYER), iconName: "Package", description: "Equipment issued, assigned and recovered", color: "indigo", guestHidden: true },
      { id: "human-resources.engagement", label: "Engagement", href: hrEngagementHref(NO_EMPLOYER), iconName: "Megaphone", description: "Announcements, pulse surveys and recognition", color: "indigo", guestHidden: true },
      { id: "human-resources.compliance", label: "Compliance", href: hrComplianceHref(NO_EMPLOYER), iconName: "ShieldCheck", description: "Exceptions, work authorization and access review", color: "indigo", guestHidden: true },
      { id: "human-resources.hr-tasks", label: "HR Tasks", href: hrTasksHref(NO_EMPLOYER), iconName: "ListTodo", description: "Everything in HR waiting on a decision from you", color: "indigo", guestHidden: true },
      { id: "human-resources.hr-reports", label: "HR Reports", href: hrReportsHref(NO_EMPLOYER), iconName: "BarChart3", description: "Headcount, turnover, cost and compliance reporting", color: "indigo", guestHidden: true },
      { id: "human-resources.hr-settings", label: "HR Settings", href: hrSettingsHref(null, { org: NO_EMPLOYER }), iconName: "Settings", description: "How HR works for this employer", color: "indigo", guestHidden: true },
    ],
  },
  {
    id: "web",
    // web: scraper, web-search, persistent-cloud-browser, residential-egress —
    // every way the platform reaches the web.
    label: "Web",
    href: "/scraper",
    guestHref: "/features",
    iconName: "Globe",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Scrape, search and reach the web",
    color: "orange",
    children: [
      {
        id: "web.webscraper",
        label: "Webscraper",
        href: "/scraper",
        guestHref: "/features",
        iconName: "Globe",
        description: "Extract and process data from web sources",
        color: "orange",
        profileMenu: true,
        dashboard: true,
      },
      { id: "web.search", label: "Search", href: "/search", iconName: "Search" },
      { id: "web.web-scraper-window", label: "Web Scraper Window", href: "/scraper", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-web-scraper-panel" },
      { id: "web.site-workbench-window", label: "Site Workbench Window", href: "/tools/pdf-extractor", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-site-workbench-panel" },
    ],
  },
  {
    id: "utilities",
    // utilities: small free text and data tools — their own domain, not part of Content.
    label: "Utilities",
    href: "/markdown-studio",
    iconName: "Wrench",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Small text and data tools",
    color: "orange",
    children: [
      {
        id: "utilities.markdown-studio",
        label: "Markdown Studio",
        href: "/markdown-studio",
        iconName: "PenLine",
        description: "Interactive markdown editor and parser comparison",
        color: "slate",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "utilities.data-truncator",
        label: "Data Truncator",
        href: "/free/data-truncator",
        iconName: "Scissors",
        description: "Trim and preview truncated text for UI limits",
        color: "orange",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "utilities.character-counter",
        label: "Character Counter",
        href: "/free/character-counter",
        iconName: "TextCursorInput",
        description: "Count characters, words, limits, and keyword density locally",
        color: "orange",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "utilities.uuid-generator",
        label: "UUID Generator",
        href: "/free/uuid/generator",
        iconName: "Hash",
        description: "Generate UUIDs on the client — single or bulk",
        color: "orange",
        profileMenu: true,
        dashboard: true,
      },
      {
        id: "utilities.zip-code-heatmap",
        label: "Zip Code Heatmap",
        href: "/free/zip-code-heatmap",
        iconName: "Map",
        description: "Visualize US zip code density on an interactive map",
        color: "orange",
        profileMenu: true,
        dashboard: true,
      },
      { id: "utilities.json-truncator-window", label: "JSON Truncator Window", href: "/free/data-truncator", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-json-truncator-panel" },
      { id: "utilities.character-counter-window", label: "Character Counter Window", href: "/free/character-counter", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-character-counter-panel" },
    ],
  },
  {
    id: "computer",
    // computer (Arman, 2026-10-04): the person's own computer, through the
    // desktop app — connecting it and the devices already connected.
    label: "Computer",
    href: "/local",
    iconName: "Monitor",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Your computer, via the desktop app",
    color: "slate",
    guestHidden: true,
    children: [
      { id: "computer.my-devices", label: "My Devices", href: "/local", iconName: "Laptop", guestHidden: true },
      { id: "computer.connect-a-computer", label: "Connect a Computer", href: "/connect-computer", iconName: "Monitor", guestHidden: true },
    ],
  },
  {
    id: "integrations",
    // google, microsoft, github, bing, mcp-connections, provider-access,
    // connector-catalog. The Connectors directory is the one place to find
    // and connect any of them; screens that live inside other features
    // (Bing, databases, this computer) are listed there and open in place.
    label: "Integrations",
    href: "/user-settings/integrations",
    iconName: "Plug",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Every connection, yours and shared",
    color: "sky",
    guestHidden: true,
    children: [
      { id: "integrations.connectors", label: "Connectors", href: "/user-settings/integrations", iconName: "Plug", guestHidden: true },
      { id: "integrations.connected-sources", label: "Connected Sources", href: "/connected-sources", iconName: "Link2", guestHidden: true },
      { id: "integrations.connect-your-ai", label: "Connect your AI", href: "/bring-your-work", iconName: "Import", guestHidden: true },
    ],
  },
  {
    id: "account",
    // The user-facing half of platform: organizations, settings,
    // vault-secrets, approvals, trash-and-exports.
    label: "Account",
    href: "/organizations",
    guestHidden: true,
    iconName: "Building2",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Orgs, vault and settings",
    color: "sky",
    children: [
      {
        id: "account.my-orgs",
        label: "My Orgs",
        href: "/organizations",
        iconName: "Building2",
        description: "Your teams and shared workspaces",
        color: "sky",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
        group: "Organizations",
      },
      { id: "account.approvals", label: "Approvals", href: "/approvals", iconName: "ClipboardCheck", guestHidden: true, group: "Organizations" },
      {
        id: "account.vault",
        label: "Vault",
        href: "/vault",
        iconName: "ShieldCheck",
        description:
          "Every login, API key, and token the platform signs in with — encrypted, shareable one-to-one, and usable by agents without ever showing them the value.",
        color: "amber",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
        group: "You",
      },
      {
        id: "account.authenticator",
        label: "Authenticator",
        href: "/vault/authenticator",
        iconName: "KeyRound",
        description: "Rotating six-digit sign-in codes: scan a QR code, paste a setup key, copy a code.",
        color: "amber",
        profileMenu: true,
        dashboard: true,
        guestHidden: true,
        group: "You",
      },
      // Not exact: every /user-settings/* page lights Account, not only the landing.
      { id: "account.settings", label: "Settings", href: SETTINGS_BASE, iconName: "Settings", color: "slate", group: "You" },
      { id: "account.welcome", label: "Welcome", href: "/welcome", iconName: "Rocket", guestHidden: true, group: "You" },
      { id: "account.meet-matrx", label: "Meet Matrx", href: "/meet-matrx", iconName: "Compass", guestHidden: true, group: "You" },
      { id: "account.access-log", label: "Access Log", href: "/me/access-log", iconName: "Eye", guestHidden: true, group: "You" },
      { id: "account.bring-your-export", label: "Bring Your Export", href: "/exports", iconName: "FileInput", guestHidden: true, group: "You" },
      { id: "account.trash", label: "Trash", href: "/trash", iconName: "Trash2", exact: true, color: "slate", guestHidden: true, group: "You" },
      { id: "account.preferences-window", label: "Preferences Window", href: SETTINGS_BASE, iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-preferences-panel" },
      { id: "account.vault-window", label: "Vault Window", href: "/vault", iconName: NAV_WINDOW_PANEL_ICON, panelAction: "open-vault-panel", guestHidden: true },
      // `?create=1` opens the canonical Create Organization modal.
      { id: "account.new-org", label: "New Org", href: "/organizations?create=1", iconName: "Plus", actionItem: true, guestHidden: true },
    ],
  },
  {
    id: "industries",
    // ONE pinnable Industries menu (domain tree). THREE LEVELS (Arman,
    // 2026-10-02): this flyout lists ONLY the industries; each industry opens
    // its own full menu beside it. About 50 are planned — adding one is ONE
    // entry in INDUSTRY_NAV_CHILDREN, nothing else.
    label: "Industries",
    href: "/education",
    iconName: "Landmark",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Education, legal, commerce and medical",
    color: "emerald",
    ownedRoutePrefixes: ["/legal", "/commerce", "/medical", "/tools/product-capture", "/capture"],
    children: INDUSTRY_NAV_CHILDREN,
  },
  {
    id: "other",
    // TEMPORARY holding pen (Arman, 2026-10-02): destinations with no clear
    // domain yet. The pink icon is deliberate — it is a reminder to place
    // them. Every row here has a line in common-docs/operations/conflicts.md.
    label: "Other",
    href: "/features",
    iconName: "CircleHelp",
    tone: "attention",
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Not yet placed in a domain",
    color: "pink",
    children: [
      {
        id: "other.matrx-jump",
        label: "Matrx Jump",
        href: "/free/games/matrx-jump",
        iconName: "Gamepad2",
        description: "Jump-and-run arcade game with character maker",
        color: "purple",
        profileMenu: true,
        dashboard: true,
        group: "Games",
      },
      {
        id: "other.tic-tac-toe",
        label: "Tic Tac Toe",
        href: "/free/games/tic-tac-toe",
        iconName: "Gamepad2",
        description: "Classic tic-tac-toe in the browser",
        color: "purple",
        profileMenu: true,
        dashboard: true,
        group: "Games",
      },
      { id: "other.browse-features", label: "Browse Features", href: "/features", iconName: "LayoutGrid", group: "Unplaced" },
    ],
  },
];

// Admin navigation — optional `adminSurfaces` per row (section === "admin" only):
//   ["sidebar"]      → desktop secondary panel only
//   ["headerMenu"]   → profile dropdown Admin block only
//   both or omitted  → both (default)
export const adminNavItems: ShellNavItem[] = [
  {
    id: "admin.admin-dashboard",
    label: "Admin Dashboard",
    href: "/administration",
    iconName: "ShieldCheck",
    section: "admin",
    category: "primary",
    color: "red",
  },
  {
    id: "admin.official-components",
    label: "Official Components",
    href: "/administration/ui/official-components",
    iconName: "Puzzle",
    section: "admin",
    category: "primary",
    color: "violet",
  },
  {
    id: "admin.reports",
    label: "Reports",
    href: "/administration/reporting/reports",
    iconName: "FileChartColumn",
    section: "admin",
    category: "primary",
    color: "amber",
  },
  {
    id: "admin.admins-and-levels",
    label: "Admins & Levels",
    href: "/administration/users/admins",
    iconName: "Shield",
    section: "admin",
    category: "primary",
    color: "red",
  },
  {
    id: "admin.sandbox-admin",
    label: "Sandbox Admin",
    href: "/administration/compute/sandbox",
    iconName: "Container",
    section: "admin",
    category: "Automation",
    color: "orange",
  },
];

/**
 * The phone's bottom dock — the seven most-used destinations, unchanged by the
 * domain reorganization (the dock is a launcher, not the menu tree).
 */
// The phone dock uses the strip's own names and icons, so the two never disagree.
export const dockItems: ShellNavItem[] = [
  { id: "workspace", label: "Workspace", href: "/dashboard", guestHref: "/features", iconName: "LayoutDashboard", section: "primary", dockOrder: 1 },
  { id: "chat", label: "Chat", href: "/chat/new", guestHref: "/chat", iconName: "MessageCircle", section: "primary", dockOrder: 2 },
  { id: "agents", label: "Agents", href: "/agents/all", guestHref: "/agents", iconName: AGENT_ICON_NAME, section: "primary", dockOrder: 3 },
  { id: "content", label: "Content", href: "/notes", iconName: "FileText", section: "primary", dockOrder: 4 },
  { id: "data", label: "Data", href: "/data", iconName: "Database", section: "primary", dockOrder: 5 },
  { id: "account", label: "Account", href: "/organizations", iconName: "Building2", section: "primary", dockOrder: 6, guestHidden: true },
  { id: "files", label: "Files", href: "/files/all", guestHref: "/files", iconName: "Cloud", section: "primary", dockOrder: 7 },
];

export interface ShellNavChildSection {
  label?: string;
  items: ShellNavChild[];
}

/** Preserve child order; consecutive items sharing a `group` render under one label. */
export function groupNavChildren(
  children: ShellNavChild[],
): ShellNavChildSection[] {
  const sections: ShellNavChildSection[] = [];
  for (const child of children) {
    const label = child.group;
    const last = sections[sections.length - 1];
    if (last && last.label === label) {
      last.items.push(child);
    } else {
      sections.push({ label, items: [child] });
    }
  }
  return sections;
}

/**
 * Is this child an **action** (a create/add affordance) rather than a
 * navigation destination? True when it carries an overlay `action` handler or
 * is explicitly flagged with `actionItem`. Single source of truth for the
 * distinction — every surface partitions the same way.
 */
export function isNavActionChild(child: ShellNavChild): boolean {
  return child.actionItem === true || child.action != null;
}

/** Window-panel affordance — rendered between destinations and create actions. */
export function isNavPanelChild(child: ShellNavChild): boolean {
  return child.panelAction != null;
}

export interface PartitionedNavChildren {
  /** Navigation destinations, grouped into labeled sections (top of the menu). */
  sections: ShellNavChildSection[];
  /** Window panels (middle section — divider + panel icon, above create actions). */
  panels: ShellNavChild[];
  /** Create/add affordances, in source order (bottom of the menu, below a divider). */
  actions: ShellNavChild[];
}

/**
 * The house standard for rendering a nav group's children: navigation
 * destinations first (grouped), then every action (create/add) collected
 * together at the BOTTOM — independent of their order in the source array.
 *
 * Every menu surface (desktop flyout, mobile sheet) funnels through this so the
 * layout is identical everywhere: destinations up top, a divider, then the
 * "add" actions. Authors never have to hand-order actions to the end; flagging
 * a child (via `action` or `actionItem`) is enough.
 */
export function partitionNavChildren(
  children: ShellNavChild[],
): PartitionedNavChildren {
  const visible = children;
  const navChildren = visible.filter(
    (c) => !isNavActionChild(c) && !isNavPanelChild(c),
  );
  const panelChildren = visible.filter(isNavPanelChild);
  const actions = visible.filter(isNavActionChild);
  return {
    sections: groupNavChildren(navChildren),
    panels: panelChildren,
    actions,
  };
}

/**
 * Filter + rewrite nav items for the current viewer. Authenticated
 * visitors get the full list with workspace hrefs; guests get the list
 * minus `guestHidden` items, with `guestHref` swapped in where defined.
 *
 * Single source of truth for the rule — Sidebar, MobileSideSheet, and
 * MobileDockItems all funnel through this so the three surfaces stay
 * consistent.
 */
export function navItemsForViewer<T extends ShellNavItem | ShellNavChild>(
  items: T[],
  isAuthenticated: boolean,
): T[] {
  if (isAuthenticated) return items;
  return items
    .filter((item) =>
      "guestHidden" in item ? !(item as ShellNavItem).guestHidden : true,
    )
    .map((item) => {
      const guestHref =
        "guestHref" in item ? (item as ShellNavItem).guestHref : undefined;
      const children =
        "children" in item ? (item as ShellNavItem).children : undefined;
      // Children carry the same guest fields: a former top-level row folded
      // into a domain keeps hiding from (or re-pointing for) guests.
      const next = guestHref ? { ...item, href: guestHref } : item;
      return children
        ? { ...next, children: navItemsForViewer(children, false) }
        : next;
    });
}

/** A single pinnable/navigable destination flattened out of the nav tree. */
export interface NavDestination {
  label: string;
  href: string;
  iconName: ShellIconName;
  color?: string;
  description?: string;
  external?: boolean;
}

/**
 * Every nav DESTINATION flagged `dashboard: true` — top-level items plus
 * non-action group children — flattened and deduped by href. The single source
 * for "things a user can pin / spotlight" (Favorites manager, Discover pool),
 * so those surfaces never hand-maintain a parallel list.
 */
export function flattenNavDestinations(): NavDestination[] {
  const out: NavDestination[] = [];
  const seen = new Set<string>();
  const push = (d: NavDestination) => {
    if (seen.has(d.href)) return;
    seen.add(d.href);
    out.push(d);
  };
  for (const item of primaryNavItems) {
    if (item.dashboard) {
      push({
        label: item.label,
        href: item.href,
        iconName: item.iconName,
        color: item.color,
        description: item.description,
        external: item.external,
      });
    }
    for (const child of expandNavChildren(item.children)) {
      if (child.dashboard && !isNavActionChild(child)) {
        push({
          label: child.label,
          href: child.href,
          iconName: child.iconName,
          color: child.color,
          description: child.description,
          external: child.external,
        });
      }
    }
  }
  return out;
}

export const settingsItem: ShellNavItem = {
  id: "settings",
  label: "Settings",
  href: SETTINGS_BASE,
  iconName: "Settings",
  section: "primary",
  profileMenu: true,
  dashboard: false,
  description: "Manage your account and preferences",
  color: "slate",
  children: [
    {
      id: "settings.home",
      label: "Settings",
      href: SETTINGS_BASE,
      iconName: "Settings",
      description: "Manage your account and preferences",
      color: "slate",
      profileMenu: true,
      exact: true,
    },
    {
      id: "settings.preferences-window",
      label: "Preferences Window",
      href: SETTINGS_BASE,
      iconName: NAV_WINDOW_PANEL_ICON,
      panelAction: "open-preferences-panel",
    },
    {
      id: "settings.trash",
      // Cross-cutting, not per-feature: one page for everything the user has
      // soft-deleted, driven by entity_types.user_artifact_kind.
      label: "Trash",
      href: "/trash",
      iconName: "Trash2",
      description: "Restore anything you've deleted",
      color: "slate",
      profileMenu: true,
      dashboard: false,
      exact: true,
    },
  ],
};

export const iconColorMap: Record<string, string> = {
  sky: "bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400",
  indigo:
    "bg-indigo-500/15 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400",
  amber:
    "bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
  emerald:
    "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400",
  violet:
    "bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400",
  blue: "bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400",
  teal: "bg-teal-500/15 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400",
  purple:
    "bg-purple-500/15 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400",
  rose: "bg-rose-500/15 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-400",
  orange:
    "bg-orange-500/15 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400",
  green:
    "bg-green-500/15 text-green-600 dark:bg-green-400/15 dark:text-green-400",
  pink: "bg-pink-500/15 text-pink-600 dark:bg-pink-400/15 dark:text-pink-400",
  red: "bg-red-500/15 text-red-600 dark:bg-red-400/15 dark:text-red-400",
  slate:
 "bg-slate-500/15 text-muted-foreground dark:bg-slate-400/15 ",
};
