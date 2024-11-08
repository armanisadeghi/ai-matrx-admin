// components/matrx/navigation/types.ts
export type NavItem = {
    title: string;
    path: string;
    relative?: boolean;
    description?: string;
};

export type NavCardProps = {
    items: NavItem[];
    basePath?: string;
};

export interface ModulePage {
    title: string;
    path: string;
    relative: boolean;
    description: string;
}

export interface ModulePage {
    title: string;
    path: string;
    relative: boolean;
    description: string;
}

export interface ModuleHeaderProps {
    pages: ModulePage[];
    currentPath: string;
    moduleHome: string;
    className?: string;
    moduleName?: string;
}

