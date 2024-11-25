export interface HelpSection {
    title: string;
    content: React.ReactNode;
}

export interface HelpContent {
    title?: string;
    summary?: string;
    mainContent: React.ReactNode;
    sections?: HelpSection[];
    buttonLabels?: string[];
    variant?: 'default' | 'primary' | 'success' | 'warning';
    position?: 'inline' | 'fixed';
    draggable?: boolean;
}

export interface HelpConfiguration {
    [key: string]: HelpContent;
}
