// features/notes/components/index.ts

// ── 6-Layer Architecture (NEW — use these) ──────────────────────────────────
export { NotesView, type NotesViewConfig, type NotesViewProps } from "./NotesView";
export { NoteContentEditor } from "./NoteContentEditor";
export { NoteMetadataBar } from "./NoteMetadataBar";
export { NoteTabItem } from "./NoteTabItem";
export { NoteTabBar } from "./NoteTabBar";
export { NoteSidebar } from "./NoteSidebar";

// ── Core Editor (used internally by NoteContentEditor) ──────────────────────
export { NoteEditorCore } from "./NoteEditorCore";
export { NoteEditorWithChrome } from "./NoteEditorWithChrome";
export type { EditorMode, NoteEditorCoreProps } from "./NoteEditorCore";
export type { NoteEditorChromeProps } from "./NoteEditorWithChrome";

// ── Legacy Components (deprecated — kept for backward compatibility) ─────────
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
