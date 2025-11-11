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
import { Database, DatabaseBackup, DatabaseZap, MessageSquare, Megaphone, Layout, Brain, Beaker } from "lucide-react";

export const adminCategories = [
    {
        name: "Experimental",
        icon: <Beaker className="w-6 h-6" />,
        iconColor: "text-fuchsia-600",
        features: [
            {
                title: "Experimental Routes",
                description: "Access all experimental, demo, and test routes organized by feature area for easy testing and development",
                icon: <Beaker />,
                link: "/administration/experimental-routes",
                isNew: true,
            },
        ],
    },
    {
        name: "Internal AI",
        icon: <Brain className="w-6 h-6" />,
        iconColor: "text-violet-600",
        features: [
            {
                title: "System Prompts",
                description:
                    "Manage global system prompts for context menus, execution cards, and other UI components throughout the application",
                icon: <IconRobot />,
                link: "/administration/system-prompts",
                isNew: true,
            },
        ],
    },
    {
        name: "Prompt Apps Administration",
        icon: <IconRobot className="w-6 h-6" />,
        iconColor: "text-red-600",
        features: [
            {
                title: "Prompt Apps Admin",
                description: "Manage prompt app categories, view errors, monitor analytics, moderate apps, and manage rate limits.",
                icon: <IconRobot />,
                link: "/administration/prompt-apps",
                isNew: true,
            },
        ],
    },
    {
        name: "Content & Configuration",
        icon: <IconPencil className="w-6 h-6" />,
        iconColor: "text-purple-600",
        features: [
            {
                title: "Content Blocks",
                description: "Manage content blocks, templates, and context menu items used throughout the application",
                icon: <IconClipboard />,
                link: "/administration/content-blocks",
            },
            {
                title: "Content Templates",
                description: "Manage message templates for prompts including system, user, assistant, and tool messages",
                icon: <MessageSquare />,
                link: "/administration/content-templates",
            },
            {
                title: "Markdown Content Tester",
                description:
                    "Test and debug EnhancedChatMarkdown rendering with live split-screen preview. Perfect for testing diagrams, quizzes, tables, and other content formats.",
                icon: <IconCode />,
                link: "/administration/markdown-tester",
            },

        ],
    },
    {
        name: "MCP Tools",
        icon: <IconTestPipe className="w-6 h-6" />,
        iconColor: "text-pink-600",
        features: [
            {
                title: "MCP Tools",
                description: "Manage MCP tools",
                icon: <IconTestPipe />,
                link: "/administration/mcp-tools",
                isNew: true,
            },
        ],
    },
    {
        name: "Server Cache",
        icon: <IconServer className="w-6 h-6" />,
        iconColor: "text-green-600",
        features: [
            {
                title: "Server Cache",
                description: "Refresh and manage server-side caches including AI models and other cached data",
                icon: <IconRefresh />,
                link: "/administration/server-cache",
            },
        ],
    },

    {
        name: "User Feedback & Announcements",
        icon: <MessageSquare className="w-6 h-6" />,
        iconColor: "text-orange-600",
        features: [
            {
                title: "Feedback Management",
                description: "View and manage user feedback, bug reports, and feature requests. Create and manage system announcements.",
                icon: <MessageSquare />,
                link: "/administration/feedback",
                isNew: true,
            },
        ],
    },

    {
        name: "Component Demos",
        icon: <Layout className="w-6 h-6" />,
        iconColor: "text-teal-600",
        features: [
            {
                title: "Official Components",
                description: "Browse and test all official UI components with live demos, code examples, and documentation.",
                icon: <Layout />,
                link: "/admin/official-components",
                isNew: true,
            },
        ],
    },
    {
        name: "Files",
        icon: <IconFolder className="w-6 h-6" />,
        iconColor: "text-amber-600",
        features: [
            {
                title: "System Files",
                description:
                    "Upload and manage public files for app-wide use including voice samples, documentation, images, and sample files. Easily copy URLs for use in code.",
                icon: <IconUpload />,
                link: "/administration/system-files",
                isNew: true,
            },
            {
                title: "Access Local Files",
                description: "Directly access and browse files stored on the local filesystem, enabling quick file management.",
                icon: <IconFolder />,
                link: "/administration/file-explorer",
            },
        ],
    },
    {
        name: "Database",
        icon: <Database className="w-6 h-6" />,
        iconColor: "text-blue-600",
        features: [
            {
                title: "Database Admin Dashboard",
                description: "See functions, security policies, and more",
                icon: <DatabaseBackup />,
                link: "/administration/database-admin",
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
        name: "Schema",
        icon: <IconDatabase className="w-6 h-6" />,
        iconColor: "text-cyan-600",
        features: [
            {
                title: "Schema Visualizer",
                description: "Visualize the full database schema with interactive diagrams",
                icon: <IconFlag />,
                link: "/administration/schema-visualizer",
            },
            {
                title: "Enhanced Schema Visualizer",
                description: "Advanced schema visualization with enhanced features and filtering",
                icon: <IconAdjustmentsBolt />,
                link: "/administration/schema-visualizer-enhanced",
            },
        ],
    },
    {
        name: "TypeScript",
        icon: <IconCode className="w-6 h-6" />,
        iconColor: "text-indigo-600",
        features: [
            {
                title: "TypeScript Error Analyzer",
                description: "View, filter, and analyze TypeScript compilation errors across the project",
                icon: <IconCode />,
                link: "/administration/typescript-errors",
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
