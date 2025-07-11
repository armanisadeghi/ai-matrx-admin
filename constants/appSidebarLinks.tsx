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
    BookOpen,
} from "lucide-react";
import React from "react";
import { IoLogoReact } from "react-icons/io5";
import { TbBrandSocketIo } from "react-icons/tb";
import { LuWebhook } from "react-icons/lu";
import { BsFillChatRightFill, BsChatRight } from "react-icons/bs";
import { TbRelationManyToMany } from "react-icons/tb";
import { AiFillAudio } from "react-icons/ai";
import { SiMagic, SiSocketdotio } from "react-icons/si";
import { SiCodemagic } from "react-icons/si";

//brokers/component-editor

export const logEmojis = () => {
    console.log("🔴 Danger: ❌ ⚠️ 🛑 🚫 ⛔ 🔒 💣 💥 🧨 📛 ");
    console.log("🟢 Success: ✅ ✔️ 🎉 🏆 🥇 💚 🌟 🙌 🟩 ");
    console.log("🔵 Info: ℹ️ 🔍 💬 🧠 📘 📖 📚 📝 🧾 📡 ");
    console.log("🟠 Warning: ⚠️ 🔶 🚧 🥵 🕳️ 🧱 🔥 ⏳ 📛 ");
    console.log("🟣 Action/Progress: 🕹️ 🔄 ⏳ 📤 📥 💾 🚀 🏃‍♂️ ⚙️ 🔧 ");
    console.log("🟤 System/Technical: 🖥️ 💻 🧠 🔐 🛠️ 🔌 📡 🧮 🧰 🗂️ ");
    console.log("⚪ Communication: 📞 💬 📨 📩 ✉️ 📱 🗣️ 📢 📣 💭 ");
    console.log("🟡 Learning/Knowledge: 🧠 📚 📝 🎓 🧑‍🏫 📘 🔍 💡 🧪 ");
    console.log("🧊 Cold/Ice/Neutral: 🧊 🕊️ ⚪ 🔲 💤 🌫️ 🪞 🛋️ ");
};

export const primaryLinks = [
    {
        label: "AI Cockpit",
        href: "/ai/cockpit",
        icon: <Brain className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Applets",
        href: "/applets",
        icon: <LayoutGrid className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Chat",
        href: "/chat",
        icon: <BsChatRight className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Tables",
        href: "/data",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Voices",
        icon: <AiFillAudio className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        href: "/demo/voice/voice-manager",
    },
    {
        label: "Component Editor",
        href: "/brokers/component-editor",
        icon: <IoLogoReact className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Math Demo",
        href: "/tests/math",
        icon: <SquareSigma className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Flash Cards",
        href: "/flashcard",
        icon: <CreditCard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Color Converter",
        href: "/tests/tailwind-test/color-converter",
        icon: <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Image Gallery",
        href: "/image-editing/public-image-search", // https://lucide.dev/icons/
        icon: <Images className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Scrape & Analyze",
        href: "/demo/component-demo/socket-form-builder/scraper-ui/scraper-one",
        icon: <LuWebhook className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Entities",
        href: "/entity-crud", // https://lucide.dev/icons/
        icon: <Grid2x2Plus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    // {
    //     label: 'Camera',
    //     href: '/tests/camera-test',
    //     icon: (
    //         <Camera className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    // {
    //     label: 'AI Audio',
    //     href: '/demo/aiAudio',
    //     icon: (
    //         <AudioLines className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    // {
    //     label: 'Settings',
    //     href: '/dashboard/settings',
    //     icon: (
    //         <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    // {
    //     label: 'Developer Tests',
    //     href: '/tests',
    //     icon: (
    //         <FlaskConical className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },

    // {
    //     label: 'Image Gallery',
    //     href: '/tests/image-gallery-starter',
    //     icon: (
    //         <Image className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    // {
    //     label: 'Floating Slider',
    //     href: '/tests/floating-slider-demo',
    //     icon: (
    //         <Sliders className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    // {
    //     label: 'Video Conference',
    //     href: '/meetings',
    //     icon: (
    //         <Video className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    // {
    //     label: 'Image Editing',
    //     href: '/image-editing',
    //     icon: (
    //         <Edit3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },


    // {
    //     label: 'Entity Data Table',
    //     href: '/tests/table-test/simple-entity', // https://lucide.dev/icons/
    //     icon: (
    //         <TableCellsSplit className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    //
    // {
    //     label: 'Module Name',
    //     href: '/tests/module', // https://lucide.dev/icons/
    //     icon: (
    //         <Component className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    //
    // {
    //     label: 'Module Name',
    //     href: '/tests/module', // https://lucide.dev/icons/
    //     icon: (
    //         <Component className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    //
    // {
    //     label: 'Module Name',
    //     href: '/tests/module', // https://lucide.dev/icons/
    //     icon: (
    //         <Component className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    //
    // {
    //     label: 'Module Name',
    //     href: '/tests/module', // https://lucide.dev/icons/
    //     icon: (
    //         <Component className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
];

export const secondaryLinks = [
    {
        label: "New Admin Dashboard",
        href: "/administration",
        icon: <ShieldEllipsis className="text-rose-500 dark:text-rose-600 h-5 w-5 flex-shrink-0" />,
    },    {
        label: "Admin Dashboard",
        href: "/admin",
        icon: <ShieldEllipsis className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Official Components",
        href: "/admin/official-components",
        icon: <Puzzle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "New Socket Admin",
        href: "/tests/socket-tests/redux-form-test",
        icon: <SiSocketdotio className="text-blue-500 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Matrx Table",
        href: "/tests/table-test/advanced-data-table",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "App Builder Parts",
        href: "/apps/app-builder", // https://lucide.dev/icons/
        icon: <SiMagic className="text-amber-500 dark:text-amber-600 hover:text-amber-600 dark:hover:text-amber-700 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Applet demo",
        href: "/apps/demo", // https://lucide.dev/icons/
        icon: <LayoutPanelLeft className="text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Dynamic Layout Demo",
        href: "/apps/dynamic-layouts/options", // app\(authenticated)\apps\dynamic-layouts
        icon: <LayoutPanelLeft className="text-green-500 dark:text-green-600 hover:text-green-600 dark:hover:text-green-700 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "All Layouts",
        href: "/apps/all-layouts", // https://lucide.dev/icons/
        icon: <LayoutPanelLeft className="text-blue-500 dark:text-blue-600 hover:text-blue-600 dark:hover:text-blue-700 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "App Builder",
        href: "/apps/builder", // https://lucide.dev/icons/
        icon: <SiCodemagic className="text-rose-500 dark:text-rose-600 hover:text-rose-600 dark:hover:text-rose-700 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "App Builder Hub",
        href: "/apps/builder/hub", // https://lucide.dev/icons/
        icon: <SiMagic className="text-green-500 dark:text-green-600 hover:text-green-600 dark:hover:text-green-700 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Applet Components",
        href: "/tests/applet-tests/input-components-4", // https://lucide.dev/icons/
        icon: <LayoutPanelLeft className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    // tests/markdown-tests/
    {
        label: "Markdown Tests",
        href: "/tests/markdown-tests", // https://lucide.dev/icons/
        icon: <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Final Form Test",
        href: "/tests/forms/entity-final-test", // https://lucide.dev/icons/
        icon: <LandPlot className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },

    {
        label: "Socket Admin",
        href: "/admin/socketio",
        icon: <TbBrandSocketIo className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Broker Components",
        href: "/brokers/component-editor",
        icon: <IoLogoReact className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Model Endpoints",
        href: "/demo/many-to-many-ui/claude",
        icon: <TbRelationManyToMany className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Workflows",
        href: "/demo/workflows",
        icon: <Workflow className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Tailwind Test",
        href: "/tests/tailwind-test",
        icon: <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Table Test",
        href: "/tests/table-test",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Registered Functions",
        href: "/admin/registered-functions",
        icon: <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Schema Manager",
        href: "/admin/schema-manager", // https://lucide.dev/icons/
        icon: <DatabaseZap className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },

    {
        label: "Text Cleaner",
        href: "/admin/utils/text-cleaner", // https://lucide.dev/icons/
        icon: <ClipboardCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },

    {
        label: "All Form Tests",
        href: "/tests/forms",
        icon: <FileInput className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Selector Tests",
        href: "/tests/selector-test", // https://lucide.dev/icons/
        icon: <SquareMousePointer className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "InteliTable",
        href: "/tests/matrx-table",
        icon: <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
        label: "Prompt Builder",
        href: "/demo/prompt-builder",
        icon: <ClipboardType className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    //
    // {
    //     label: 'Module Name',
    //     href: '/tests/module', // https://lucide.dev/icons/
    //     icon: (
    //         <Component className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    //
    // {
    //     label: 'Module Name',
    //     href: '/tests/module', // https://lucide.dev/icons/
    //     icon: (
    //         <Component className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    //
    // {
    //     label: 'Module Name',
    //     href: '/tests/module', // https://lucide.dev/icons/
    //     icon: (
    //         <Component className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
];

export const appSidebarLinks = primaryLinks;

export const adminSidebarLinks = secondaryLinks;
