// features/notes/components/index.ts

// Core Editor (unified)
export { NoteEditorCore } from "./NoteEditorCore";
export { NoteEditorWithChrome } from "./NoteEditorWithChrome";
export type { EditorMode, NoteEditorCoreProps } from "./NoteEditorCore";
export type { NoteEditorChromeProps } from "./NoteEditorWithChrome";

// Main Components
export { NotesLayout } from "./NotesLayout";
export { NotesSidebar } from "./NotesSidebar";
export { NoteEditor } from "./NoteEditor";
export { NoteToolbar } from "./NoteToolbar";
export { NoteTabs } from "./NoteTabs";
export { CreateFolderDialog } from "./CreateFolderDialog";
export { RenameFolderDialog } from "./RenameFolderDialog";
export { MoveNoteDialog } from "./MoveNoteDialog";
export { ShareNoteDialog } from "./ShareNoteDialog";
export { TagInput } from "./TagInput";
