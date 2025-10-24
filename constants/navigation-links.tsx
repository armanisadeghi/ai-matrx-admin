// File: @/constants/navigation-links.tsx

import React from "react";
import { IconHome, IconNewSection } from "@tabler/icons-react";
import { FaBrain, FaImage, FaDatabase } from "react-icons/fa";
import { SiGooglechat } from "react-icons/si";
import { AiFillAudio } from "react-icons/ai";
import {
    FlaskConical,
    Home,
    Settings,
    SquareFunction,
    Users,
    CreditCard,
    Camera,
    Palette,
    Table,
    Type,
    Maximize,
    FileInput,
    Image,
    Sliders,
    Video,
    Images,
    Edit3,
    AudioLines,
    User,
    SquareSigma,
    Component,
    ShieldEllipsis,
    Repeat1,
    DatabaseZap,
    FileJson,
    ClipboardCheck,
    SquareMousePointer,
    Grid2x2Plus,
    TableCellsSplit,
    LayoutGrid,
    ClipboardType,
    LandPlot,
    Microscope,
    Brain,
    LayoutPanelLeft,
    Puzzle,
    Workflow,
    StickyNote,
    ListTodo,
} from "lucide-react";
import { IoLogoReact } from "react-icons/io5";
import { TbBrandSocketIo } from "react-icons/tb";
import { LuWebhook } from "react-icons/lu";
import { BsFillChatRightFill, BsChatRight } from "react-icons/bs";
import { TbRelationManyToMany } from "react-icons/tb";
import { SiMagic, SiSocketdotio } from "react-icons/si";
import { SiCodemagic } from "react-icons/si";


// Centralized navigation links for use across the application
// This ensures we have a single source of truth for navigation items
export const navigationLinks = [
    {
        label: "Home",
        icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/dashboard",
        profileMenu: true,
        dashboard: true,
    },
    {
        label: "Chat",
        icon: <SiGooglechat className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/chat",
        profileMenu: true,
        dashboard: true,
    },
    {
        label: "Notes",
        icon: <StickyNote className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/notes",
        profileMenu: true,
        dashboard: true,
    },
    {
        label: "Tasks",
        icon: <ListTodo className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/tasks",
        profileMenu: true,
        dashboard: true,
    },
    {
        label: "Cockpit",
        icon: <FaBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/ai/cockpit",
        profileMenu: true,
        dashboard: true,
    },
    {
        label: "Applets",
        icon: <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/applets",
        profileMenu: true,
        dashboard: true,
    },
    {
        label: "Data",
        icon: <FaDatabase className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/data",
        profileMenu: true,
        dashboard: true,
    },
    {
        label: "Image Search",
        icon: <FaImage className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/image-editing/public-image-search",
        profileMenu: true,
        dashboard: true,
    },
    {
        label: "Voices",
        icon: <AiFillAudio className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/demo/voice/voice-manager",
        profileMenu: true,
        dashboard: true,
    },
];

export const adminNavigationLinks = [
    {
        label: "Admin Dashboard",
        href: "/administration",
        icon: <ShieldEllipsis className="text-rose-500 dark:text-rose-600 h-5 w-5 flex-shrink-0" />,
        category: "primary",
    },
    {
        label: "Old Dashboard",
        href: "/admin",
        icon: <ShieldEllipsis className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Old",
    },
    {
        label: "Official Components",
        href: "/admin/official-components",
        icon: <Puzzle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "primary",
    },
    {
        label: "New Socket Admin",
        href: "/tests/socket-tests/redux-form-test",
        icon: <SiSocketdotio className="text-blue-500 h-5 w-5 flex-shrink-0" />,
        category: "Socket IO",
    },
    {
        label: "Matrx Table",
        href: "/tests/table-test/advanced-data-table",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Entities",
    },

    {
        label: "All Layouts",
        href: "/apps/all-layouts", // https://lucide.dev/icons/
        icon: (
            <LayoutPanelLeft className="text-blue-500 dark:text-blue-600 hover:text-blue-600 dark:hover:text-blue-700 h-5 w-5 flex-shrink-0" />
        ),
        category: "Applets",
    },

    {
        label: "App Builder Parts",
        href: "/apps/app-builder", // https://lucide.dev/icons/
        icon: (
            <LayoutPanelLeft className="text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700 h-5 w-5 flex-shrink-0" />
        ),
        category: "Applets",
    },
    {
        label: "App Builder Wizard",
        href: "/apps/builder", // https://lucide.dev/icons/
        icon: (
            <SiCodemagic className="text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700 h-5 w-5 flex-shrink-0" />
        ),
        category: "App Builder",
    },


    {
        label: "App Builder Hub",
        href: "/apps/builder/hub", // https://lucide.dev/icons/
        icon: (
            <SiMagic className="text-green-500 dark:text-green-600 hover:text-green-600 dark:hover:text-green-700 h-5 w-5 flex-shrink-0" />
        ),
        category: "App Builder",
    },

    
    {
        label: "Dynamic Layout Demo",
        href: "/apps/dynamic-layouts/options", // app\(authenticated)\apps\dynamic-layouts
        icon: (
            <LayoutPanelLeft className="text-green-500 dark:text-green-600 hover:text-green-600 dark:hover:text-green-700 h-5 w-5 flex-shrink-0" />
        ),
        category: "Applets",
    },
    {
        label: "Final Form Test",
        href: "/tests/forms/entity-final-test", // https://lucide.dev/icons/
        icon: <LandPlot className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Entities",
    },

    {
        label: "Socket Admin",
        href: "/admin/socketio",
        icon: <TbBrandSocketIo className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Socket IO",
    },
    // {
    //     label: "Broker Components",
    //     href: "/brokers/component-editor",
    //     icon: <IoLogoReact className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    //     category: "Old",
    // },
    {
        label: "Model Endpoints",
        href: "/demo/many-to-many-ui/claude",
        icon: <TbRelationManyToMany className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "AI Integrations",
    },
    {
        label: "Workflows",
        href: "/demo/workflows",
        icon: <Workflow className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Workflows",
    },
    {
        label: "Tailwind Test",
        href: "/tests/tailwind-test",
        icon: <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Styling",
    },
    {
        label: "Table Test",
        href: "/tests/table-test",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Entities",
    },
    {
        label: "Registered Functions",
        href: "/admin/registered-functions",
        icon: <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Entities",
    },
    {
        label: "Schema Manager",
        href: "/admin/schema-manager", // https://lucide.dev/icons/
        icon: <DatabaseZap className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Concepts",
    },

    {
        label: "Text Cleaner",
        href: "/admin/utils/text-cleaner", // https://lucide.dev/icons/
        icon: <ClipboardCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Concepts",
    },

    {
        label: "All Form Tests",
        href: "/tests/forms",
        icon: <FileInput className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Entities",
    },
    {
        label: "Selector Tests",
        href: "/tests/selector-test", // https://lucide.dev/icons/
        icon: <SquareMousePointer className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Redux",
    },
    {
        label: "InteliTable",
        href: "/tests/matrx-table",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Entities",
    },
    {
        label: "Prompt Builder",
        href: "/demo/prompt-builder",
        icon: <ClipboardType className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        category: "Concepts",
    },
];
