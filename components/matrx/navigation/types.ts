// components/matrx/navigation/types.ts

/** Icon can be a pre-rendered node or a component (e.g. Lucide icon) for default styling. */
export type ModulePageIcon = React.ReactNode | React.ComponentType<{ className?: string }>;

export type NavItem = {
    title: string;
    path: string;
    relative?: boolean;
    description?: string;
    icon?: ModulePageIcon;
    badge?: string;
    color?: string;
};

export interface NavCardProps {
    items: NavItem[];
    basePath?: string;
    columns?: number | "auto";
    variant?: "default" | "compact" | "feature";
    showPath?: boolean;
    className?: string;
    cardClassName?: string;
    animated?: boolean;
}

export interface ModulePage {
    title: string;
    path: string;
    relative: boolean;
    description: string;
    icon?: ModulePageIcon;
    color?: string;
    layout?: string;
}

export interface ModuleHeaderProps {
    pages: ModulePage[];
    currentPath: string;
    moduleHome: string;
    className?: string;
    moduleName?: string;
}
