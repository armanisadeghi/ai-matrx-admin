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
    Edit3, AudioLines, User, SquareSigma, Component, ShieldEllipsis, Repeat1, DatabaseZap, FileJson,
    ClipboardCheck,
    SquareMousePointer,
    Grid2x2Plus,
    TableCellsSplit,
    LayoutGrid,
    ClipboardType, LandPlot,
    Microscope
} from "lucide-react";
import React from "react";
import { BsFileEarmarkRichtextFill } from "react-icons/bs";


export const primaryLinks = [
    {
        label: 'Applets',
        href: '/applets',
        icon: (
            <LayoutGrid className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Math Demo',
        href: '/tests/math',
        icon: (
            <SquareSigma className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Flash Cards',
        href: '/flashcard',
        icon: (
            <CreditCard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Camera',
        href: '/tests/camera-test',
        icon: (
            <Camera className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },

    {
        label: 'Color Converter',
        href: '/tests/tailwind-test/color-converter',
        icon: (
            <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'AI Audio',
        href: '/demo/aiAudio',
        icon: (
            <AudioLines className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    // {
    //     label: 'Settings',
    //     href: '/dashboard/settings',
    //     icon: (
    //         <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
    //     ),
    // },
    {
        label: 'Developer Tests',
        href: '/tests',
        icon: (
            <FlaskConical className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'AI Playground',
        href: '/playground',
        icon: (
            <Repeat1 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Tailwind Test',
        href: '/tests/tailwind-test',
        icon: (
            <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Table Test',
        href: '/tests/table-test',
        icon: (
            <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    }, {
        label: 'InteliTable',
        href: '/tests/matrx-table',
        icon: (
            <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Rich Text Editor',
        href: '/rich-text-editor',
        icon: (
            <Type className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Full Screen Demo',
        href: '/tests/full-screen-demo',
        icon: (
            <Maximize className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'All Form Tests',
        href: '/tests/forms',
        icon: (
            <FileInput className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Image Gallery',
        href: '/tests/image-gallery-starter',
        icon: (
            <Image className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Floating Slider',
        href: '/tests/floating-slider-demo',
        icon: (
            <Sliders className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Video Conference',
        href: '/meetings',
        icon: (
            <Video className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Image Editing',
        href: '/image-editing',
        icon: (
            <Edit3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },

    {
        label: 'Stock Image Gallery',
        href: '/demo/images', // https://lucide.dev/icons/
        icon: (
            <Images className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'JSON Components Demo',
        href: '/tests/json-components-demo', // https://lucide.dev/icons/ json-components-demo
        icon: (
            <FileJson className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Entity CRUD',
        href: '/entity-crud', // https://lucide.dev/icons/
        icon: (
            <Grid2x2Plus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Entity Data Table',
        href: '/tests/table-test/simple-entity', // https://lucide.dev/icons/
        icon: (
            <TableCellsSplit className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
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
        label: 'System Admin Dashboard',
        href: '/admin',
        icon: (
            <ShieldEllipsis className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Playground Test',
        href: '/playground', // https://lucide.dev/icons/
        icon: (
            <Microscope className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Matrx Editor Tests',
        href: '/tests/matrx-editor', // https://lucide.dev/icons/
        icon: (
            <BsFileEarmarkRichtextFill className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Final Form Test',
        href: '/tests/forms/entity-final-test', // https://lucide.dev/icons/
        icon: (
            <LandPlot className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Final Form Test',
        href: '/tests/forms/entity-final-test', // https://lucide.dev/icons/
        icon: (
            <LandPlot className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Form Tests',
        href: '/tests/forms', // https://lucide.dev/icons/
        icon: (
            <ClipboardType className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Registered Functions',
        href: '/admin/registered-functions',
        icon: (
            <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Schema Manager',
        href: '/admin/schema-manager', // https://lucide.dev/icons/
        icon: (
            <DatabaseZap className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },

    {
        label: 'Text Cleaner',
        href: '/admin/utils/text-cleaner', // https://lucide.dev/icons/
        icon: (
            <ClipboardCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },

    {
        label: 'Selector Tests',
        href: '/tests/selector-test', // https://lucide.dev/icons/
        icon: (
            <SquareMousePointer className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
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
