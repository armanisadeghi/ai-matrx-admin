// types/notes.types.ts

export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    folderId: string | null;

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


export interface Folder {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NotesState {
    notes: Note[];
    folders: Folder[];
    selectedNoteId: string | null;
    selectedFolderId: string | null;
}
