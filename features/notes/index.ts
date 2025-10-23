// features/notes/index.ts

// Components
export * from './components';

// Context
export { NotesProvider, useNotesContext } from './context/NotesContext';

// Hooks
export { useNotes } from './hooks/useNotes';
export { useAutoSave } from './hooks/useAutoSave';
export { useActiveNote } from './hooks/useActiveNote';
export { useAutoLabel } from './hooks/useAutoLabel';

// Service
export * from './service/notesService';

// Public API (for external use)
export { NotesAPI } from './service/notesApi';

// Types
export * from './types';

// Utils
export * from './utils/noteUtils';
export * from './utils/folderUtils';

// Constants
export * from './constants/defaultFolders';

