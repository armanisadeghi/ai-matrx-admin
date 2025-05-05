// components/matrx/navigation/types.ts
export type NavItem = {
    title: string;
    path: string;
    relative?: boolean;
    description?: string;
    icon?: React.ReactNode;
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
    icon?: React.ReactNode;
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
