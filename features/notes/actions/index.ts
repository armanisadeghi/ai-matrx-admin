// features/notes/actions/index.ts
// Cross-app integration surfaces for notes (drop-ins + overlay wiring).

export { QuickCaptureButton } from "./QuickCaptureButton";
export { QuickNoteSaveModal } from "./QuickNoteSaveModal";
export { QuickNoteSaveModal as QuickSaveModal } from "./QuickNoteSaveModal";
export {
  QuickNoteSaveCore,
  QuickNoteSaveDialog,
  QuickNoteSaveOverlay,
  QuickNoteSavePopover,
  useQuickNoteSave,
  stripThinking,
  hasThinkingTags,
  applyTrim,
} from "./quick-save";
export type {
  QuickNoteSaveCoreProps,
  QuickNoteSaveDialogProps,
  QuickNoteSaveOverlayProps,
  QuickNoteSavePopoverProps,
  PostSaveAction,
} from "./quick-save";
export { SaveToScratchButton } from "./SaveToScratchButton";
export { SaveSelectionButton } from "./SaveSelectionButton";
export { QuickNotesButton } from "./QuickNotesButton";
export { QuickNotesSheet } from "./QuickNotesSheet";
export { CategoryNotesModal } from "./CategoryNotesModal";
export type { CategoryNotesModalProps } from "./CategoryNotesModal";
export { WindowNotesBody } from "./WindowNotesBody";
export type { WindowNotesBodyProps } from "./WindowNotesBody";
export { NotesTreeView } from "./NotesTreeView";
export type { NotesTreeViewProps } from "./NotesTreeView";
export { NotesWindow } from "@/features/window-panels/windows/notes/NotesWindow";
export type { NotesWindowProps } from "@/features/window-panels/windows/notes/NotesWindow";
export { default as SidebarNotesToggle } from "./SidebarNotesToggle";
export { NotesBetaWindow } from "@/features/window-panels/windows/notes/NotesBetaWindow";
export type { NotesBetaWindowProps } from "@/features/window-panels/windows/notes/NotesBetaWindow";
