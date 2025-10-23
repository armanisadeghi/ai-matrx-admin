// types/notes.types.ts

export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    folderId: string | null;
    userId?: string; // Owner of the note
    sharedWith?: string[]; // User IDs who have view access
    metadata?: Record<string, any>; // Flexible field for future features
    createdAt: string;
    updatedAt: string;
}

export interface Folder {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    userId?: string; // Owner of the folder
    createdAt: string;
    updatedAt: string;
}

export interface NotesState {
    notes: Note[];
    folders: Folder[];
    selectedNoteId: string | null;
    selectedFolderId: string | null;
}

// Legacy - keeping for backwards compatibility
export interface Tag {
    id: string;
    name: string;
}

export interface TagsState {
    tags: Tag[];
}
