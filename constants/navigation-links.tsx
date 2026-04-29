// File: @/constants/navigation-links.tsx
// Unified navigation links for the entire application
// Single source of truth for all navigation items

import React from "react";
import {
  SquareFunction,
  Palette,
  Table,
  FileInput,
  Images,
  ShieldEllipsis,
  DatabaseZap,
  ClipboardCheck,
  SquareMousePointer,
  Grid2x2Plus,
  LandPlot,
  Brain,
  LayoutList,
  LayoutPanelLeft,
  Puzzle,
  Workflow,
  BookOpen,
  History,
  ListTodo,
  List,
  ClipboardType,
  FolderOpen,
  Mic,
  Container,
  FlaskConical,
  Wand2,
} from "lucide-react";
import { TbBrandSocketIo } from "react-icons/tb";
import { LuWebhook } from "react-icons/lu";
import { TbRelationManyToMany } from "react-icons/tb";
import { AiFillAudio } from "react-icons/ai";
import { SiMagic, SiSocketdotio } from "react-icons/si";
import { LuNotepadText } from "react-icons/lu";
import { IoChatboxOutline } from "react-icons/io5";
import { FaIndent } from "react-icons/fa6";
import { IconNewSection } from "@tabler/icons-react";

export interface FaviconConfig {
  color: string; // Primary color for the favicon
  letter?: string; // Letter/symbol to display (1-2 chars)
  emoji?: string; // Optional emoji as alternative to letter
}

export interface NavigationLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  section?: "primary" | "admin"; // Which section this link belongs to
  category?: string; // For grouping admin links
  profileMenu?: boolean; // Show in profile dropdown menu
  dashboard?: boolean; // Show on dashboard
  favicon?: FaviconConfig; // Unique favicon configuration for this route
  description?: string; // Description for dashboard cards
  color?: string; // Color theme for dashboard cards (indigo, emerald, blue, etc.)
}

// All navigation links in the application
export const allNavigationLinks: NavigationLink[] = [
  // Primary Navigation Links
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <img
        src="/matrx/matrx-icon.svg"
        alt="AI Matrx"
        className="h-[22px] w-[22px] flex-shrink-0"
      />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Your central hub for all activities and insights",
    color: "cyan",
    favicon: { color: "#0ea5e9", letter: "Db" }, // Sky blue — "Db" avoids clash with Tables "Da"
  },
  {
    label: "Agents",
    href: "/agents",
    icon: (
      <Brain className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Build, configure, and deploy AI agents",
    color: "rose",
    favicon: { color: "#f43f5e", letter: "Ag" }, // Rose red — "Ag" distinct from "AI", "AR"
  },
  {
    label: "Prompt Builder",
    href: "/ai/prompts",
    icon: (
      <FaIndent className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Create and manage prompts for better interactions",
    color: "teal",
    favicon: { color: "#a855f7", letter: "Pb" }, // Purple — "Pb" avoids clash with Projects "Pj"
  },
  {
    label: "Prompt Apps",
    href: "/prompt-apps",
    icon: (
      <IconNewSection className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Browse and run interactive apps built from prompts",
    color: "emerald",
    favicon: { color: "#059669", letter: "Pa" }, // Dark emerald — "Pa" avoids clash with "Pb"
  },
  {
    label: "Research",
    href: "/p/research",
    icon: (
      <FlaskConical className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Deep research with Automated analysis & synthesis",
    color: "violet",
    favicon: { color: "#7c3aed", letter: "Rs" }, // Violet — "Rs" avoids clash with Recipes "Rc"
  },
  {
    label: "Chat",
    href: "/chat",
    icon: (
      <IoChatboxOutline className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: false,
    description: "Interact with our reimagined AI chat interface",
    color: "indigo",
    favicon: { color: "#2563eb", letter: "Ch" }, // Deeper blue — "Ch" distinct from "C" alone
  },
  {
    label: "Notes",
    href: "/notes",
    icon: (
      <LuNotepadText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Create and manage your notes and documents",
    color: "amber",
    favicon: { color: "#d97706", letter: "No" }, // Amber — "No" distinct from "N" alone
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: (
      <ListTodo className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Organize and track your tasks and projects",
    color: "green",
    favicon: { color: "#16a34a", letter: "Tk" }, // Green — "Tk" distinct from Transcripts "Tr"
  },
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <Puzzle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Create and manage projects, collaborate with teams",
    color: "indigo",
    favicon: { color: "#4f46e5", letter: "Pj" }, // Indigo — "Pj" distinct from "Pb" and "Pa"
  },
  {
    label: "Files",
    href: "/files",
    icon: (
      <FolderOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Browse and manage your files and documents",
    color: "blue",
    favicon: { color: "#0284c7", letter: "Fi" }, // Sky-700 — distinct from indigo Projects
  },
  {
    label: "Transcripts",
    href: "/transcripts",
    icon: (
      <Mic className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Record, transcribe and manage audio content",
    color: "purple",
    favicon: { color: "#9333ea", letter: "Tr" }, // Purple-600 — "Tr" distinct from Tasks "Tk"
  },
  {
    label: "Tables",
    href: "/data",
    icon: (
      <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Manage your custom data or create tables in a Chat",
    color: "blue",
    favicon: { color: "#0891b2", letter: "Da" }, // Cyan-600 — "Da" (Data) distinct from Dashboard "Db"
  },
  {
    label: "Voices",
    icon: (
      <AiFillAudio className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    href: "/demo/voice/voice-manager",
    section: "primary",
    profileMenu: true,
    dashboard: false,
    description: "Browse a collection of voices you can use in your projects",
    color: "purple",
    favicon: { color: "#ea580c", letter: "Vo" }, // Orange-600 — "Vo" distinct from Sandboxes "Sb"
  },
  {
    label: "Image Search",
    href: "/image-editing/public-image-search",
    icon: (
      <Images className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: false,
    description: "Browse a collection of images you can use in your projects",
    color: "rose",
    favicon: { color: "#0d9488", letter: "Im" }, // Teal-600 — "Im" distinct from "I" alone
  },
  {
    label: "Image Studio",
    href: "/image-studio",
    icon: (
      <Wand2 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description:
      "Drop one image, get 60+ platform-perfect sizes — favicons, OG, social, avatars, logos, print.",
    color: "fuchsia",
    favicon: { color: "#c026d3", letter: "Is" }, // Fuchsia — "Is" for Image Studio
  },
  {
    label: "Webscraper",
    href: "/scraper",
    icon: (
      <LuWebhook className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Extract and process data from web sources",
    color: "amber",
    favicon: { color: "#3730a3", letter: "Ws" }, // Indigo-800 — "Ws" distinct from Workflows "Wf"
  },

  {
    label: "Sandboxes",
    href: "/sandbox",
    icon: (
      <Container className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Your AI Agents in a cloud computer with your stuff!",
    color: "orange",
    favicon: { color: "#c2410c", letter: "Sb" }, // Orange-700 — "Sb" distinct from Voices "Vo"
  },

  {
    label: "Messages",
    href: "/messages",
    icon: (
      <IoChatboxOutline className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: true,
    description: "Direct messages and conversations",
    color: "rose",
    favicon: { color: "#db2777", letter: "Mg" }, // Pink-600 — "Mg" (Messages) distinct from "M" alone
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <ClipboardCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: false,
    description: "Manage your account and preferences",
    color: "slate",
    favicon: { color: "#475569", letter: "St" }, // Slate-600 — "St" (Settings) distinct from Sandboxes "Sb"
  },

  // Deprecated — moving to bottom before removal
  {
    label: "AI Cockpit",
    href: "/ai/cockpit",
    icon: (
      <Brain className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: false,
    description: "Build Custom AI Agents & Recipes without code!",
    color: "amber",
    favicon: { color: "#7c3aed", letter: "Ac" }, // Violet-700 — "Ac" (AI Cockpit)
  },
  {
    label: "AI Recipes",
    href: "/ai/recipes",
    icon: (
      <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: false,
    description: "Browse and manage your AI recipes and templates",
    color: "purple",
    favicon: { color: "#c026d3", letter: "Rc" }, // Fuchsia-600 — "Rc" (Recipes) distinct from Research "Rs"
  },
  {
    label: "AI Runs",
    href: "/ai/runs",
    icon: (
      <History className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "View and manage AI execution runs",
    color: "cyan",
    favicon: { color: "#0e7490", letter: "Ru" }, // Cyan-700 — distinct from Data "Da" and Prompt Builder "Pb"
  },
  {
    label: "Workflows",
    href: "/legacy/workflows",
    icon: (
      <Workflow className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: true,
    dashboard: false,
    description: "Design and automate complex workflows",
    color: "purple",
    favicon: { color: "#6d28d9", letter: "Wf" }, // Violet-700 — "Wf" distinct from Webscraper "Ws"
  },
  {
    label: "Lists",
    href: "/lists",
    icon: (
      <List className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Manage your named collections and choice lists",
    favicon: { color: "#1d4ed8", letter: "Li" }, // blue-700 — distinct from Files sky-700
  },
  {
    label: "Registered results",
    href: "/registered-results",
    icon: (
      <LayoutList className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Internal viewers for workflow-registered outputs",
    favicon: { color: "#831843", letter: "Rr" }, // pink-900
  },
  {
    label: "Entity admin",
    href: "/legacy/entity-admin",
    icon: (
      <Grid2x2Plus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "primary",
    profileMenu: false,
    dashboard: false,
    description: "Browse and manage entity definitions",
    favicon: { color: "#854d0e", letter: "Ea" }, // amber-900 — distinct from Entities CRUD "Ec"
  },

  // Admin Navigation Links
  // Note: /administration and /admin routes are covered by the ADMIN_ROUTE_FAVICON
  // system override in favicon-utils.ts (deep indigo "Ad"). Nav entries here
  // deliberately omit `favicon` so the override applies uniformly.
  {
    label: "Admin Dashboard",
    href: "/administration",
    icon: (
      <ShieldEllipsis className="text-rose-500 dark:text-rose-600 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "primary",
    // favicon intentionally omitted — system override applies
  },
  {
    label: "Official Components",
    href: "/administration/official-components",
    icon: (
      <Puzzle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "primary",
    // favicon intentionally omitted — system override applies
  },
  {
    label: "Old Dashboard",
    href: "/admin",
    icon: (
      <ShieldEllipsis className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Old",
  },
  {
    label: "Final Form Test",
    href: "/tests/forms/entity-final-test",
    icon: (
      <LandPlot className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Entities",
  },
  {
    label: "New Socket Admin",
    href: "/tests/socket-tests/redux-form-test",
    icon: <SiSocketdotio className="text-blue-500 h-5 w-5 flex-shrink-0" />,
    section: "admin",
    category: "Socket IO",
  },
  {
    label: "Apps",
    href: "/apps",
    icon: (
      <Grid2x2Plus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Applets",
    description: "App builder, custom apps, demos, and debug tools",
    favicon: { color: "#14532d", letter: "Ah" }, // green-900 — Apps hub
  },
  {
    label: "App Builder Parts",
    href: "/apps/app-builder",
    icon: (
      <SiMagic className="text-amber-500 dark:text-amber-600 hover:text-amber-600 dark:hover:text-amber-700 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Applets",
    favicon: { color: "#4c1d95", letter: "Ab" }, // purple-950 — App Builder
  },
  {
    label: "Applet demo",
    href: "/apps/demo",
    icon: (
      <LayoutPanelLeft className="text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Applets",
    favicon: { color: "#be123c", letter: "Ad" }, // rose-700 — Apps demo
  },
  {
    label: "Dynamic Layout Demo",
    href: "/apps/dynamic-layouts/options",
    icon: (
      <LayoutPanelLeft className="text-green-500 dark:text-green-600 hover:text-green-600 dark:hover:text-green-700 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Applets",
  },
  {
    label: "All Layouts",
    href: "/apps/all-layouts",
    icon: (
      <LayoutPanelLeft className="text-blue-500 dark:text-blue-600 hover:text-blue-600 dark:hover:text-blue-700 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Applets",
  },
  {
    label: "App Builder Hub",
    href: "/apps/builder/hub",
    icon: (
      <SiMagic className="text-green-500 dark:text-green-600 hover:text-green-600 dark:hover:text-green-700 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Applets",
    favicon: { color: "#1e3a8a", letter: "Bh" }, // indigo-900 — Builder hub
  },
  {
    label: "Markdown Tests",
    href: "/tests/markdown-tests",
    icon: (
      <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Concepts",
  },
  {
    label: "Socket Admin",
    href: "/admin/socketio",
    icon: (
      <TbBrandSocketIo className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Socket IO",
  },
  {
    label: "Model Endpoints",
    href: "/demo/many-to-many-ui/claude",
    icon: (
      <TbRelationManyToMany className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Automation",
  },
  {
    label: "Workflows",
    href: "/demo/workflows",
    icon: (
      <Workflow className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Automation",
  },
  {
    label: "Tailwind Test",
    href: "/tests/tailwind-test",
    icon: (
      <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Styling",
  },
  {
    label: "Registered Functions",
    href: "/admin/registered-functions",
    icon: (
      <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Entities",
  },
  {
    label: "Schema Manager",
    href: "/legacy/administration/schema-manager",
    icon: (
      <DatabaseZap className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Concepts",
  },
  {
    label: "Text Cleaner",
    href: "/administration/utils/text-cleaner",
    icon: (
      <ClipboardCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Concepts",
  },
  {
    label: "All Form Tests",
    href: "/tests/forms",
    icon: (
      <FileInput className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Entities",
  },
  {
    label: "Selector Tests",
    href: "/tests/selector-test",
    icon: (
      <SquareMousePointer className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Redux",
  },
  {
    label: "InteliTable",
    href: "/tests/matrx-table",
    icon: (
      <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Entities",
  },
  {
    label: "Prompt Builder",
    href: "/demo/prompt-builder",
    icon: (
      <ClipboardType className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Concepts",
  },
  {
    label: "Entities",
    href: "/legacy/entity-crud",
    icon: (
      <Grid2x2Plus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Entities",
    favicon: { color: "#0369a1", letter: "Ec" }, // sky-800 — Entity CRUD
  },
  {
    label: "Sandbox Admin",
    href: "/admin/sandbox",
    icon: (
      <Container className="text-orange-500 dark:text-orange-400 h-5 w-5 flex-shrink-0" />
    ),
    section: "admin",
    category: "Automation",
    // favicon intentionally omitted — system override (ADMIN_ROUTE_FAVICON) applies
  },
];

// Filtered exports for different use cases

/**
 * Primary navigation links for main sidebar
 */
export const primaryLinks = allNavigationLinks.filter(
  (link) => link.section === "primary",
);

/**
 * Admin navigation links for admin sidebar
 */
export const adminLinks = allNavigationLinks.filter(
  (link) => link.section === "admin",
);

/**
 * Links to show in profile menu dropdown
 */
export const profileMenuLinks = allNavigationLinks.filter(
  (link) => link.profileMenu === true,
);

/**
 * Links to show on dashboard
 */
export const dashboardLinks = allNavigationLinks.filter(
  (link) => link.dashboard === true,
);

/**
 * Admin links grouped by category
 */
export const adminLinksByCategory = adminLinks.reduce(
  (acc, link) => {
    const category = link.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(link);
    return acc;
  },
  {} as Record<string, NavigationLink[]>,
);

// Legacy exports for backward compatibility
export const navigationLinks = profileMenuLinks;
export const adminNavigationLinks = adminLinks;
export const appSidebarLinks = primaryLinks;
export const adminSidebarLinks = adminLinks;
