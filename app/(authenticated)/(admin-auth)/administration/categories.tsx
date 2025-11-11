import {
    IconAccessible,
    IconAdjustmentsBolt,
    IconAlertOctagon,
    IconApi,
    IconBox,
    IconBrandCloudflare,
    IconBug,
    IconCalendar,
    IconChartBar,
    IconChartLine,
    IconClipboard,
    IconCloud,
    IconCloudShare,
    IconCode,
    IconDashboard,
    IconDatabase,
    IconDownload,
    IconFile,
    IconFishHook,
    IconFlag,
    IconFolder,
    IconGitBranch,
    IconHistory,
    IconImageInPicture,
    IconLock,
    IconLogs,
    IconMagnet,
    IconMaximize,
    IconMinimize,
    IconPencil,
    IconRefresh,
    IconRestore,
    IconRobot,
    IconServer,
    IconSettings,
    IconShield,
    IconShieldLock,
    IconSquareToggle,
    IconTestPipe,
    IconUpload,
    IconUsers,
} from "@tabler/icons-react";
import React from "react";
import LocalFileAccess from "@/app/(authenticated)/admin/components/LocalFileAccess";
import CommandTestPage from "@/app/(authenticated)/admin/components/command-testers/CommandTestPage";
import EntityTestingLab from "@/app/(authenticated)/admin/components/entities/EntityTestingLab";
import EntityTester from "@/app/(authenticated)/admin/components/entities/EntityTester";
import EntityMetrics from "@/app/(authenticated)/admin/components/entities/EntityMetrics";
import EntityBrowser from "@/app/(authenticated)/admin/components/entities/EntityBrowser";
import EntityLab from "@/app/(authenticated)/admin/components/entities/EntityLab";
import { Database, DatabaseBackup, DatabaseZap, MessageSquare, Megaphone } from "lucide-react";
import SchemaVisualizer from "@/app/(authenticated)/admin/components/SchemaVisualizer";
import { SchemaVisualizerLayout } from "@/app/(authenticated)/admin/components/SchemaVisualizer/SchemaVisualizerLayout";
import DatabaseAdminDashboard from "@/app/(authenticated)/admin/components/database-admin/DatabaseAdminDashboard";

export const adminCategories = [
    {
        name: "File Explorer & Basic Operations",
        icon: <IconFolder className="w-6 h-6" />,
        features: [
            {
                title: "Access Local",
                description: "Directly access and browse files stored on the local filesystem, enabling quick file management.",
                icon: <IconFolder />,
                component: <LocalFileAccess />,
            },
        ],
    },
    {
        name: "Entity Management & Testing",
        icon: <IconDatabase className="w-6 h-6" />,
        features: [
            {
                title: "Entity Operations Lab",
                description: "Comprehensive testing environment for entity operations, including CRUD, filtering, and real-time updates.",
                icon: <IconTestPipe />,
                component: <EntityTestingLab />,
            },
            {
                title: "Entity Lab Using Special Select Header",
                description: "Comprehensive testing environment for entity operations, including CRUD, filtering, and real-time updates.",
                icon: <IconTestPipe />,
                component: <EntityLab />,
            },
            {
                title: "Entity Tester",
                description:
                    "Comprehensive testing interface for entity operations, allowing real-time CRUD operations, data inspection, and performance monitoring across all system entities.",
                icon: <IconDatabase />,
                component: <EntityTester />,
            },
            {
                title: "Entity Performance Metrics",
                description: "Monitor and analyze entity operation performance, caching efficiency, and state management.",
                icon: <Database />,
                component: <EntityMetrics />,
            },
            {
                title: "Entity Matrx Table Browser",
                description: "Test Entity Data in the Matrx Table.",
                icon: <DatabaseZap />,
                component: <EntityBrowser />,
            },
            {
                title: "Entity Performance Metrics",
                description: "Monitor and analyze entity operation performance, caching efficiency, and state management.",
                icon: <Database />,
                component: <EntityMetrics />,
            },
        ],
    },
    {
        name: "SQL Database Admin",
        icon: <IconFlag className="w-6 h-6" />,
        features: [
            {
                title: "Database Admin Dashboard",
                description: "See functions, security policies, and more",
                icon: <DatabaseBackup />,
                component: <DatabaseAdminDashboard />,
            },
            {
                title: "SQL Query Executor",
                description: "Execute SQL queries directly against the database",
                icon: <DatabaseZap />,
                link: "/administration/database",
            },
            {
                title: "SQL Functions",
                description: "Browse, search, and manage SQL functions",
                icon: <IconCode />,
                link: "/administration/database/sql-functions",
            },
        ],
    },
    {
        name: "TypeScript Management",
        icon: <IconCode className="w-6 h-6" />,
        features: [
            {
                title: "TypeScript Error Analyzer",
                description: "View, filter, and analyze TypeScript compilation errors across the project",
                icon: <IconCode />,
                link: "/administration/typescript-errors",
            },
        ],
    },
    {
        name: "Content & Configuration",
        icon: <IconPencil className="w-6 h-6" />,
        features: [
            {
                title: "Content Blocks Manager",
                description: "Manage content blocks, templates, and context menu items used throughout the application",
                icon: <IconClipboard />,
                link: "/administration/content-blocks",
            },
            {
                title: "Content Templates Manager",
                description: "Manage message templates for prompts including system, user, assistant, and tool messages",
                icon: <MessageSquare />,
                link: "/administration/content-templates",
            },
            {
                title: "System Prompts Manager",
                description: "Manage global system prompts for context menus, execution cards, and other UI components throughout the application",
                icon: <IconRobot />,
                link: "/administration/system-prompts",
            },
            {
                title: "Markdown Content Tester",
                description: "Test and debug EnhancedChatMarkdown rendering with live split-screen preview. Perfect for testing diagrams, quizzes, tables, and other content formats.",
                icon: <IconCode />,
                link: "/administration/markdown-tester",
            },
            {
                title: "System Files Manager",
                description: "Upload and manage public files for app-wide use including voice samples, documentation, images, and sample files. Easily copy URLs for use in code.",
                icon: <IconUpload />,
                link: "/administration/system-files",
            },
        ],
    },
    {
        name: "Server & Cache Management",
        icon: <IconServer className="w-6 h-6" />,
        features: [
            {
                title: "Server Cache Manager",
                description: "Refresh and manage server-side caches including AI models and other cached data",
                icon: <IconRefresh />,
                link: "/administration/server-cache",
            },
        ],
    },
    {
        name: "Schema Visualizer",
        icon: <IconFlag className="w-6 h-6" />,
        features: [
            {
                title: "Schema Visualizer",
                description: "Visualize the full schema",
                icon: <IconFlag />,
                component: <SchemaVisualizer />,
            },
            {
                title: "Enhanced Schema Visualizer",
                description: "Visualize the full schema",
                icon: <IconAdjustmentsBolt />,
                component: <SchemaVisualizerLayout />,
            },
        ],
    },
    {
        name: "Feature Testing",
        icon: <IconTestPipe className="w-6 h-6" />,
        features: [
            {
                title: "Entity Command Tester",
                description: "Test the powerful Entity Commands which are directly plugged into Redux state.",
                icon: <IconSquareToggle />,
                component: <CommandTestPage />,
            },
        ],
    },
    {
        name: "MCP Tools Management",
        icon: <IconTestPipe className="w-6 h-6" />,
        features: [
            {
                title: "MCP Tools Manager",
                description: "Manage MCP tools",
                icon: <IconTestPipe />,
                link: "/administration/mcp-tools",
            },
        ],
    },
    {
        name: "User Feedback & Announcements",
        icon: <MessageSquare className="w-6 h-6" />,
        features: [
            {
                title: "Feedback Management",
                description: "View and manage user feedback, bug reports, and feature requests. Create and manage system announcements.",
                icon: <MessageSquare />,
                link: "/administration/feedback",
            },
        ],
    },
    {
        name: "Prompt Apps Administration",
        icon: <IconRobot className="w-6 h-6" />,
        features: [
            {
                title: "Prompt Apps Admin",
                description: "Manage prompt app categories, view errors, monitor analytics, moderate apps, and manage rate limits.",
                icon: <IconRobot />,
                link: "/administration/prompt-apps",
            },
        ],
    },
    // {
    //     name: "*** DevOps & Deployment",
    //     icon: <IconGitBranch className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Quality & Testing",
    //     icon: <IconTestPipe className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** System Health",
    //     icon: <IconChartLine className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Database & Data",
    //     icon: <IconDatabase className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Feature Management",
    //     icon: <IconFlag className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Security & Access",
    //     icon: <IconLock className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Content & Config",
    //     icon: <IconPencil className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Automation & Tasks",
    //     icon: <IconRobot className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Environment-Specific Storage Management",
    //     icon: <IconCloud className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** File Versioning & History Management",
    //     icon: <IconHistory className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Asset Optimization & CDN Management",
    //     icon: <IconMaximize className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Storage Quota & Usage Monitoring",
    //     icon: <IconDatabase className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Advanced File Permissions & Access Control",
    //     icon: <IconShield className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** File Backup & Restore",
    //     icon: <CiFloppyDisk className="w-6 h-6" />,
    //     features: [],
    // },
    // {
    //     name: "*** Developer Tools & Integrations",
    //     icon: <IconCode className="w-6 h-6" />,
    //     features: [],
    // },
];
