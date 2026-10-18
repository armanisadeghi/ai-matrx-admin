// THE PRODUCT LIST for the new app frame — one row per product the app grid
// shows. DRAFT (owner, 2026-10-17): names, families, colours and menus are not
// final; change them HERE only. Host-agnostic data (lucide icons + design-system
// chip hues), so the file moves into @ai-matrx/shell as a copy.
import {
  AppWindow,
  AudioLines,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Briefcase,
  Building2,
  CalendarDays,
  Code2,
  Contact,
  Database,
  Eye,
  Factory,
  FileSignature,
  FileText,
  Folder,
  FolderTree,
  HardDrive,
  History,
  House,
  IdCard,
  Image,
  Inbox,
  Layers,
  Library,
  ListChecks,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Mic,
  NotebookPen,
  Plug,
  Presentation,
  ScanLine,
  Search,
  Settings,
  Star,
  Table2,
  Target,
  Users,
  Video,
  Webhook,
  Workflow,
  Wrench,
} from "lucide-react";
import type { FrameProduct, ProductFamily } from "./types";

export const PRODUCT_FAMILIES: readonly { id: ProductFamily; label: string }[] = [
  { id: "build", label: "Build" },
  { id: "know-make", label: "Know & Make" },
  { id: "business", label: "Run the business" },
  { id: "yours", label: "Yours" },
];

export const PRODUCTS: readonly FrameProduct[] = [
  // ── Build ────────────────────────────────────────────────────────────
  {
    id: "intelligence",
    name: "Intelligence",
    family: "build",
    icon: BrainCircuit,
    color: "violet",
    homeHref: "/intelligence",
    menu: [
      {
        id: "main",
        items: [
          { id: "mandates", label: "Mandates", icon: ListChecks },
          { id: "agents", label: "Agents", icon: Webhook },
          { id: "workflows", label: "Workflows", icon: Workflow },
          { id: "hindsight", label: "Hindsight review", icon: Eye },
          { id: "replay", label: "Replay", icon: History },
        ],
      },
    ],
  },
  {
    id: "applets",
    name: "Applets",
    family: "build",
    icon: AppWindow,
    color: "fuchsia",
    homeHref: "/applets",
    menu: [{ id: "main", items: [{ id: "all", label: "All applets", icon: AppWindow }] }],
  },
  {
    id: "code",
    name: "Code",
    family: "build",
    icon: Code2,
    color: "slate",
    homeHref: "/code",
    menu: [
      {
        id: "main",
        items: [
          { id: "projects", label: "Projects", icon: Folder },
          { id: "files", label: "Files", icon: FolderTree },
          { id: "sessions", label: "Sessions", icon: History },
        ],
      },
    ],
  },
  {
    id: "tools",
    name: "Tools & Connectors",
    family: "build",
    icon: Plug,
    color: "teal",
    homeHref: "/tools",
    menu: [
      {
        id: "main",
        items: [
          { id: "connectors", label: "Connectors", icon: Plug },
          { id: "tools", label: "Tools", icon: Wrench },
        ],
      },
    ],
  },
  // ── Know & Make ──────────────────────────────────────────────────────
  {
    id: "knowledge",
    name: "Knowledge",
    family: "know-make",
    icon: Library,
    color: "indigo",
    homeHref: "/knowledge",
    menu: [
      {
        id: "main",
        items: [
          { id: "collections", label: "Collections", icon: Layers },
          { id: "sources", label: "Sources", icon: BookOpen },
          { id: "search", label: "Search", icon: Search },
        ],
      },
    ],
  },
  {
    id: "docs",
    name: "Docs",
    family: "know-make",
    icon: FileText,
    color: "blue",
    homeHref: "/docs",
    menu: [
      {
        id: "main",
        items: [
          { id: "home", label: "Home", icon: House },
          { id: "recent", label: "Recent", icon: History },
          { id: "starred", label: "Starred", icon: Star },
        ],
      },
      {
        id: "kinds",
        label: "Kinds",
        items: [
          { id: "documents", label: "Documents", icon: FileText, count: 42 },
          { id: "notes", label: "Notes", icon: NotebookPen, count: 118 },
          { id: "slides", label: "Slides", icon: Presentation, count: 7 },
          { id: "pdf", label: "PDF & scan", icon: ScanLine },
        ],
      },
      {
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
    family: "know-make",
    icon: Database,
    color: "emerald",
    homeHref: "/data",
    menu: [
      {
        id: "main",
        items: [
          { id: "tables", label: "Tables", icon: Table2 },
          { id: "views", label: "Views", icon: Layers },
        ],
      },
    ],
  },
  {
    id: "media",
    name: "Media",
    family: "know-make",
    icon: Image,
    color: "fuchsia",
    homeHref: "/media",
    menu: [{ id: "main", items: [{ id: "library", label: "Library", icon: Image }] }],
  },
  {
    id: "audio",
    name: "Audio",
    family: "know-make",
    icon: AudioLines,
    color: "rose",
    homeHref: "/audio",
    menu: [{ id: "main", items: [{ id: "recordings", label: "Recordings", icon: Mic }] }],
  },
  {
    id: "storage",
    name: "Storage",
    family: "know-make",
    icon: HardDrive,
    color: "cyan",
    homeHref: "/storage",
    menu: [{ id: "main", items: [{ id: "files", label: "All files", icon: Folder }] }],
  },
  // ── Run the business ─────────────────────────────────────────────────
  {
    id: "crm",
    name: "CRM",
    family: "business",
    icon: Contact,
    color: "orange",
    homeHref: "/crm",
    menu: [
      {
        id: "main",
        items: [
          { id: "inbox", label: "Inbox", icon: Inbox, count: 3 },
          { id: "contacts", label: "Contacts", icon: Contact, count: 1284 },
          { id: "companies", label: "Companies", icon: Building2, count: 312 },
          { id: "deals", label: "Deals", icon: Target, count: 27 },
        ],
      },
      {
        id: "insights",
        label: "Insights",
        items: [
          { id: "reports", label: "Reports", icon: BarChart3 },
          { id: "activity", label: "Activity", icon: History },
        ],
      },
      {
        id: "setup",
        label: "Setup",
        items: [{ id: "settings", label: "Settings", icon: Settings }],
      },
    ],
  },
  {
    id: "hr",
    name: "HR",
    family: "business",
    icon: IdCard,
    color: "amber",
    homeHref: "/hr",
    menu: [{ id: "main", items: [{ id: "people", label: "People", icon: Users }] }],
  },
  {
    id: "marketing",
    name: "Marketing",
    family: "business",
    icon: Megaphone,
    color: "lime",
    homeHref: "/marketing",
    menu: [{ id: "main", items: [{ id: "campaigns", label: "Campaigns", icon: Megaphone }] }],
  },
  {
    id: "meetings",
    name: "Meetings & Communication",
    family: "business",
    icon: Video,
    color: "sky",
    homeHref: "/meetings",
    menu: [
      {
        id: "main",
        items: [
          { id: "meet", label: "Meet", icon: Video },
          { id: "calendar", label: "Calendar", icon: CalendarDays },
          { id: "messages", label: "Messages", icon: MessagesSquare },
        ],
      },
    ],
  },
  {
    id: "business-tools",
    name: "Business Tools",
    family: "business",
    icon: Briefcase,
    color: "slate",
    homeHref: "/business-tools",
    menu: [
      {
        id: "main",
        items: [
          { id: "esign", label: "E-sign", icon: FileSignature },
          { id: "scan", label: "PDF & scan", icon: ScanLine },
        ],
      },
    ],
  },
  // ── Yours ────────────────────────────────────────────────────────────
  {
    id: "main",
    name: "Main",
    family: "yours",
    icon: House,
    color: "blue",
    homeHref: "/dashboard",
    menu: [{ id: "main", items: [{ id: "home", label: "Your workspace", icon: House }] }],
  },
  {
    id: "chat",
    name: "Chat",
    family: "yours",
    icon: MessageSquare,
    color: "indigo",
    homeHref: "/chat",
    menu: [
      {
        id: "main",
        items: [
          { id: "new", label: "New chat", icon: MessageSquare },
          { id: "search", label: "Search chats", icon: Search },
        ],
      },
      {
        id: "recent",
        label: "Recent",
        items: [
          { id: "c-1", label: "Quarterly plan outline", icon: MessageSquare },
          { id: "c-2", label: "Rewrite the intake form", icon: MessageSquare },
          { id: "c-3", label: "Summarise the Lopez call", icon: MessageSquare },
        ],
      },
    ],
  },
  {
    id: "solutions",
    name: "Solutions",
    family: "yours",
    icon: Factory,
    color: "teal",
    homeHref: "/solutions",
    menu: [{ id: "main", items: [{ id: "all", label: "All solutions", icon: Factory }] }],
  },
];

export function productById(id: string): FrameProduct | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
