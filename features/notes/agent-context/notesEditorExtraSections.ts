import {
  Save,
  CopyPlus,
  Download,
  Link2,
  ClipboardCopy,
  House,
  Shapes,
  StickyNote,
  X,
  Trash2,
} from "lucide-react";
import type {
  ContextMenuExtraSection,
  ContextMenuExtraItem,
} from "@ai-matrx/context-menu/engine";

/**
 * Note-specific menu items injected into the canonical `UnifiedAgentContextMenu`
 * via `extraSections`. The core menu already renders selection / undo-redo /
 * clipboard / find / agent placements / quick-actions / admin — these are the
 * items ONLY the notes surface knows about. Every `onSelect` is bound to a REAL
 * handler supplied by the host (NoteContentEditor); there are no toast stubs.
 * The host owns the handlers + state, so this stays a pure description.
 */
export interface NotesEditorExtraSectionsConfig {
  /** Disables "Save" when the note has no unsaved changes. */
  isDirty?: boolean;
  /** Open-tab count — gates "Close Other Tabs" / "Close All Tabs". */
  openTabCount?: number;
  onSave: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onShareLink: () => void;
  onShareClipboard: () => void;
  /** Open the home picker (the one move path: `moveNoteToHome`). */
  onMoveToHome: () => void;
  onCloseTab: () => void;
  onCloseOtherTabs: () => void;
  onCloseAllTabs: () => void;
  /**
   * Convert the note's materializable blocks (fences / kind-JSON /
   * `<artifact>` tags) into persisted canvas artifacts and rewrite the body
   * to `<artifact id>` refs. Omitted for read-only / unpersisted notes.
   */
  onConvertBlocksToArtifacts?: () => void;
  onDelete: () => void;
  /**
   * The note's tab already contributes THE note actions (noteActionSet.ts —
   * Duplicate, Move, Export, Move to Trash…) to this same menu. Then this
   * section carries only the editor's own rows, under "Editor", so no action
   * appears twice under two names.
   */
  noteActionsFromTab?: boolean;
}

export function createNotesEditorExtraSections(
  config: NotesEditorExtraSectionsConfig,
): ContextMenuExtraSection[] {
  const {
    isDirty,
    openTabCount = 1,
    onSave,
    onDuplicate,
    onExport,
    onShareLink,
    onShareClipboard,
    onMoveToHome,
    onCloseTab,
    onCloseOtherTabs,
    onCloseAllTabs,
    onConvertBlocksToArtifacts,
    onDelete,
    noteActionsFromTab = false,
  } = config;

  // Tabs submenu (notes is multi-tab; the canonical menu has no concept of it).
  const tabChildren: ContextMenuExtraItem[] = [
    {
      kind: "item",
      id: "close-tab",
      label: "Close Tab",
      icon: X,
      onSelect: onCloseTab,
    },
    {
      kind: "item",
      id: "close-others",
      label: "Close Other Tabs",
      disabled: openTabCount <= 1,
      onSelect: onCloseOtherTabs,
    },
    {
      kind: "item",
      id: "close-all",
      label: "Close All Tabs",
      disabled: openTabCount === 0,
      onSelect: onCloseAllTabs,
    },
  ];

  const items: ContextMenuExtraItem[] = [
    {
      kind: "item",
      id: "save",
      label: "Save",
      icon: Save,
      hint: "⌘S",
      disabled: !isDirty,
      onSelect: onSave,
    },
    {
      kind: "item",
      id: "duplicate",
      label: "Duplicate",
      icon: CopyPlus,
      onSelect: onDuplicate,
    },
    {
      kind: "item",
      id: "export",
      label: "Export as Markdown",
      icon: Download,
      onSelect: onExport,
    },
    {
      kind: "item",
      id: "share-link",
      label: "Share link…",
      icon: Link2,
      onSelect: onShareLink,
    },
    {
      kind: "item",
      id: "share-clipboard",
      label: "Copy to clipboard",
      icon: ClipboardCopy,
      onSelect: onShareClipboard,
    },
    ...(onConvertBlocksToArtifacts
      ? ([
          {
            kind: "item",
            id: "convert-artifacts",
            label: "Convert blocks to artifacts",
            icon: Shapes,
            onSelect: onConvertBlocksToArtifacts,
          },
        ] as ContextMenuExtraItem[])
      : []),
    {
      kind: "item",
      id: "move",
      label: "Move to…",
      icon: House,
      onSelect: onMoveToHome,
    },
    {
      kind: "submenu",
      id: "tabs",
      label: "Tabs",
      icon: X,
      children: tabChildren,
    },
    { kind: "separator", id: "delete-sep" },
    {
      kind: "item",
      id: "delete",
      label: "Move to Trash",
      icon: Trash2,
      destructive: true,
      onSelect: onDelete,
    },
  ];

  // The tab's rows carry Save too ("note-buffer", greyed with its reason), and
  // both join the one menu on the note's content: a second "save" was yielded
  // twice and refused by the action registry (2026-09-30).
  const shared = new Set(["save", "duplicate", "export", "move", "tabs", "delete-sep", "delete"]);
  const own = noteActionsFromTab
    ? items.filter((item) => !shared.has(item.id))
    : items;

  return [
    {
      id: "notes-ops",
      label: noteActionsFromTab ? "Editor" : "Note",
      icon: StickyNote,
      anchor: "after-compare",
      items: own,
    },
  ];
}

/**
 * The same sections, for a component's render. The handlers in `config`
 * touch refs (pending-save timers, live content); the React Compiler refuses
 * a component that hands such callbacks to a plain function during render
 * (it could call them), but trusts a hook not to — so components call this.
 */
export function useNotesEditorExtraSections(
  config: NotesEditorExtraSectionsConfig,
): ContextMenuExtraSection[] {
  return createNotesEditorExtraSections(config);
}
