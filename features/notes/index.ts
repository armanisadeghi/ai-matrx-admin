// features/notes/index.ts

// Components
export * from './components';

// Hooks
export { useNotes } from './hooks/useNotes';
export { useAutoSave } from './hooks/useAutoSave';
export { useActiveNote } from './hooks/useActiveNote';

// Service
export * from './service/notesService';

// Public API (for external use)
export { NotesAPI } from './service/notesApi';

// Types
export * from './types';

// Utils
export * from './utils/noteUtils';

