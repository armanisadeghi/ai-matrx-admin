// nav-data.ts — Pure data, no React/JSX imports
// Maps icon names to Lucide component names for server-side rendering

export interface ShellNavChild {
  label: string;
  href: string;
  iconName: string;
  exact?: boolean;
}

export interface ShellNavItem {
  label: string;
  href: string;
  iconName: string;
  section: "primary" | "admin";
  dockOrder?: number;
  description?: string;
  color?: string;
  children?: ShellNavChild[];
}

// Primary navigation items
export const primaryNavItems: ShellNavItem[] = [
  {
    label: "Dashboard",
    href: "/ssr/dashboard",
    iconName: "LayoutDashboard",
    section: "primary",
    dockOrder: 1,
    description: "Your central hub for all activities and insights",
    color: "sky",
  },
  {
    label: "Agents",
    href: "/agents",
    iconName: "Webhook",
    section: "primary",
    description: "AI Agent Harness Management",
    color: "blue",
    children: [
      { label: "All Agents", href: "/agents", iconName: "List", exact: true },
      {
        label: "Templates",
        href: "/agents/templates",
        iconName: "LayoutTemplate",
      },
      { label: "New Agent", href: "/agents/new", iconName: "Plus" },
    ],
  },
  {
    label: "Prompt Builder",
    href: "/ssr/prompts",
    iconName: "Wand2",
    section: "primary",
    description: "Create and manage AI prompts",
    color: "teal",
  },
  {
    label: "Prompt Apps",
    href: "/prompt-apps",
    iconName: "LayoutGrid",
    section: "primary",
    description: "Browse and run interactive apps built from prompts",
    color: "emerald",
  },
  {
    label: "Research",
    href: "/research",
    iconName: "FlaskConical",
    section: "primary",
    description: "Deep research with Automated topic analysis",
    color: "purple",
  },
  {
    label: "Chat",
    href: "/ssr/chat",
    iconName: "MessageCircle",
    section: "primary",
    dockOrder: 2,
    description: "Interact with our reimagined chat interface",
    color: "indigo",
  },
  {
    label: "Notes",
    href: "/notes",
    iconName: "NotebookPen",
    section: "primary",
    dockOrder: 3,
    description: "Create and manage your notes and documents",
    color: "amber",
  },
  {
    label: "Tasks",
    href: "/tasks",
    iconName: "ListTodo",
    section: "primary",
    dockOrder: 4,
    description: "Organize and track your tasks and projects",
    color: "emerald",
  },
  {
    label: "Projects",
    href: "/projects",
    iconName: "Puzzle",
    section: "primary",
    dockOrder: 5,
    description: "Create and manage projects, collaborate with teams",
    color: "violet",
  },
  {
    label: "Files",
    href: "/files",
    iconName: "FolderOpen",
    section: "primary",
    dockOrder: 6,
    description: "Browse and manage your files and documents",
    color: "blue",
  },

  {
    label: "Transcripts",
    href: "/transcripts",
    iconName: "Mic",
    section: "primary",
    description: "Record, transcribe and manage audio content",
    color: "rose",
  },
  {
    label: "Tables",
    href: "/data",
    iconName: "Table",
    section: "primary",
    description: "Manage your custom data or create tables in a Chat",
    color: "cyan",
  },
  {
    label: "Webscraper",
    href: "/scraper",
    iconName: "Globe",
    section: "primary",
    description: "Extract and process data from web sources",
    color: "orange",
  },
  {
    label: "Sandboxes",
    href: "/sandbox",
    iconName: "Container",
    section: "primary",
    description: "Your AI Agents in a cloud computer with your stuff!",
    color: "orange",
  },
  {
    label: "Code",
    href: "/code",
    iconName: "Code2",
    section: "primary",
    description: "VSCode-style workspace for sandbox and cloud projects",
    color: "indigo",
  },
  {
    label: "Messages",
    href: "/messages",
    iconName: "Mail",
    section: "primary",
    description: "Direct messages and conversations",
    color: "pink",
  },
  {
    label: "Workflows",
    href: "/workflows",
    iconName: "Workflow",
    section: "primary",
    description: "Design and automate complex workflows",
    color: "purple",
  },
  {
    label: "Context",
    href: "/ssr/context",
    iconName: "BookOpen",
    section: "primary",
    description: "Manage context items, templates, and knowledge",
    color: "cyan",
  },
  {
    label: "Knowledge",
    href: "/rag/data-stores",
    iconName: "Database",
    section: "primary",
    description:
      "Documents, data stores, and RAG search across your indexed content",
    color: "amber",
    children: [
      {
        label: "Data Stores",
        href: "/rag/data-stores",
        iconName: "Database",
      },
      {
        label: "Search",
        href: "/rag/search",
        iconName: "Search",
      },
      {
        label: "Library",
        href: "/rag/library",
        iconName: "FileText",
      },
    ],
  },
];

// Admin navigation items
export const adminNavItems: ShellNavItem[] = [
  {
    label: "Admin Dashboard",
    href: "/administration",
    iconName: "ShieldCheck",
    section: "admin",
    color: "red",
  },
  {
    label: "Official Components",
    href: "/administration/official-components",
    iconName: "Puzzle",
    section: "admin",
    color: "violet",
  },
  {
    label: "Schema Manager",
    href: "/legacy/administration/schema-manager",
    iconName: "Database",
    section: "admin",
    color: "cyan",
  },
  {
    label: "App Builder",
    href: "/apps/app-builder",
    iconName: "Lightbulb",
    section: "admin",
    color: "amber",
  },
  {
    label: "Socket Admin",
    href: "/admin/socketio",
    iconName: "Radio",
    section: "admin",
    color: "blue",
  },
];

// Mobile dock items (sorted by dockOrder)
export const dockItems = primaryNavItems
  .filter((item) => item.dockOrder != null)
  .sort((a, b) => (a.dockOrder ?? 0) - (b.dockOrder ?? 0));

// Settings item — always at bottom of sidebar
export const settingsItem: ShellNavItem = {
  label: "Settings",
  href: "/settings",
  iconName: "Settings",
  section: "primary",
  description: "Manage your account and preferences",
  color: "slate",
};

// Color mapping for dashboard app icons (tailwind bg classes)
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
  pink: "bg-pink-500/15 text-pink-600 dark:bg-pink-400/15 dark:text-pink-400",
  red: "bg-red-500/15 text-red-600 dark:bg-red-400/15 dark:text-red-400",
  slate:
    "bg-slate-500/15 text-slate-600 dark:bg-slate-400/15 dark:text-slate-400",
};
