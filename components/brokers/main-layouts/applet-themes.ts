import { AppletTheme } from "./types";
// import { THEMES } from "@/components/mardown-display/themes";

export const pinkBlueTheme: AppletTheme = {
    primaryColor: "pink",
    secondaryColor: "cyan",
    accentColor: "blue",
    containerBg: "bg-gradient-to-br from-pink-50 to-cyan-50 dark:from-pink-950 dark:to-cyan-950",
    containerBorder: "border-2 border-pink-200 dark:border-pink-800",
    containerWidth: "w-full max-w-2xl mx-auto",
    containerShadow: "shadow-lg",

    // Title styles
    titleBasics: "p-2",
    titleBg: "bg-gradient-to-r from-pink-500 to-cyan-400 dark:from-pink-400 dark:to-cyan-300",
    titleText: "text-pink-800 dark:text-pink-100",
    titleSecondary: "text-pink-600 dark:text-pink-300",
    titleSize: "text-2xl font-bold",

    // Description
    descriptionBasics: "pl-2 pr-5 pb-1",
    descriptionSize: "font-medium text-left",
    descriptionText: "text-pink-700 dark:text-pink-300",

    // Icon styles
    iconColor: "text-cyan-500 dark:text-cyan-400",
    iconSize: "h-6 w-6",
    iconHover: "group-hover:scale-110 transition-transform",

    // Trigger styles
    triggerHover: "hover:opacity-80 transition-opacity",

    // Component Spacing
    componentSpacing: "space-y-6",

    // Item styles
    itemBg: "bg-white dark:bg-pink-950/50",
    itemBorder: "border-pink-100 dark:border-pink-700",
    itemTitle: "text-pink-700 dark:text-pink-300",
    itemDescription: "text-pink-600 dark:text-pink-400",

    // Link styles
    linkBg: "bg-pink-50 dark:bg-pink-950",
    linkBorder: "border-pink-200 dark:border-pink-800",
    linkText: "text-blue-700 dark:text-blue-300",

    // Table styles
    tableHeaderBg: "bg-pink-100 dark:bg-pink-900 hover:bg-pink-200 dark:hover:bg-pink-800",
    tableHeaderText: "text-pink-900 dark:text-pink-100",
    tableRowEvenBg: "bg-white dark:bg-transparent",
    tableRowOddBg: "bg-pink-50/50 dark:bg-pink-950/30",
    tableRowHover: "hover:bg-pink-50 dark:hover:bg-pink-900/20",
    tableBorder: "border-pink-200 dark:border-pink-800",
    tableText: "text-pink-700 dark:text-pink-200",

    // Card styles
    cardBg: "bg-white dark:bg-pink-950/50",
    cardBorder: "border-pink-200 dark:border-pink-800",
    cardShadow: "shadow-sm",
    cardHover: "hover:border-pink-300 dark:hover:border-pink-700",

    // Button styles
    buttonPrimaryBg:
        "bg-gradient-to-r from-pink-500 to-cyan-400 hover:from-pink-600 hover:to-cyan-500 dark:from-pink-600 dark:to-cyan-500 dark:hover:from-pink-700 dark:hover:to-cyan-600",
    buttonPrimaryText: "text-white font-semibold",
    buttonSecondaryBg: "bg-white hover:bg-pink-50 dark:bg-pink-950 dark:hover:bg-pink-900",
    buttonSecondaryText: "text-pink-700 dark:text-pink-300",
    buttonSecondaryBorder: "border-pink-200 dark:border-pink-800",
    buttonShadow: "shadow-md hover:shadow-lg",
    buttonTransition: "transition-all duration-200",
    buttonBorder: "border-0",

    // Input styles
    inputBg: "bg-white dark:bg-pink-950/50",
    inputBorder: "border-pink-300 dark:border-pink-700",
    inputText: "text-pink-700 dark:text-pink-200",
    inputPlaceholder: "placeholder-pink-400 dark:placeholder-pink-500",
    inputFocus: "focus:border-pink-500 dark:focus:border-pink-400",

    // Sidebar styles
    sidebarBg: "bg-gradient-to-b from-pink-50/80 to-cyan-50/80 dark:from-pink-950/80 dark:to-cyan-950/80",
    sidebarBorder: "border-pink-200 dark:border-pink-800",
    sidebarItemActiveBg: "bg-pink-100 dark:bg-pink-900/50",
    sidebarItemHover: "hover:bg-pink-50 dark:hover:bg-pink-900/30",
    sidebarItemText: "text-pink-600 dark:text-pink-300",
    sidebarItemActiveText: "text-pink-900 dark:text-pink-100",
} as const;

export const professionalTheme: AppletTheme = {
    primaryColor: "gray",
    secondaryColor: "slate",
    accentColor: "blue",
    // Container styles - combining gradient and background
    containerBg: "bg-gradient-to-b from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950",
    containerBorder: "border-2 border-gray-200 dark:border-gray-800",
    containerWidth: "w-full max-w-2xl mx-auto",
    containerShadow: "shadow-lg",

    // Title styles - combining gradient and solid color
    titleBasics: "p-2",
    titleBg: "bg-gradient-to-r from-gray-600 to-slate-500 dark:from-gray-400 dark:to-slate-300",
    titleText: "text-gray-800 dark:text-gray-100",
    titleSecondary: "text-gray-600 dark:text-gray-300",
    titleSize: "text-2xl font-bold",

    // Description
    descriptionBasics: "pl-2 pr-5 pb-1",
    descriptionSize: "font-medium text-left",
    descriptionText: "text-gray-600 dark:text-gray-300",

    // Icon styles
    iconColor: "text-slate-500 dark:text-slate-400",
    iconSize: "h-6 w-6",
    iconHover: "group-hover:scale-110 transition-transform",

    // Trigger
    triggerHover: "hover:opacity-80 transition-opacity",

    // Component Spacing
    componentSpacing: "space-y-6",

    // Item styles
    itemBg: "bg-white dark:bg-gray-950/50",
    itemBorder: "border-gray-200 dark:border-gray-700",
    itemTitle: "text-gray-700 dark:text-gray-300",
    itemDescription: "text-gray-600 dark:text-gray-400",

    // Table styles
    tableHeaderBg: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
    tableHeaderText: "text-gray-900 dark:text-gray-100",
    tableRowEvenBg: "bg-white dark:bg-transparent",
    tableRowOddBg: "bg-gray-50/50 dark:bg-gray-900/30",
    tableRowHover: "hover:bg-gray-50 dark:hover:bg-gray-800/20",
    tableBorder: "border-gray-200 dark:border-gray-700",
    tableText: "text-gray-700 dark:text-gray-200",

    // Card styles
    cardBg: "bg-white dark:bg-gray-950/50",
    cardBorder: "border-gray-200 dark:border-gray-700",
    cardShadow: "shadow-sm",
    cardHover: "hover:border-gray-300 dark:hover:border-gray-600",

    linkBg: "bg-gray-50 dark:bg-gray-950",
    linkBorder: "border-gray-200 dark:border-gray-800",
    linkText: "text-blue-700 dark:text-blue-300",

    // Button styles - combining gradient and solid colors
    buttonPrimaryBg: "bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600",
    buttonPrimaryText: "text-white",
    buttonSecondaryBg: "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700",
    buttonSecondaryText: "text-gray-700 dark:text-gray-200",
    buttonSecondaryBorder: "border-gray-300 dark:border-gray-600",
    buttonShadow: "shadow-md hover:shadow-lg",
    buttonTransition: "transition-all duration-200",
    buttonBorder: "border-gray-300 dark:border-gray-600",

    // Input styles
    inputBg: "bg-white dark:bg-gray-950/50",
    inputBorder: "border-gray-300 dark:border-gray-600",
    inputText: "text-gray-700 dark:text-gray-200",
    inputPlaceholder: "placeholder-gray-400 dark:placeholder-gray-500",
    inputFocus: "focus:border-gray-500 dark:focus:border-gray-400",

    // Sidebar styles
    sidebarBg: "bg-gradient-to-b from-gray-50/90 to-slate-50/90 dark:from-gray-950/90 dark:to-slate-950/90",
    sidebarBorder: "border-gray-200 dark:border-gray-700",
    sidebarItemActiveBg: "bg-gray-100 dark:bg-gray-800",
    sidebarItemHover: "hover:bg-gray-50 dark:hover:bg-gray-800/70",
    sidebarItemText: "text-gray-600 dark:text-gray-300",
    sidebarItemActiveText: "text-gray-900 dark:text-gray-100",
} as const;

export const defaultTheme: AppletTheme = {
    primaryColor: "neutral",
    secondaryColor: "slate",
    accentColor: "blue",
    // Container styles - combining gradient and background
    containerBg: "bg-gradient-to-b from-gray-50 to-neutral-50 dark:from-neutral-950 dark:to-neutral-950",
    containerBorder: "border-2 border-gray-200 dark:border-gray-800",
    containerWidth: "w-full max-w-2xl mx-auto",
    containerShadow: "shadow-lg",

    // Title styles - combining gradient and solid color
    titleBasics: "p-2",
    titleBg: "bg-gradient-to-r from-slate-600 to-neutral-500 dark:from-slate-400 dark:to-neutral-300",
    titleText: "bg-clip-text text-transparent text-left text-slate-800 dark:text-slate-100",
    titleSecondary: "text-slate-600 dark:text-slate-300",
    titleSize: "text-2xl font-bold",

    // Description
    descriptionBasics: "pl-2 pr-5 pb-1",
    descriptionSize: "font-medium text-left",
    descriptionText: "text-slate-600 dark:text-slate-300",

    // Icon styles
    iconColor: "text-neutral-500 dark:text-neutral-400",
    iconSize: "h-6 w-6",
    iconHover: "group-hover:scale-110 transition-transform",

    // Trigger
    triggerHover: "hover:opacity-80 transition-opacity",

    // Component Spacing
    componentSpacing: "space-y-6",
    // Item styles
    itemBg: "bg-white dark:bg-slate-950/50",
    itemBorder: "border-slate-200 dark:border-slate-700",
    itemTitle: "text-slate-700 dark:text-slate-300",
    itemDescription: "text-slate-600 dark:text-slate-400",

    // Table styles
    tableHeaderBg: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
    tableHeaderText: "text-slate-900 dark:text-slate-100",
    tableRowEvenBg: "bg-white dark:bg-transparent",
    tableRowOddBg: "bg-slate-50/50 dark:bg-slate-900/30",
    tableRowHover: "hover:bg-slate-50 dark:hover:bg-slate-800/20",
    tableBorder: "border-slate-200 dark:border-slate-700",
    tableText: "text-slate-700 dark:text-slate-200",

    // Card styles
    cardBg: "bg-white dark:bg-slate-950/50",
    cardBorder: "border-slate-200 dark:border-slate-700",
    cardShadow: "shadow-sm",
    cardHover: "hover:border-slate-300 dark:hover:border-slate-600",

    linkBg: "bg-gray-50 dark:bg-gray-950",
    linkBorder: "border-gray-200 dark:border-gray-800",
    linkText: "text-blue-700 dark:text-blue-300",

    // Button styles - combining gradient and solid colors
    buttonPrimaryBg: "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600",
    buttonPrimaryText: "text-white",
    buttonSecondaryBg: "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700",
    buttonSecondaryText: "text-slate-700 dark:text-slate-200",
    buttonSecondaryBorder: "border-slate-300 dark:border-slate-600",
    buttonShadow: "shadow-md hover:shadow-lg",
    buttonTransition: "transition-all duration-200",
    buttonBorder: "border-gray-300 dark:border-gray-600",

    // Input styles
    inputBg: "bg-white dark:bg-slate-950/50",
    inputBorder: "border-slate-300 dark:border-slate-600",
    inputText: "text-slate-700 dark:text-slate-200",
    inputPlaceholder: "placeholder-slate-400 dark:placeholder-slate-500",
    inputFocus: "focus:border-slate-500 dark:focus:border-slate-400",

    // Sidebar styles
    sidebarBg: "bg-gradient-to-b from-slate-50/90 to-neutral-50/90 dark:from-slate-950/90 dark:to-neutral-950/90",
    sidebarBorder: "border-slate-200 dark:border-slate-700",
    sidebarItemActiveBg: "bg-slate-100 dark:bg-slate-800",
    sidebarItemHover: "hover:bg-slate-50 dark:hover:bg-slate-800/70",
    sidebarItemText: "text-slate-600 dark:text-slate-300",
    sidebarItemActiveText: "text-slate-900 dark:text-slate-100",
} as const;

export const APPLET_THEMES = {
    pinkBlue: pinkBlueTheme,
    professional: professionalTheme,
    default: defaultTheme,
} as const;

export const APPLET_THEMES_ARRAY = Object.values(APPLET_THEMES);

export type AppletThemeName = keyof typeof APPLET_THEMES;
