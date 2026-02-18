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
    LayoutPanelLeft,
    Puzzle,
    Workflow,
    BookOpen,
    ListTodo,
    ClipboardType,
    FolderOpen,
    Mic,
    Container,
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
        icon: <img src="/matrx/matrx-icon.svg" alt="AI Matrx" className="h-[22px] w-[22px] flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Your central hub for all activities and insights",
        color: "cyan",
        favicon: { color: "#0ea5e9", letter: "D" }, // Sky blue
    },
    {
        label: "Prompt Builder",
        href: "/ai/prompts",
        icon: <FaIndent className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Create and manage AI prompts for better interactions",
        color: "teal",
        favicon: { color: "#a855f7", letter: "P" }, // Light Purple
    },
    {
        label: "Prompt Apps",
        href: "/prompt-apps",
        icon: <IconNewSection className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Browse and run interactive apps built from prompts",
        color: "emerald",
        favicon: { color: "#10b981", letter: "PA" }, // Emerald
    },
    {
        label: "Chat",
        href: "/chat",
        icon: <IoChatboxOutline className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Interact with our reimagined AI chat interface",
        color: "indigo",
        favicon: { color: "#3b82f6", letter: "C" }, // Blue
    },
    {
        label: "Notes",
        href: "/notes",
        icon: <LuNotepadText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Create and manage your notes and documents",
        color: "amber",
        favicon: { color: "#f59e0b", letter: "N" }, // Amber
    },
    {
        label: "Tasks",
        href: "/tasks",
        icon: <ListTodo className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Organize and track your tasks and projects",
        color: "green",
        favicon: { color: "#10b981", letter: "T" }, // Green
    },
    {
        label: "Projects",
        href: "/projects",
        icon: <Puzzle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Create and manage your projects, collaborate with teams",
        color: "indigo",
        favicon: { color: "#6366f1", letter: "P" }, // Indigo
    },
    {
        label: "Files",
        href: "/files",
        icon: <FolderOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Browse and manage your files and documents",
        color: "blue",
        favicon: { color: "#6366f1", letter: "F" }, // Indigo
    },
    {
        label: "Transcripts",
        href: "/transcripts",
        icon: <Mic className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Record, transcribe and manage your audio conversations",
        color: "purple",
        favicon: { color: "#8b5cf6", letter: "T" }, // Violet
    },
    {
        label: "Tables",
        href: "/data",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Manage your custom data or create tables in a Chat",
        color: "blue",
        favicon: { color: "#06b6d4", letter: "D" }, // Cyan
    },
    {
        label: "Voices",
        icon: <AiFillAudio className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        href: "/demo/voice/voice-manager",
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Browse a collection of voices you can use in your projects",
        color: "purple",
        favicon: { color: "#f97316", letter: "V" }, // Orange
    },
    {
        label: "Image Search",
        href: "/image-editing/public-image-search",
        icon: <Images className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Browse a collection of images you can use in your projects",
        color: "rose",
        favicon: { color: "#14b8a6", letter: "I" }, // Teal
    },
    {
        label: "Webscraper",
        href: "/scraper",
        icon: <LuWebhook className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Extract and process data from web sources",
        color: "amber",
        favicon: { color: "#6366f1", letter: "W" }, // Indigo
    },

    {
        label: "Sandboxes",
        href: "/sandbox",
        icon: <Container className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: true,
        description: "Manage ephemeral sandbox environments for your projects",
        color: "orange",
        favicon: { color: "#f97316", letter: "SB" },
    },

    {
        label: "Messages",
        href: "/messages",
        icon: <IoChatboxOutline className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Direct messages and conversations",
        color: "rose",
        favicon: { color: "#ec4899", letter: "M" }, // Pink
    },
    {
        label: "Settings",
        href: "/settings",
        icon: <ClipboardCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Manage your account and preferences",
        color: "slate",
        favicon: { color: "#64748b", letter: "S" }, // Slate
    },

    // Deprecated — moving to bottom before removal
    {
        label: "AI Cockpit",
        href: "/ai/cockpit",
        icon: <Brain className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Build Custom AI Agents & Recipes without code!",
        color: "amber",
        favicon: { color: "#8b5cf6", letter: "AI" }, // Purple
    },
    {
        label: "AI Recipes",
        href: "/ai/recipes",
        icon: <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Browse and manage your AI recipes and templates",
        color: "purple",
        favicon: { color: "#d946ef", letter: "R" }, // Fuchsia
    },
    {
        label: "Workflows",
        href: "/workflows",
        icon: <Workflow className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "primary",
        profileMenu: true,
        dashboard: false,
        description: "Design and automate complex workflows",
        color: "purple",
        favicon: { color: "#8b5cf6", letter: "WF" }, // Purple
    },

    // Admin Navigation Links
    {
        label: "Admin Dashboard",
        href: "/administration",
        icon: <ShieldEllipsis className="text-rose-500 dark:text-rose-600 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "primary",
        favicon: { color: "#ef4444", letter: "AD" }, // Red
    },
    {
        label: "Official Components",
        href: "/admin/official-components",
        icon: <Puzzle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "primary",
        favicon: { color: "#8b5cf6", letter: "OC" }, // Violet
    },
    {
        label: "Old Dashboard",
        href: "/admin",
        icon: <ShieldEllipsis className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Old",
    },
    {
        label: "Final Form Test",
        href: "/tests/forms/entity-final-test",
        icon: <LandPlot className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
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
        label: "App Builder Parts",
        href: "/apps/app-builder",
        icon: (
            <SiMagic className="text-amber-500 dark:text-amber-600 hover:text-amber-600 dark:hover:text-amber-700 h-5 w-5 flex-shrink-0" />
        ),
        section: "admin",
        category: "Applets",
    },
    {
        label: "Applet demo",
        href: "/apps/demo",
        icon: (
            <LayoutPanelLeft className="text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700 h-5 w-5 flex-shrink-0" />
        ),
        section: "admin",
        category: "Applets",
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
    },
    {
        label: "Markdown Tests",
        href: "/tests/markdown-tests",
        icon: <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Concepts",
    },
    {
        label: "Socket Admin",
        href: "/admin/socketio",
        icon: <TbBrandSocketIo className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Socket IO",
    },
    {
        label: "Model Endpoints",
        href: "/demo/many-to-many-ui/claude",
        icon: <TbRelationManyToMany className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Automation",
    },
    {
        label: "Workflows",
        href: "/demo/workflows",
        icon: <Workflow className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Automation",
    },
    {
        label: "Tailwind Test",
        href: "/tests/tailwind-test",
        icon: <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Styling",
    },
    {
        label: "Registered Functions",
        href: "/admin/registered-functions",
        icon: <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Entities",
    },
    {
        label: "Schema Manager",
        href: "/admin/schema-manager",
        icon: <DatabaseZap className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Concepts",
    },
    {
        label: "Text Cleaner",
        href: "/admin/utils/text-cleaner",
        icon: <ClipboardCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Concepts",
    },
    {
        label: "All Form Tests",
        href: "/tests/forms",
        icon: <FileInput className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Entities",
    },
    {
        label: "Selector Tests",
        href: "/tests/selector-test",
        icon: <SquareMousePointer className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Redux",
    },
    {
        label: "InteliTable",
        href: "/tests/matrx-table",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Entities",
    },
    {
        label: "Prompt Builder",
        href: "/demo/prompt-builder",
        icon: <ClipboardType className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Concepts",
    },
    {
        label: "Entities",
        href: "/entity-crud",
        icon: <Grid2x2Plus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Entities",
    },
    {
        label: "Sandbox Admin",
        href: "/admin/sandbox",
        icon: <Container className="text-orange-500 dark:text-orange-400 h-5 w-5 flex-shrink-0" />,
        section: "admin",
        category: "Automation",
        favicon: { color: "#f97316", letter: "SA" }, // Orange
    },
];

// Filtered exports for different use cases

/**
 * Primary navigation links for main sidebar
 */
export const primaryLinks = allNavigationLinks.filter((link) => link.section === "primary");

/**
 * Admin navigation links for admin sidebar
 */
export const adminLinks = allNavigationLinks.filter((link) => link.section === "admin");

/**
 * Links to show in profile menu dropdown
 */
export const profileMenuLinks = allNavigationLinks.filter((link) => link.profileMenu === true);

/**
 * Links to show on dashboard
 */
export const dashboardLinks = allNavigationLinks.filter((link) => link.dashboard === true);

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
    {} as Record<string, NavigationLink[]>
);

// Legacy exports for backward compatibility
export const navigationLinks = profileMenuLinks;
export const adminNavigationLinks = adminLinks;
export const appSidebarLinks = primaryLinks;
export const adminSidebarLinks = adminLinks;
