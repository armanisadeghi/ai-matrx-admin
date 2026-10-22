// THE PRODUCT LIST for the new app frame — one row per tile the app grid shows, in the owner's
// order. Source: common-docs/projects/app-frame/TREE.md (Arman's working tree, 2026-10-20,
// verbatim); a tile's sidebar mirrors that tree's second level. Change names, families and
// menus HERE only, and only to follow the tree. NOT tiles: the account menu (profile,
// organizations, billing, settings, vault, devices, approvals, trash, export, sign out) and
// Admin (its own site); search, notifications, the side chat and the canvas live in the frame.
// Host-agnostic data (lucide icons + design-system chip hues), so it moves into @ai-matrx/shell
// as a copy.
import {
  Activity,
  AppWindow,
  Archive,
  AudioLines,
  AudioWaveform,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Camera,
  CheckCheck,
  ClipboardList,
  Clock,
  Code2,
  Compass,
  Contact,
  Container,
  Copy,
  Crop,
  Database,
  Ellipsis,
  Eye,
  FileSignature,
  FileText,
  Flame,
  Folder,
  FolderInput,
  Gamepad2,
  Gavel,
  GraduationCap,
  HardDrive,
  HeartHandshake,
  History,
  House,
  IdCard,
  Image,
  Images,
  Import,
  Inbox,
  Infinity as InfinityIcon,
  Kanban,
  Laptop,
  LayoutDashboard,
  LayoutGrid,
  Library,
  ListChecks,
  ListTree,
  Mail,
  Map,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Mic,
  Microscope,
  Network,
  NotebookPen,
  Package,
  Phone,
  Plug,
  PlugZap,
  Podcast,
  Presentation,
  Printer,
  QrCode,
  Rewind,
  ScanLine,
  ScrollText,
  Search,
  Send,
  Shapes,
  Share2,
  Sheet,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Speech,
  SquarePen,
  Star,
  Stethoscope,
  Sun,
  Swords,
  Table2,
  Tags,
  Target,
  Telescope,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  Users,
  Video,
  Waypoints,
  Webhook,
  Workflow,
  Wrench,
} from "lucide-react";

/** The Chat product's icon — also the side chat's (its door and title), never the reserved Agents glyph. */
export const CHAT_PRODUCT_ICON = MessageSquare;
import { INTELLIGENCE_ICON } from "@ai-matrx/icons/domain";
// HR is the one product whose URLs are owned by a routes module rather than
// written here — `features/hr/__tests__/no-hand-built-hr-urls.test.ts` fails a
// literal in navigation position. The other products have no such module.
import { HR_HREF } from "@/features/hr/routes";
import type { FramePin, FrameProduct, ProductFamily } from "./types";

export const PRODUCT_FAMILIES: readonly { id: ProductFamily; label: string }[] = [
  { id: "yours", label: "Yours" },
  { id: "memory", label: "Memory" },
  { id: "build", label: "Build" },
  { id: "productivity", label: "Productivity" },
  { id: "business", label: "Business" },
  { id: "solutions", label: "Solutions" },
  { id: "more", label: "More" },
];

/** A product whose whole menu is one unlabelled section. */
function oneSection(items: FrameProduct["menu"][number]["items"]): FrameProduct["menu"] {
  return [{ id: "main", items }];
}

export const PRODUCTS: readonly FrameProduct[] = [
  // ── Yours ────────────────────────────────────────────────────────────
  {
    // ONE entry page (Start, Dashboard or Launchpad — the person picks); never listed as a feature.
    id: "home",
    name: "Home",
    family: "yours",
    icon: House,
    color: "blue",
    homeHref: "/home",
    menu: oneSection([
      { id: "today", label: "Today", icon: Sun },
      { id: "browse", label: "Browse everything", icon: Compass },
    ]),
  },
  {
    id: "workspace",
    name: "Workspace",
    family: "yours",
    icon: LayoutGrid,
    color: "sky",
    homeHref: "/workspace",
    menu: oneSection([
      { id: "boards", label: "Boards", icon: Kanban },
      { id: "war-rooms", label: "War Rooms", icon: Swords },
      { id: "spaces", label: "Spaces", icon: Folder },
      { id: "pages", label: "Pages & Dashboards", icon: LayoutDashboard },
      { id: "make", label: "Make", icon: Shapes },
      { id: "projects", label: "Projects & Tasks", icon: ListChecks },
    ]),
  },
  {
    id: "chat",
    name: "Chat",
    family: "yours",
    icon: CHAT_PRODUCT_ICON,
    color: "indigo",
    homeHref: "/chat",
    menu: [
      {
        id: "main",
        items: [
          { id: "chats", label: "Chats", icon: MessageSquare },
          { id: "voice", label: "Voice / Talk", icon: Mic },
          { id: "agent-messenger", label: "Agent Messenger", icon: MessagesSquare },
          { id: "imported", label: "Imported AI chats", icon: Import },
        ],
      },
      {
        // Sample content (the person's recent chats), not structure.
        id: "recent",
        label: "Recent",
        items: [
          { id: "c-1", label: "Quarterly plan outline", icon: MessageSquare },
          { id: "c-2", label: "Rewrite the intake form", icon: MessageSquare },
          { id: "c-3", label: "Summarize the Lopez call", icon: MessageSquare },
        ],
      },
    ],
  },
  // ── Memory (was Knowledge) — the platform's coming differentiator ────
  {
    id: "memory",
    name: "Memory",
    family: "memory",
    // Infinity: everything you know, kept and connected. Never Sparkles; INTELLIGENCE_ICON is Intelligence's.
    icon: InfinityIcon,
    color: "fuchsia",
    homeHref: "/memory",
    menu: [
      {
        id: "main",
        items: [
          { id: "ask", label: "Ask & search", icon: Search },
          { id: "topics", label: "Topics", icon: Tags },
          { id: "everything", label: "Everything", icon: Archive },
          { id: "concepts", label: "Concepts", icon: Waypoints },
        ],
      },
      {
        id: "research",
        label: "Research",
        items: [
          { id: "research", label: "Research", icon: Telescope },
          { id: "library", label: "Library", icon: Library },
          { id: "sources", label: "Sources", icon: BookOpen },
          { id: "graph", label: "Graph, extractions, data stores", icon: Network },
        ],
      },
      {
        id: "keep",
        items: [
          { id: "capture", label: "Capture", icon: Upload },
          { id: "forget", label: "Forget & archive", icon: Trash2 },
          { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
        ],
      },
    ],
  },
  // ── Build ────────────────────────────────────────────────────────────
  {
    id: "intelligence",
    name: "Intelligence",
    family: "build",
    icon: INTELLIGENCE_ICON,
    color: "violet",
    homeHref: "/intelligence",
    menu: oneSection([
      { id: "mandates", label: "Mandates", icon: ListChecks },
      { id: "agents", label: "Agents", icon: Webhook },
      { id: "workflows", label: "Workflows", icon: Workflow },
      { id: "hindsight", label: "Hindsight", icon: Eye },
      { id: "replay", label: "Replay", icon: Rewind },
      { id: "shapes", label: "Shapes", icon: Shapes },
    ]),
  },
  {
    id: "masterwork",
    name: "Masterwork",
    family: "build",
    icon: Telescope,
    color: "indigo",
    homeHref: "/masterwork",
    menu: oneSection([
      { id: "vision-interviews", label: "Vision interviews", icon: Speech },
      { id: "rulebooks", label: "Rulebooks", icon: ScrollText },
      { id: "ways-to-build", label: "Ways to build", icon: Wrench },
      { id: "encore", label: "Encore", icon: Award },
      { id: "import-chats", label: "Import AI chats", icon: Import },
    ]),
  },
  {
    id: "applets",
    name: "Applets",
    family: "build",
    icon: AppWindow,
    color: "sky",
    homeHref: "/applets",
    menu: oneSection([
      { id: "all", label: "All applets", icon: AppWindow },
      { id: "templates", label: "Templates", icon: LayoutDashboard },
      { id: "build", label: "Build an applet", icon: SquarePen },
    ]),
  },
  {
    id: "code",
    name: "Code",
    family: "build",
    icon: Code2,
    color: "slate",
    homeHref: "/code",
    menu: oneSection([
      { id: "workspace", label: "Workspace", icon: Laptop },
      { id: "sandboxes", label: "Sandboxes", icon: Container },
      { id: "connections", label: "Coding connections", icon: PlugZap },
      { id: "editor", label: "Editor", icon: Code2 },
    ]),
  },
  {
    id: "connectors",
    name: "Connectors",
    family: "build",
    icon: Plug,
    color: "teal",
    homeHref: "/connectors",
    menu: oneSection([
      { id: "catalog", label: "Catalog", icon: LayoutGrid },
      { id: "sources", label: "Connected sources", icon: FolderInput },
      { id: "agent-connections", label: "Agent connections", icon: Webhook },
      { id: "connect-ai", label: "Connect your AI", icon: PlugZap },
    ]),
  },
  // ── Productivity ─────────────────────────────────────────────────────
  {
    id: "docs",
    name: "Docs",
    family: "productivity",
    icon: FileText,
    color: "blue",
    homeHref: "/docs",
    menu: [
      {
        id: "main",
        items: [
          { id: "notes", label: "Notes", icon: NotebookPen, count: 118 },
          { id: "documents", label: "Documents", icon: FileText, count: 42 },
          { id: "slides", label: "Slides", icon: Presentation, count: 7 },
          { id: "visual-maps", label: "Visual maps", icon: Map },
          { id: "markdown-studio", label: "Markdown studio", icon: SquarePen },
        ],
      },
      {
        // Sample content (the person's folders), not structure.
        id: "folders",
        label: "Folders",
        items: [
          { id: "f-handbook", label: "Company handbook", icon: Folder },
          { id: "f-clients", label: "Client work", icon: Folder },
          { id: "f-drafts", label: "Drafts", icon: Folder },
        ],
      },
    ],
  },
  {
    id: "data",
    name: "Data",
    family: "productivity",
    icon: Database,
    color: "emerald",
    homeHref: "/data",
    menu: oneSection([
      { id: "bases", label: "Bases & tables", icon: Table2 },
      { id: "sheets", label: "Sheets", icon: Sheet },
      { id: "forms", label: "Forms", icon: ClipboardList },
      { id: "pick-lists", label: "Pick lists", icon: ListTree },
      { id: "templates", label: "Templates, compare, data-to-model", icon: LayoutDashboard },
      { id: "scopes", label: "Scopes & context", icon: Shapes },
    ]),
  },
  {
    id: "drive",
    name: "Drive",
    family: "productivity",
    icon: HardDrive,
    color: "cyan",
    homeHref: "/drive",
    menu: oneSection([
      { id: "all", label: "All files", icon: Folder },
      { id: "recents", label: "Recents", icon: History },
      { id: "starred", label: "Starred", icon: Star },
      { id: "shared", label: "Shared", icon: Share2 },
      { id: "folders", label: "Folders", icon: Folder },
      { id: "photos", label: "Photos", icon: Images },
      { id: "google-drive", label: "Google Drive", icon: HardDrive },
      { id: "requests", label: "File requests", icon: Inbox },
      { id: "activity", label: "Activity", icon: Activity },
      { id: "webhooks", label: "Webhooks", icon: Webhook },
      { id: "trash", label: "Trash", icon: Trash2 },
    ]),
  },
  {
    id: "media",
    name: "Media",
    family: "productivity",
    icon: Image,
    color: "violet",
    homeHref: "/media",
    menu: oneSection([
      { id: "images", label: "Images", icon: Image },
      { id: "camera", label: "Camera", icon: Camera },
      { id: "gallery", label: "Gallery", icon: Images },
      { id: "crop", label: "Crop", icon: Crop },
      { id: "video", label: "Video", icon: Video },
    ]),
  },
  {
    id: "audio",
    name: "Audio",
    family: "productivity",
    icon: AudioLines,
    color: "rose",
    homeHref: "/audio",
    menu: oneSection([
      { id: "transcripts", label: "Transcripts", icon: FileText },
      { id: "scribe", label: "Scribe", icon: Mic },
      { id: "transcript-studio", label: "Transcript studio", icon: SquarePen },
      { id: "cleanup", label: "Cleanup", icon: CheckCheck },
      { id: "voice-playground", label: "Voice playground", icon: AudioWaveform },
      { id: "voices", label: "Voices", icon: Speech },
    ]),
  },
  // ── Business ─────────────────────────────────────────────────────────
  {
    id: "crm",
    name: "CRM",
    family: "business",
    icon: Contact,
    color: "orange",
    homeHref: "/crm",
    menu: oneSection([
      { id: "people", label: "Contacts", icon: Users, count: 1284 },
      { id: "deals", label: "Deals", icon: Target, count: 27 },
      { id: "outreach", label: "Outreach", icon: Send },
      { id: "chasebox", label: "Chasebox", icon: Inbox, count: 3 },
      { id: "mailboxes", label: "Mailboxes", icon: Mail },
      { id: "import", label: "Import", icon: Import },
      { id: "duplicates", label: "Duplicates", icon: Copy },
    ]),
  },
  {
    id: "hr",
    name: "HR",
    family: "business",
    icon: IdCard,
    color: "amber",
    homeHref: HR_HREF,
    menu: oneSection([
      { id: "home", label: "Home", icon: House },
      { id: "my-info", label: "My info", icon: UserRound },
      { id: "people", label: "People", icon: Users },
      { id: "hiring", label: "Hiring", icon: UserPlus },
      { id: "time", label: "Time", icon: Clock },
      { id: "schedule", label: "Schedule", icon: CalendarDays },
      { id: "time-off", label: "Time off", icon: CalendarClock },
      { id: "onboarding", label: "Onboarding", icon: ListChecks },
      { id: "documents", label: "Documents", icon: FileText },
      { id: "training", label: "Training", icon: GraduationCap },
      { id: "performance", label: "Performance", icon: Target },
      { id: "assets", label: "Assets", icon: Package },
      { id: "engagement", label: "Engagement", icon: HeartHandshake },
      { id: "compliance", label: "Compliance", icon: ShieldCheck },
      { id: "reports", label: "Reports", icon: BarChart3 },
    ]),
  },
  {
    id: "marketing",
    name: "Marketing",
    family: "business",
    icon: Megaphone,
    color: "lime",
    homeHref: "/marketing",
    menu: oneSection([
      { id: "hub", label: "Hub", icon: LayoutGrid },
      { id: "brands", label: "Brands", icon: Tags },
      { id: "seo", label: "SEO", icon: Search },
      { id: "search-console", label: "Search console", icon: BarChart3 },
      { id: "social", label: "Social", icon: Share2 },
      { id: "cms", label: "CMS & pages", icon: LayoutDashboard },
      { id: "podcasts", label: "Podcasts", icon: Podcast },
      { id: "artifacts", label: "Artifacts", icon: Package },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "automations", label: "Automations", icon: Workflow },
      { id: "approvals", label: "Approvals", icon: CheckCheck },
      { id: "research", label: "Research", icon: Microscope },
      { id: "heatmap", label: "Heatmap", icon: Flame },
    ]),
  },
  {
    id: "meet",
    name: "Meet",
    family: "business",
    icon: Video,
    color: "sky",
    homeHref: "/meet",
    menu: oneSection([
      { id: "meetings", label: "Meetings", icon: Video },
      { id: "calls", label: "Calls", icon: Phone },
      { id: "booking", label: "Booking", icon: CalendarClock },
    ]),
  },
  {
    id: "messages",
    name: "Messages",
    family: "business",
    icon: MessagesSquare,
    color: "blue",
    homeHref: "/messages",
    menu: oneSection([
      { id: "messenger", label: "Messenger", icon: MessagesSquare },
      { id: "email", label: "Email", icon: Mail },
      { id: "sms", label: "SMS", icon: Smartphone },
      { id: "templates", label: "Templates", icon: LayoutDashboard },
      { id: "staff", label: "Your staff", icon: UserRound },
    ]),
  },
  {
    id: "business-tools",
    name: "Business Tools",
    shortName: "Tools",
    family: "business",
    icon: Briefcase,
    color: "slate",
    homeHref: "/business-tools",
    menu: oneSection([
      { id: "esign", label: "E-signatures", icon: FileSignature },
      { id: "pdf", label: "PDF & scans", icon: ScanLine },
      { id: "print", label: "Print & labels", icon: Printer },
      { id: "qr", label: "QR codes & barcodes", icon: QrCode },
      { id: "utilities", label: "Utilities", icon: Wrench },
    ]),
  },
  // ── Solutions ────────────────────────────────────────────────────────
  {
    id: "education",
    name: "Education",
    family: "solutions",
    icon: GraduationCap,
    color: "amber",
    homeHref: "/solutions/education",
    menu: oneSection([{ id: "home", label: "Education", icon: GraduationCap }]),
  },
  {
    id: "legal",
    name: "Legal",
    family: "solutions",
    icon: Gavel,
    color: "slate",
    homeHref: "/solutions/legal",
    menu: oneSection([{ id: "home", label: "Legal", icon: Gavel }]),
  },
  {
    id: "medical",
    name: "Medical",
    family: "solutions",
    icon: Stethoscope,
    color: "rose",
    homeHref: "/solutions/medical",
    menu: oneSection([{ id: "home", label: "Medical", icon: Stethoscope }]),
  },
  {
    id: "e-commerce",
    name: "E-Commerce",
    family: "solutions",
    icon: ShoppingCart,
    color: "emerald",
    homeHref: "/solutions/e-commerce",
    menu: oneSection([{ id: "home", label: "E-Commerce", icon: ShoppingCart }]),
  },
  {
    id: "other",
    name: "Other",
    family: "solutions",
    icon: Ellipsis,
    color: "teal",
    homeHref: "/solutions/other",
    menu: oneSection([{ id: "home", label: "Other solutions", icon: Ellipsis }]),
  },
  // ── More: games and anything still looking for a home ───────────────
  {
    id: "more",
    name: "More",
    family: "more",
    icon: LayoutGrid,
    color: "cyan",
    homeHref: "/more",
    menu: oneSection([{ id: "games", label: "Games", icon: Gamepad2 }]),
  },
];

export function productById(id: string): FrameProduct | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/**
 * The favorites a person has before they ever edit the grid: the card's nine (3 x 3). The order is
 * a default, not a rule: the first `BIG_ITEM_COUNT` are also the default big items.
 */
export const DEFAULT_GRID_FAVORITES: readonly string[] = [
  "chat", "memory", "intelligence", "docs", "crm", "workspace", "drive", "data", "meet",
];

/**
 * WHAT A PERSON'S PINNED STARTS WITH (Arman, 2026-10-22: "start them with... Chat, Intelligence and
 * Memory on the first row. Then, workspace and tools and the last spot empty with a dashed line").
 * Shown until the person saves their own pins (then theirs, in their order).
 */
export const DEFAULT_PINNED_PRODUCTS: readonly string[] = ["chat", "intelligence", "memory", "workspace", "business-tools"];

/** A product as a pin: its home, its mark. */
export function productPin(product: FrameProduct): FramePin {
  return { id: product.homeHref, label: product.name, href: product.homeHref, icon: product.icon, productId: product.id };
}

/** The default pins, from the (live) products. */
export function defaultPins(products: readonly FrameProduct[]): FramePin[] {
  return DEFAULT_PINNED_PRODUCTS.flatMap((id) => products.filter((p) => p.id === id).map(productPin));
}

/** A pin whose address is a product's home becomes that product's pin (mark, short name). */
export function withProductMarks(pins: readonly FramePin[], products: readonly FrameProduct[]): FramePin[] {
  return pins.map((pin) => {
    if (pin.productId) return pin;
    const product = products.find((p) => p.homeHref === pin.href);
    return product ? { ...pin, productId: product.id, icon: pin.icon ?? product.icon } : pin;
  });
}
