export interface EditorFile {
    id: string;
    path: string;
    content: string;
    lastModified: number;
}


export interface WorkspaceState {
    files: EditorFile[];
    activeFile?: string;
    githubSync?: {
        repo: string;
        branch: string;
        lastSync: number;
    };
}
