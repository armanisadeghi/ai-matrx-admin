export interface IWorkspace {
    workspaceId: string;
    title: string;
    description: string;
    icon: React.ElementType;
    lastUpdated: string;
    stars?: number;
    template?: boolean;
}