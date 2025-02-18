import { RunGenericHookType } from "@/hooks/run-recipe/useRunApps";


export type AppletTheme = {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    // Container styles
    containerBg: string;
    containerBorder: string;
    containerWidth: string;
    containerShadow: string;

    // Title styles
    titleBasics: string;
    titleBg: string;
    titleText: string;
    titleSecondary: string;
    titleSize: string;

    // Description
    descriptionBasics: string;
    descriptionSize: string;
    descriptionText: string;

    // Icon styles
    iconColor: string;
    iconSize: string;
    iconHover: string;

    // Trigger
    triggerHover: string;

    // Link styles
    linkBg: string;
    linkBorder: string;
    linkText: string;

    // Component Spacing
    componentSpacing: string;

    // Item styles
    itemBg: string;
    itemBorder: string;
    itemTitle: string;
    itemDescription: string;

    // Table styles
    tableHeaderBg: string;
    tableHeaderText: string;
    tableRowEvenBg: string;
    tableRowOddBg: string;
    tableRowHover: string;
    tableBorder: string;
    tableText: string;

    // Card styles
    cardBg: string;
    cardBorder: string;
    cardShadow: string;
    cardHover: string;

    // Button styles
    buttonPrimaryBg: string;
    buttonPrimaryText: string;
    buttonSecondaryBg: string;
    buttonSecondaryText: string;
    buttonSecondaryBorder: string;
    buttonShadow: string;
    buttonTransition: string;
    buttonBorder: string;
    // Input styles
    inputBg: string;
    inputBorder: string;
    inputText: string;
    inputPlaceholder: string;
    inputFocus: string;

    // Sidebar styles
    sidebarBg: string;
    sidebarBorder: string;
    sidebarItemActiveBg: string;
    sidebarItemHover: string;
    sidebarItemText: string;
    sidebarItemActiveText: string;
};

export interface BrokerComponentsDisplayProps {
    prepareRecipeHook: RunGenericHookType;
    recipeTitle?: string;
    recipeDescription?: string;
    recipeActionText?: string;
    theme?: AppletTheme;
    onSubmit?: () => void;
}
