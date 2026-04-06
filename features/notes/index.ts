// features/notes/index.ts

// Components (notes UI) + actions (cross-app integration)
export * from "./components";
export * from "./actions";

// Redux (primary state management)
export * from "./redux";

// Hooks
export { useNotesRedux } from "./hooks/useNotesRedux";
export { useNoteUndoRedo } from "./hooks/useNoteUndoRedo";
export { useNotes } from "./hooks/useNotes";
export { useAutoSave } from "./hooks/useAutoSave";
export { useActiveNote } from "./hooks/useActiveNote";
export { useAutoLabel } from "./hooks/useAutoLabel";

// Service
export * from "./service/notesService";

// Public API (for external use)
export { NotesAPI } from "./service/notesApi";

// Types
export * from "./types";

// Utils
export * from "./utils/noteUtils";
export * from "./utils/folderUtils";

// Constants
export * from "./constants/defaultFolders";
export * from "./constants/folderCategories";
