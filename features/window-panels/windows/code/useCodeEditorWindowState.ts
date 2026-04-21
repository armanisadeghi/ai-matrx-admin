"use client";

/**
 * useCodeEditorWindowState
 *
 * Self-contained state for the CodeEditorWindow.
 * Manages the open-tab list, active tab, per-file content, and editor settings.
 * Intentionally independent of useCodeEditorBasics — the window has its own
 * tab system and does not need the standalone component's sidebar logic.
 */

import { useState, useCallback, useRef } from "react";
import { useMeasure } from "@uidotdev/usehooks";
import type { CodeFile } from "@/features/code-editor/multi-file-core/types";
import {
  mapLanguageForMonaco,
  getMonacoFileExtension,
} from "@/features/code-editor/config/languages";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseCodeEditorWindowStateProps {
  initialFiles: CodeFile[];
  initialActiveFile?: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCodeEditorWindowState({
  initialFiles,
  initialActiveFile,
}: UseCodeEditorWindowStateProps) {
  // ── File state ─────────────────────────────────────────────────────────────
  const [files, setFiles] = useState<CodeFile[]>(initialFiles);

  // ── Tab state ──────────────────────────────────────────────────────────────
  // Start with the first file (or initialActiveFile) open as the only tab.
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    if (initialFiles.length === 0) return [];
    const path = initialActiveFile ?? initialFiles[0].path;
    return [path];
  });

  const [activeTab, setActiveTab] = useState<string | null>(() => {
    if (initialFiles.length === 0) return null;
    return initialActiveFile ?? initialFiles[0].path ?? null;
  });

  // ── Editor settings ────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [showWrapLines, setShowWrapLines] = useState(false);
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [formatTrigger, setFormatTrigger] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  // ── Monaco height measurement ──────────────────────────────────────────────
  const [editorWrapperRef, { height: editorWrapperHeight }] =
    useMeasure<HTMLDivElement>();

  const editorHeight = editorWrapperHeight
    ? `${editorWrapperHeight}px`
    : undefined;

  // ── Derived current file ───────────────────────────────────────────────────
  const currentFile = files.find((f) => f.path === activeTab) ?? null;

  // ── Tab helpers ────────────────────────────────────────────────────────────

  /** Open a file as a tab (or switch to it if already open). */
  const openFile = useCallback((path: string) => {
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveTab(path);
  }, []);

  /** Close a tab. Switches to an adjacent tab automatically. */
  const closeTab = useCallback(
    (path: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setOpenTabs((prev) => {
        const filtered = prev.filter((p) => p !== path);
        if (activeTab === path) {
          const idx = prev.indexOf(path);
          const newActive = filtered[Math.max(0, idx - 1)] ?? null;
          setActiveTab(newActive);
        }
        return filtered;
      });
    },
    [activeTab],
  );

  /** Switch to a tab that is already open. */
  const selectTab = useCallback((path: string) => {
    setActiveTab(path);
  }, []);

  // ── Content change ─────────────────────────────────────────────────────────

  const handleContentChange = useCallback(
    (content: string | undefined) => {
      if (content === undefined || !activeTab) return;
      setFiles((prev) =>
        prev.map((f) => (f.path === activeTab ? { ...f, content } : f)),
      );
    },
    [activeTab],
  );

  // ── Clipboard ──────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!currentFile) return;
    await navigator.clipboard.writeText(currentFile.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [currentFile]);

  // ── Format ─────────────────────────────────────────────────────────────────

  const handleFormat = useCallback(() => {
    if (!isEditing) return;
    setFormatTrigger((n) => n + 1);
  }, [isEditing]);

  // ── Monaco path + language helpers ────────────────────────────────────────

  const getEditorPath = useCallback((file: CodeFile): string => {
    const ext = getMonacoFileExtension(file.language);
    if (ext) {
      const base = file.path.replace(/\.[^.]+$/, "");
      return `${base}${ext}`;
    }
    return file.path;
  }, []);

  return {
    // File data
    files,
    setFiles,
    currentFile,

    // Tab state
    openTabs,
    activeTab,
    openFile,
    closeTab,
    selectTab,

    // Editor settings
    isEditing,
    setIsEditing,
    showWrapLines,
    setShowWrapLines,
    minimapEnabled,
    setMinimapEnabled,
    lineNumbers,
    setLineNumbers,
    formatTrigger,
    isCopied,

    // Callbacks
    handleContentChange,
    handleCopy,
    handleFormat,

    // Monaco helpers
    getEditorPath,
    mapLanguageForMonaco,

    // Height ref for Monaco
    editorWrapperRef,
    editorHeight,
  };
}
