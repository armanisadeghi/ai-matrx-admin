// app/(authenticated)/tests/recipe-creation/brokers-five/types.ts

// types.ts
export interface Variable {
    id: string;
    displayName: string;
    officialName: string;
    value: string;
    componentType: string;
    instructions: string;
    defaultSource: string;
    sourceDetails?: string;
    isConnected: boolean;
    isReady: boolean;
    isDeleted: boolean;
    color: string;
    position?: {
        start: number;
        end: number;
    };
}

export interface EditorState {
    content: string;
    selection: { start: number; end: number } | null;
}

export interface EditorRef {
    current: HTMLDivElement | null;
}
