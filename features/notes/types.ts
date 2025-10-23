// features/notes/types.ts

export interface Note {
    id: string;
    user_id: string;
    label: string;
    content: string;
    folder_name: string;
    tags: string[];
    metadata: Record<string, any>;
    shared_with: Record<string, any>;
    is_deleted: boolean;
    position: number;
    created_at: string;
    updated_at: string;
}

export interface CreateNoteInput {
    label?: string;
    content?: string;
    folder_name?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    position?: number;
}

export interface UpdateNoteInput {
    label?: string;
    content?: string;
    folder_name?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    position?: number;
}

export interface FolderGroup {
    folder_name: string;
    notes: Note[];
    count: number;
}

export interface NoteFilters {
    search?: string;
    tags?: string[];
    folder_name?: string;
}

export type NoteSortField = 'label' | 'created_at' | 'updated_at';
export type NoteSortOrder = 'asc' | 'desc';

export interface NoteSortConfig {
    field: NoteSortField;
    order: NoteSortOrder;
}

