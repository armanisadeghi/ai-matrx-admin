// types/notes.types.ts

export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Tag {
    id: string;
    name: string;
}

export interface NotesState {
    notes: Note[];
    selectedNoteId: string | null;
}

export interface TagsState {
    tags: Tag[];
}
