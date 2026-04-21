"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectIsDebugMode,
  toggleDebugMode,
} from "@/lib/redux/slices/adminDebugSlice";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import {
  selectIsOverlayOpen,
  toggleOverlay,
} from "@/lib/redux/slices/overlaySlice";
import { TextActionResultModal } from "@/components/modals/TextActionResultModal";
import { FindReplaceModal } from "@/components/modals/FindReplaceModal";
import { ContextDebugModal } from "@/components/debug/ContextDebugModal";
import { toast } from "@/components/ui/use-toast";
import { useQuickActions } from "@/features/quick-actions/hooks/useQuickActions";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { PLACEMENT_TYPES } from "@/features/agent-shortcuts/constants";
import { insertTextAtTextareaCursor } from "@/utils/text-insertion";
import type { Scope } from "@/features/agents/redux/shared/scope";
import type { ApplicationScope } from "@/features/agents/utils/scope-mapping";
import type { ResultDisplayMode } from "@/features/agents/types/instance.types";
import {
  useUnifiedAgentContextMenu,
  type AgentMenuEntry,
} from "./hooks/useUnifiedAgentContextMenu";
import { MenuBody } from "./components/MenuBody";
import {
  FloatingSelectionIcon,
  shouldRenderFloatingIcon,
} from "./components/FloatingSelectionIcon";
import {
  captureTextareaSelection,
  captureDomSelection,
  getSelectionRect,
  mouseFallbackRect,
  restoreTextareaSelection,
  restoreDomSelection,
  type CapturedSelection,
  type SelectionRange,
} from "./utils/selection-tracking";

export type PlacementVisibility = "show" | "hide" | "disable";

export type PlacementKey =
  | "ai-action"
  | "content-block"
  | "organization-tool"
  | "user-tool"
  | "quick-action";

export type PlacementMode = Partial<Record<PlacementKey, PlacementVisibility>>;

export interface UnifiedAgentContextMenuProps {
  children: React.ReactNode;
  editorId?: string;
  getTextarea?: () => HTMLTextAreaElement | null;
  onContentInserted?: () => void;
  onTextReplace?: (newText: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;
  isEditable?: boolean;
  /**
   * Per-placement visibility. Defaults to "show" for every placement type.
   * - "show"    → render normally
   * - "hide"    → don't render the submenu at all
   * - "disable" → render the submenu but greyed out and unclickable
   */
  placementMode?: PlacementMode;
  /** @deprecated Use `placementMode`. Anything not in this list is treated as "hide". */
  enabledPlacements?: string[];
  /**
   * Contexts added to the default {general} allow-set.
   * Example: `['code-editor']` lets code-editor shortcuts through alongside general.
   */
  addedContexts?: string[];
  /**
   * Contexts removed from the allow-set after `addedContexts` is applied.
   * Example: `excludedContexts: ['general']` with `addedContexts: ['code-editor']`
   * → only shortcuts tagged specifically with `code-editor` appear.
   */
  excludedContexts?: string[];
  contextData?: {
    content?: string;
    context?: string;
    /** @deprecated Use `addedContexts` / `excludedContexts` instead. */
    contextFilter?: string;
    [key: string]: unknown;
  };
  className?: string;
  enableFloatingIcon?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoHint?: string;
  redoHint?: string;
  onViewHistory?: () => void;
  hasHistory?: boolean;
  scope?: Scope;
  scopeId?: string | null;
}

const DEFAULT_PLACEMENT_MODE: Required<PlacementMode> = {
  "ai-action": "show",
  "content-block": "show",
  "organization-tool": "show",
  "user-tool": "show",
  "quick-action": "show",
};

const ALL_DB_PLACEMENTS: PlacementKey[] = [
  "ai-action",
  "content-block",
  "organization-tool",
  "user-tool",
];

function resolvePlacementMode(
  placementMode: PlacementMode | undefined,
  enabledPlacements: string[] | undefined,
): Required<PlacementMode> {
  // Explicit placementMode wins; callers migrating can drop `enabledPlacements`.
  if (placementMode) {
    return { ...DEFAULT_PLACEMENT_MODE, ...placementMode };
  }
  // Legacy path: anything not in enabledPlacements is hidden.
  if (enabledPlacements) {
    const enabledSet = new Set(enabledPlacements);
    return {
      "ai-action": enabledSet.has("ai-action") ? "show" : "hide",
      "content-block": enabledSet.has("content-block") ? "show" : "hide",
      "organization-tool": enabledSet.has("organization-tool")
        ? "show"
        : "hide",
      "user-tool": enabledSet.has("user-tool") ? "show" : "hide",
      "quick-action": enabledSet.has("quick-action") ? "show" : "hide",
    };
  }
  return DEFAULT_PLACEMENT_MODE;
}

export function UnifiedAgentContextMenu({
  children,
  editorId,
  getTextarea,
  onContentInserted,
  onTextReplace,
  onTextInsertBefore,
  onTextInsertAfter,
  isEditable = false,
  placementMode,
  enabledPlacements,
  addedContexts,
  excludedContexts,
  contextData = {},
  className,
  enableFloatingIcon = true,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  undoHint,
  redoHint,
  onViewHistory,
  hasHistory = false,
  scope = "global",
  scopeId = null,
}: UnifiedAgentContextMenuProps) {
  const dispatch = useAppDispatch();

  const resolvedPlacementMode = resolvePlacementMode(
    placementMode,
    enabledPlacements,
  );

  // Placements the hook should fetch items for: anything not "hide".
  // "disable" still fetches so the row count is available; "hide" skips.
  const dbPlacementTypes = ALL_DB_PLACEMENTS.filter(
    (p) => resolvedPlacementMode[p] !== "hide",
  );

  // Legacy support: contextFilter becomes a single-entry addedContexts +
  // excludedContexts: ['general'] — i.e. "only this one context".
  const legacyContextFilter = contextData?.contextFilter as string | undefined;
  const resolvedAddedContexts =
    addedContexts ?? (legacyContextFilter ? [legacyContextFilter] : undefined);
  const resolvedExcludedContexts =
    excludedContexts ?? (legacyContextFilter ? ["general"] : undefined);

  const { categoryGroups, loading } = useUnifiedAgentContextMenu({
    placementTypes: dbPlacementTypes,
    addedContexts: resolvedAddedContexts,
    excludedContexts: resolvedExcludedContexts,
    enabled: dbPlacementTypes.length > 0,
    scope,
    scopeId,
  });

  const { launchShortcut } = useAgentLauncher();
  const {
    openQuickNotes,
    openQuickTasks,
    openQuickChat,
    openQuickData,
    openQuickFiles,
    openVoicePad,
  } = useQuickActions();

  const isAdmin = useAppSelector(selectIsAdmin);
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const isAdminIndicatorOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "adminIndicator"),
  );

  const [contextDebugOpen, setContextDebugOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(
    null,
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const capturedSelection = useRef<CapturedSelection | null>(null);
  const selectionLocked = useRef(false);

  const [textResultModalOpen, setTextResultModalOpen] = useState(false);
  const [textResultData, setTextResultData] = useState<{
    original: string;
    result: string;
    promptName: string;
  } | null>(null);

  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [skipSelectionRestore, setSkipSelectionRestore] = useState(false);
  const findReplaceOpenRef = useRef(false);

  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showFloatingIcon, setShowFloatingIcon] = useState(false);

  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const handleSelection = () => {
      if (selectionLocked.current) return;
      const selection = window.getSelection();
      const text = selection?.toString().trim() || "";
      setSelectedText(text);

      if (text && selection && selection.rangeCount > 0) {
        const rect = getSelectionRect();
        if (rect) {
          setSelectionRect(rect);
        } else if (lastMousePos.current) {
          setSelectionRect(
            mouseFallbackRect(lastMousePos.current.x, lastMousePos.current.y),
          );
        }
      } else {
        setSelectionRect(null);
      }
    };
    document.addEventListener("selectionchange", handleSelection);
    return () =>
      document.removeEventListener("selectionchange", handleSelection);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 2) return;
    const target = e.target as HTMLElement;
    selectionLocked.current = true;

    if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement
    ) {
      const captured = captureTextareaSelection(target);
      capturedSelection.current = captured;

      if (captured.text) {
        const rect = getSelectionRect();
        if (rect) {
          setSelectionRect(rect);
        } else if (lastMousePos.current) {
          setSelectionRect(
            mouseFallbackRect(lastMousePos.current.x, lastMousePos.current.y),
          );
        }
      }
      setSelectedText(captured.text);
    } else {
      const captured = captureDomSelection();
      capturedSelection.current = captured;

      if (captured.text && captured.range) {
        try {
          const rect = captured.range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setSelectionRect(rect);
          }
        } catch {
          // best-effort
        }
      }
      setSelectedText(captured.text);
    }
  };

  React.useEffect(() => {
    findReplaceOpenRef.current = findReplaceOpen;
  }, [findReplaceOpen]);

  React.useEffect(() => {
    const shouldShow =
      enableFloatingIcon &&
      selectedText.length > 0 &&
      selectionRect !== null &&
      !menuOpen &&
      !dropdownOpen;
    const timer = setTimeout(() => {
      setShowFloatingIcon(shouldShow);
    }, 200);
    return () => clearTimeout(timer);
  }, [enableFloatingIcon, selectedText, selectionRect, menuOpen, dropdownOpen]);

  React.useEffect(() => {
    if (!showFloatingIcon) return;
    const handleScroll = () => {
      setShowFloatingIcon(false);
      setSelectionRect(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showFloatingIcon]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    let captured = capturedSelection.current;

    if (!captured || !captured.text) {
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement
      ) {
        captured = captureTextareaSelection(target);
      } else {
        captured = captureDomSelection();
      }
      capturedSelection.current = captured;
      selectionLocked.current = true;
    }

    if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement
    ) {
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const text = captured?.text || "";
      setSelectedText(text);
      setSelectionRange({
        type: "editable",
        element: target,
        start,
        end,
        range: null,
        containerElement: null,
      });
      setMenuOpen(true);
    } else {
      const text = captured?.text || "";
      const range = captured?.range || null;
      let containerElement = e.currentTarget as HTMLElement;
      if (!containerElement.hasAttribute("data-radix-context-menu-trigger")) {
        const trigger = containerElement.querySelector(
          "[data-radix-context-menu-trigger]",
        );
        if (trigger instanceof HTMLElement) containerElement = trigger;
      }
      setSelectedText(text);
      setSelectionRange({
        type: "non-editable",
        element: null,
        start: 0,
        end: 0,
        range,
        containerElement,
      });
      setMenuOpen(true);
    }
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
    selectionLocked.current = false;
    capturedSelection.current = null;

    if (skipSelectionRestore) {
      setSkipSelectionRestore(false);
      return;
    }
    if (findReplaceOpen) return;
    if (!selectionRange) return;

    if (selectionRange.type === "editable") {
      const { element, start, end } = selectionRange;
      if (
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLInputElement
      ) {
        restoreTextareaSelection(element, start, end);
      }
    } else {
      const { range } = selectionRange;
      if (range) restoreDomSelection(range);
    }
  };

  const handleCut = async () => {
    if (!selectionRange || selectionRange.type !== "editable") return;
    const element = selectionRange.element;
    if (
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLInputElement)
    )
      return;
    const { start, end } = selectionRange;
    const cutText = element.value.substring(start, end);
    try {
      await navigator.clipboard.writeText(cutText);
      const newValue =
        element.value.substring(0, start) + element.value.substring(end);
      if (onTextReplace) {
        onTextReplace(newValue);
      } else {
        element.value = newValue;
        element.setSelectionRange(start, start);
      }
      setSelectionRange(null);
    } catch (err) {
      console.error("Failed to cut:", err);
    }
  };

  const handleCopy = async () => {
    if (!selectedText) return;
    try {
      await navigator.clipboard.writeText(selectedText);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handlePaste = async () => {
    if (!selectionRange || !isEditable) return;
    if (selectionRange.type !== "editable") return;
    const element = selectionRange.element;
    if (
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLInputElement)
    )
      return;
    try {
      const text = await navigator.clipboard.readText();
      const { start, end } = selectionRange;
      const before = element.value.substring(0, start);
      const after = element.value.substring(end);
      const newValue = before + text + after;
      if (onTextReplace) {
        onTextReplace(newValue);
      } else {
        element.value = newValue;
        element.setSelectionRange(start + text.length, start + text.length);
      }
    } catch (err) {
      console.error("Failed to paste:", err);
    }
  };

  const handleSelectAll = () => {
    if (!selectionRange) return;
    const selectionToUse = selectionRange;
    setSelectionRange(null);

    if (selectionToUse.type === "editable") {
      const element = selectionToUse.element;
      if (
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLInputElement
      ) {
        requestAnimationFrame(() => {
          element.focus();
          element.select();
        });
      }
    } else {
      const container = selectionToUse.containerElement;
      if (!container) return;
      requestAnimationFrame(() => {
        try {
          const range = document.createRange();
          range.selectNodeContents(container);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch {
          // best-effort
        }
      });
    }
  };

  const handleFind = () => {
    setSkipSelectionRestore(true);
    setFindReplaceOpen(true);
    findReplaceOpenRef.current = true;
  };

  const handleShortcutExecute = useCallback(
    async (entry: Extract<AgentMenuEntry, { entryType: "agent_shortcut" }>) => {
      if (!entry.agentId) {
        toast({
          title: "Agent Not Connected",
          description: `"${entry.label}" has no connected agent. Please configure it in the admin panel.`,
          variant: "destructive",
        });
        return;
      }

      const selectionText =
        capturedSelection.current?.text || selectedText || "";

      // Compute text_before / text_after from the textarea around the selection.
      // This mirrors useAgentLauncherTester's applicationScope so shortcuts
      // mapped to `text_before` / `text_after` actually receive values.
      let textBefore = "";
      let textAfter = "";
      if (
        selectionRange &&
        selectionRange.type === "editable" &&
        selectionRange.element
      ) {
        const value = selectionRange.element.value ?? "";
        textBefore = value.substring(0, selectionRange.start ?? 0);
        textAfter = value.substring(selectionRange.end ?? 0);
      }

      const applicationScope: ApplicationScope = {
        selection: selectionText,
        text_before: textBefore,
        text_after: textAfter,
        content:
          typeof contextData?.content === "string" ? contextData.content : "",
        context:
          typeof contextData?.context === "string"
            ? { raw: contextData.context }
            : ((contextData?.context as Record<string, unknown> | undefined) ??
              {}),
      };

      for (const [k, v] of Object.entries(contextData ?? {})) {
        if (k === "content" || k === "context" || k === "contextFilter")
          continue;
        applicationScope[k] = v;
      }

      const resultDisplay = (entry.resultDisplay ??
        "modal-full") as ResultDisplayMode;

      try {
        await launchShortcut(entry.id, applicationScope, {
          surfaceKey: `context-menu:${entry.id}`,
          sourceFeature: "context-menu",
          displayMode: resultDisplay,
          autoRun: entry.autoRun ?? true,
          allowChat: entry.allowChat ?? true,
          showVariables: entry.showVariables ?? false,
          showPreExecutionGate: entry.showPreExecutionGate ?? false,
          originalText: selectionText,
        });
      } catch (error) {
        console.error(
          "[UnifiedAgentContextMenu] shortcut execution failed",
          error,
        );
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        toast({
          title: "Execution Failed",
          description: `${entry.label}: ${message}`,
          variant: "destructive",
        });
      }
    },
    [contextData, launchShortcut, selectedText],
  );

  const handleContentBlockInsert = useCallback(
    (entry: Extract<AgentMenuEntry, { entryType: "content_block" }>) => {
      const template = entry.template;

      if (editorId) {
        try {
          const { insertTextAtCursor } =
            require("@/features/rich-text-editor/utils/insertTextUtils") as {
              insertTextAtCursor: (id: string, text: string) => boolean;
            };
          const success = insertTextAtCursor(editorId, template);
          if (success) onContentInserted?.();
        } catch (err) {
          console.error("Failed to insert content block into editor:", err);
        }
        return;
      }

      if (getTextarea) {
        const textarea = getTextarea();
        if (textarea) {
          const success = insertTextAtTextareaCursor(textarea, template);
          if (success) onContentInserted?.();
        }
      }
    },
    [editorId, getTextarea, onContentInserted],
  );

  const handleEntrySelect = useCallback(
    (entry: AgentMenuEntry) => {
      if (entry.entryType === "agent_shortcut") {
        void handleShortcutExecute(entry);
      } else {
        handleContentBlockInsert(entry);
      }
    },
    [handleShortcutExecute, handleContentBlockInsert],
  );

  const handleDropdownClose = (open: boolean) => {
    setDropdownOpen(open);
    if (!open) {
      selectionLocked.current = false;
      capturedSelection.current = null;
      setTimeout(() => {
        setShowFloatingIcon(false);
        setSelectionRect(null);
      }, 100);
    }
  };

  const handleOpenFloating = (
    e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    selectionLocked.current = true;
    setDropdownOpen(true);
  };

  const menuBodyProps = {
    loading,
    selectedText,
    isEditable,
    placementMode: resolvedPlacementMode,
    categoryGroups,
    onEntrySelect: handleEntrySelect,
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    onSelectAll: handleSelectAll,
    onFind: handleFind,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    undoHint,
    redoHint,
    onViewHistory,
    hasHistory,
    isAdmin,
    isDebugMode,
    isAdminIndicatorOpen,
    onToggleDebugMode: () => dispatch(toggleDebugMode()),
    onToggleAdminIndicator: () =>
      dispatch(toggleOverlay({ overlayId: "adminIndicator" })),
    onInspectContext: () => setContextDebugOpen(true),
    onOpenQuickNotes: () => openQuickNotes(),
    onOpenQuickTasks: () => openQuickTasks(),
    onOpenQuickChat: () => openQuickChat(),
    onOpenQuickData: () => openQuickData(),
    onOpenQuickFiles: () => openQuickFiles(),
    onOpenVoicePad: () => openVoicePad(),
  };

  return (
    <>
      <ContextMenu onOpenChange={(open) => !open && handleMenuClose()}>
        <ContextMenuTrigger
          asChild
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className={`w-64 ${className ?? ""}`}>
          <MenuBody variant="context" {...menuBodyProps} />
        </ContextMenuContent>
      </ContextMenu>

      {enableFloatingIcon && (
        <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownClose}>
          <DropdownMenuTrigger asChild>
            {shouldRenderFloatingIcon(
              selectionRect,
              showFloatingIcon,
              dropdownOpen,
            ) ? (
              <FloatingSelectionIcon
                selectionRect={selectionRect}
                visible={showFloatingIcon}
                dropdownOpen={dropdownOpen}
                onOpen={handleOpenFloating}
                onDismiss={() => setShowFloatingIcon(false)}
              />
            ) : (
              <span style={{ display: "none" }} aria-hidden="true" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            align="center"
            side="bottom"
            sideOffset={5}
          >
            <MenuBody variant="dropdown" {...menuBodyProps} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isDebugMode && (
        <ContextDebugModal
          isOpen={contextDebugOpen}
          onClose={() => setContextDebugOpen(false)}
          contextData={{
            selection: capturedSelection.current?.text || selectedText,
            content:
              typeof contextData?.content === "string"
                ? contextData.content
                : "",
            context:
              typeof contextData?.context === "string"
                ? contextData.context
                : "",
            ...contextData,
          }}
        />
      )}

      {textResultModalOpen && textResultData && (
        <TextActionResultModal
          isOpen={textResultModalOpen}
          onClose={() => {
            setTextResultModalOpen(false);
            setTextResultData(null);
            setSelectionRange(null);
            setSelectedText("");
          }}
          originalText={textResultData.original}
          aiResponse={textResultData.result}
          promptName={textResultData.promptName}
          onReplace={(newText) => {
            onTextReplace?.(newText);
            setSelectionRange(null);
            setSelectedText("");
            setTextResultModalOpen(false);
          }}
          onInsertBefore={(text) => {
            onTextInsertBefore?.(text);
            setSelectionRange(null);
            setSelectedText("");
            setTextResultModalOpen(false);
          }}
          onInsertAfter={(text) => {
            onTextInsertAfter?.(text);
            setSelectionRange(null);
            setSelectedText("");
            setTextResultModalOpen(false);
          }}
        />
      )}

      <FindReplaceModal
        isOpen={findReplaceOpen}
        onClose={() => {
          setFindReplaceOpen(false);
          findReplaceOpenRef.current = false;
        }}
        targetElement={
          selectionRange?.type === "editable"
            ? (selectionRange.element as
                | HTMLTextAreaElement
                | HTMLInputElement
                | null)
            : null
        }
        onReplace={onTextReplace}
      />
    </>
  );
}
