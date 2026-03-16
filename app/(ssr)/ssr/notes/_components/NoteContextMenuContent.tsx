"use client";

// NoteContextMenuContent — Heavy content chunk for the notes context menu.
// Lazy-loaded on first right-click via NoteContextMenu (the thin trigger shell).
// Owns all logic: clipboard, find/replace, AI execution, Redux selectors, DB fetch.

import { useState, useCallback } from "react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Save,
  Copy,
  Scissors,
  Clipboard,
  Download,
  Link2,
  Share2,
  FolderInput,
  Sparkles,
  Trash2,
  X,
  Search,
  FileText,
  Zap,
  Shield,
  StickyNote,
  CheckSquare,
  MessageSquare,
  Database,
  FolderOpen,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { getIconComponent } from "@/components/official/IconResolver";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { selectIsDebugMode, toggleDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import type { CategoryGroup, ShortcutItem, ContentBlockItem } from "@/features/prompt-builtins/types/menu";
import { mapScopeToVariables } from "@/features/prompt-builtins/utils/execution";
import { usePromptRunner } from "@/features/prompts/hooks/usePromptRunner";
import { insertTextAtTextareaCursor } from "@/features/prompts/utils/textareaInsertUtils";
import { toast } from "@/components/ui/use-toast";
import { useNoteContextMenuGroups } from "./useNoteContextMenuGroups";

const FindReplaceModal = dynamic(
  () => import("@/components/modals/FindReplaceModal").then((m) => m.FindReplaceModal),
  { ssr: false, loading: () => null }
);

// ── Types ────────────────────────────────────────────────────────────────────

export interface NoteContextMenuContentProps {
  noteId: string;
  isDirty: boolean;
  allFolders: string[];
  currentFolder: string | undefined;
  noteContent: string;
  /** Ref to the textarea for clipboard ops and find/replace */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onSave: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onShareLink: () => void;
  onShareClipboard: () => void;
  onMove: (folder: string) => void;
  onCloseTab: () => void;
  onCloseOtherTabs: () => void;
  onCloseAllTabs: () => void;
  onDelete: () => void;
}

// ── Category group rendering helpers ─────────────────────────────────────────

function CategoryItems({
  group,
  depth = 0,
  onExecute,
  onInsertBlock,
}: {
  group: CategoryGroup;
  depth?: number;
  onExecute: (item: ShortcutItem) => void;
  onInsertBlock: (item: ContentBlockItem) => void;
}) {
  const shortcuts = group.items.filter(
    (item): item is ShortcutItem => item.type === "prompt_shortcut"
  );
  const contentBlocks = group.items.filter(
    (item): item is ContentBlockItem => item.type === "content_block"
  );
  const hasChildren = group.children && group.children.length > 0;
  const hasItems = shortcuts.length > 0 || contentBlocks.length > 0;

  if (!hasItems && !hasChildren) return null;

  // Every category always renders as a flyout submenu — matches UnifiedContextMenu behaviour
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5">
        <GroupIcon iconName={group.category.icon_name} />
        {group.category.label}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="min-w-[200px] max-h-[70vh] overflow-y-auto" avoidCollisions collisionPadding={8}>
        {shortcuts.map((item) => (
          <ShortcutMenuItem key={item.id} item={item} onExecute={onExecute} />
        ))}
        {contentBlocks.map((item) => (
          <ContentBlockMenuItem key={item.id} item={item} onInsert={onInsertBlock} />
        ))}
        {hasItems && hasChildren && <ContextMenuSeparator />}
        {group.children!?.map((child) => (
          <CategoryItems
            key={child.category.id}
            group={child}
            depth={depth + 1}
            onExecute={onExecute}
            onInsertBlock={onInsertBlock}
          />
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

function ShortcutMenuItem({
  item,
  onExecute,
}: {
  item: ShortcutItem;
  onExecute: (item: ShortcutItem) => void;
}) {
  const Icon = item.icon_name ? getIconComponent(item.icon_name, "Sparkles") : Sparkles;
  return (
    <ContextMenuItem
      className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
      onSelect={() => onExecute(item)}
    >
      <Icon />
      {item.label}
    </ContextMenuItem>
  );
}

function ContentBlockMenuItem({
  item,
  onInsert,
}: {
  item: ContentBlockItem;
  onInsert: (item: ContentBlockItem) => void;
}) {
  const Icon = item.icon_name ? getIconComponent(item.icon_name, "FileText") : FileText;
  return (
    <ContextMenuItem
      className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
      onSelect={() => onInsert(item)}
    >
      <Icon />
      {item.label}
    </ContextMenuItem>
  );
}

function GroupIcon({ iconName }: { iconName: string | null }) {
  if (!iconName) return <Sparkles className="w-3 h-3 shrink-0" />;
  const Icon = getIconComponent(iconName, "Sparkles");
  return <Icon className="w-3 h-3 shrink-0" />;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function NoteContextMenuContent({
  noteId,
  isDirty,
  allFolders,
  currentFolder,
  noteContent,
  textareaRef,
  onSave,
  onDuplicate,
  onExport,
  onShareLink,
  onShareClipboard,
  onMove,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onDelete,
}: NoteContextMenuContentProps) {
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin);
  const isDebugMode = useAppSelector(selectIsDebugMode);

  // DB-driven menu groups
  const { aiGroups, contentBlockGroups, loading: groupsLoading } = useNoteContextMenuGroups();

  // Unified AI execution — routes through the full orchestration system
  const { openPrompt } = usePromptRunner();

  // Find/Replace modal
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);

  // ── Clipboard operations ──────────────────────────────────────────────────

  const handleCopy = useCallback(() => {
    const ta = textareaRef?.current;
    if (ta) {
      const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
      if (sel) {
        navigator.clipboard.writeText(sel);
        return;
      }
    }
    document.execCommand("copy");
  }, [textareaRef]);

  const handleCut = useCallback(() => {
    const ta = textareaRef?.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start !== end) {
        const sel = ta.value.substring(start, end);
        navigator.clipboard.writeText(sel);
        // Remove from textarea by triggering an input event
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        const newVal = ta.value.substring(0, start) + ta.value.substring(end);
        nativeInputValueSetter?.call(ta, newVal);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.setSelectionRange(start, start);
        return;
      }
    }
    document.execCommand("cut");
  }, [textareaRef]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const ta = textareaRef?.current;
      if (ta && text) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        const newVal = ta.value.substring(0, start) + text + ta.value.substring(end);
        nativeInputValueSetter?.call(ta, newVal);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.setSelectionRange(start + text.length, start + text.length);
        ta.focus();
        return;
      }
    } catch {
      // Fallback
    }
    document.execCommand("paste");
  }, [textareaRef]);

  const handleSelectAll = useCallback(() => {
    const ta = textareaRef?.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(0, ta.value.length);
      return;
    }
    document.execCommand("selectAll");
  }, [textareaRef]);

  // ── AI prompt execution — routes through the full orchestration system ───────

  const executeAction = useCallback(
    async (item: ShortcutItem) => {
      if (!item.prompt_builtin) {
        toast({
          title: "Prompt Not Connected",
          description: `"${item.label}" has no connected prompt. Configure it in the admin panel.`,
          variant: "destructive",
        });
        return;
      }

      const builtin = item.prompt_builtin;
      const ta = textareaRef?.current;
      const selectionText = ta ? ta.value.substring(ta.selectionStart, ta.selectionEnd) : "";

      const applicationScope = {
        selection: selectionText,
        content: noteContent,
        context: noteContent,
      };

      const variables = mapScopeToVariables(
        applicationScope,
        item.scope_mappings ?? {},
        builtin.variableDefaults ?? []
      );

      const resultDisplay = item.result_display ?? "modal-full";

      const executionConfig = {
        auto_run: item.auto_run ?? true,
        allow_chat: item.allow_chat ?? true,
        show_variables: item.show_variables ?? false,
        apply_variables: item.apply_variables ?? true,
        track_in_runs: true,
        use_pre_execution_input: false,
      };

      try {
        await openPrompt({
          promptId: builtin.id,
          promptSource: "prompt_builtins",
          variables: item.apply_variables ? variables : {},
          executionConfig,
          result_display: resultDisplay,
          title: item.label,
          initialMessage: "",
        });
      } catch (error) {
        console.error("[NoteContextMenu] AI execution error:", error);
        toast({
          title: "Execution Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: "destructive",
        });
      }
    },
    [noteContent, textareaRef, openPrompt]
  );

  // ── Content block insertion — inserts template text at textarea cursor ───────

  const insertBlock = useCallback(
    (item: ContentBlockItem) => {
      const ta = textareaRef?.current;
      if (!ta) {
        toast({
          title: "Cannot Insert Block",
          description: "No active text area found.",
          variant: "destructive",
        });
        return;
      }
      insertTextAtTextareaCursor(ta, item.template);
    },
    [textareaRef]
  );

  // ── Quick Actions (dispatch overlays — works with LiteStore) ─────────────

  const openQuickNotes = useCallback(() => dispatch(openOverlay({ overlayId: "quickNotes" })), [dispatch]);
  const openQuickTasks = useCallback(() => dispatch(openOverlay({ overlayId: "quickTasks" })), [dispatch]);
  const openQuickChat = useCallback(() => dispatch(openOverlay({ overlayId: "quickChat" })), [dispatch]);
  const openQuickFiles = useCallback(() => dispatch(openOverlay({ overlayId: "quickFiles" })), [dispatch]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ContextMenuContent className="min-w-[220px] max-w-[280px]" avoidCollisions collisionPadding={8}>

          {/* ── Clipboard ── */}
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={handleCopy}
          >
            <Copy /> Copy
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={handleCut}
          >
            <Scissors /> Cut
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={handlePaste}
          >
            <Clipboard /> Paste
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={handleSelectAll}
          >
            <FileText /> Select All
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* ── Find & Replace ── */}
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={() => setFindReplaceOpen(true)}
          >
            <Search /> Find & Replace
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* ── Note actions ── */}
          {isDirty && (
            <ContextMenuItem
              className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
              onSelect={onSave}
            >
              <Save /> Save
            </ContextMenuItem>
          )}
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={onDuplicate}
          >
            <Copy /> Duplicate
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={onExport}
          >
            <Download /> Export as Markdown
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={onShareLink}
          >
            <Link2 /> Share Link
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={onShareClipboard}
          >
            <Share2 /> Copy to Clipboard
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* ── Move to Folder ── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5">
              <FolderInput /> Move to Folder
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-[180px] max-h-[70vh] overflow-y-auto" avoidCollisions collisionPadding={8}>
              {allFolders.map((folder) => {
                const isCurrent = currentFolder === folder;
                return (
                  <ContextMenuItem
                    key={folder}
                    className={`flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5 ${
                      isCurrent ? "text-amber-600 dark:text-amber-400" : ""
                    }`}
                    onSelect={() => !isCurrent && onMove(folder)}
                    disabled={isCurrent}
                  >
                    <FolderInput />
                    {folder}
                    {isCurrent && (
                      <span className="ml-auto text-[0.625rem] opacity-50">current</span>
                    )}
                  </ContextMenuItem>
                );
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />

          {/* ── AI Actions ── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5 text-purple-600 dark:text-purple-400 [&_svg]:text-purple-500">
              <Sparkles /> AI Actions
              {groupsLoading && <Loader2 className="w-3 h-3 animate-spin ml-auto opacity-50" />}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-[220px] max-h-[70vh] overflow-y-auto" avoidCollisions collisionPadding={8}>
              {groupsLoading ? (
                <div className="flex items-center gap-1.5 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                </div>
              ) : aiGroups.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground italic">
                  No AI actions available
                </div>
              ) : (
                aiGroups.map((group) => (
                  <CategoryItems
                    key={group.category.id}
                    group={group}
                    onExecute={executeAction}
                    onInsertBlock={insertBlock}
                  />
                ))
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>

          {/* ── Content Blocks ── */}
          {contentBlockGroups.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5">
                <FileText /> Content Blocks
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="min-w-[220px] max-h-[70vh] overflow-y-auto" avoidCollisions collisionPadding={8}>
                {contentBlockGroups.map((group) => (
                  <CategoryItems
                    key={group.category.id}
                    group={group}
                    onExecute={executeAction}
                    onInsertBlock={insertBlock}
                  />
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          {/* ── Quick Actions ── */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5">
              <Zap /> Quick Actions
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="min-w-[200px]" avoidCollisions collisionPadding={8}>
              <ContextMenuItem
                className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
                onSelect={openQuickNotes}
              >
                <StickyNote /> Quick Notes
              </ContextMenuItem>
              <ContextMenuItem
                className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
                onSelect={openQuickTasks}
              >
                <CheckSquare /> Quick Tasks
              </ContextMenuItem>
              <ContextMenuItem
                className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
                onSelect={openQuickChat}
              >
                <MessageSquare /> Quick Chat
              </ContextMenuItem>
              <ContextMenuItem
                className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
                onSelect={openQuickFiles}
              >
                <FolderOpen /> Quick Files
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {/* ── Admin Tools (admin-only) ── */}
          {isAdmin && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5 text-amber-600 dark:text-amber-400">
                <Shield /> Admin Tools
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="min-w-[200px]" avoidCollisions collisionPadding={8}>
                <ContextMenuItem
                  className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
                  onSelect={() => dispatch(toggleDebugMode())}
                >
                  <Database />
                  {isDebugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
                </ContextMenuItem>
                <ContextMenuItem
                  className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
                  onSelect={() => console.log("[Admin] Note ID:", noteId)}
                >
                  <FileText /> Log Note ID
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          <ContextMenuSeparator />

          {/* ── Tab management ── */}
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={onCloseTab}
          >
            <X /> Close Tab
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={onCloseOtherTabs}
          >
            <X /> Close Other Tabs
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-xs [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={onCloseAllTabs}
          >
            <X /> Close All Tabs
          </ContextMenuItem>

          <ContextMenuSeparator />

          {/* ── Destructive ── */}
          <ContextMenuItem
            className="flex items-center gap-2 text-xs text-destructive focus:text-destructive [&_svg]:w-3.5 [&_svg]:h-3.5"
            onSelect={onDelete}
          >
            <Trash2 /> Delete Note
          </ContextMenuItem>

      </ContextMenuContent>

      {/* Find & Replace modal — portaled, no z-index issues */}
      {findReplaceOpen && (
        <FindReplaceModal
          isOpen={findReplaceOpen}
          onClose={() => setFindReplaceOpen(false)}
          targetElement={textareaRef?.current}
          onReplace={(newText) => {
            const ta = textareaRef?.current;
            if (!ta) return;
            const nativeSet = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              "value"
            )?.set;
            nativeSet?.call(ta, newText);
            ta.dispatchEvent(new Event("input", { bubbles: true }));
          }}
        />
      )}
    </>
  );
}
