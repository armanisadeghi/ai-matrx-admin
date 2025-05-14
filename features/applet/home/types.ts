export interface MainLayoutProps {
    isInitialized: boolean;
    appName: string;
    appDescription: string;
    appIcon: any;
    appImageUrl: string;
    creator: string;
    primaryColor: string;
    accentColor: string;
    appletList: any[];
    appletsMap: Record<string, any>;
    navigateToApplet: (appletSlug: string) => void;
    isMobile: boolean;
}

export interface AppletCardProps {
    applet: {
        id: string;
        slug: string;
        name: string;
        description?: string;
        imageUrl?: string;
        creator?: string;
        appletIcon?: any;
        primaryColor?: string;
        accentColor?: string;
    };
    primaryColor: string;
    accentColor: string;
    onClick: () => void;
    isMobile: boolean;
}

export interface AppDisplayProps {
    appName: string;
    appDescription: string;
    appIcon: any;
    appImageUrl: string;
    creator: string;
    accentColor: string;
    primaryColor: string;
    isMobile: boolean;
}
