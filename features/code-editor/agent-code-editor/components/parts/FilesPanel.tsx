"use client";

/**
 * FilesPanel — the rightmost column (multi-file only).
 *
 * Thin wrapper around the shared `CodeSidebar` so we use the exact same
 * EXPLORER header + language-icon file rows as the rest of the code-editor
 * family (CodeEditorWindow, MultiFileSmartCodeEditorWindow, etc.).
 */

import React from "react";
import CodeSidebar from "@/features/code-editor/multi-file-core/CodeSidebar";
import type { CodeFile } from "@/features/code-editor/multi-file-core/types";

interface FilesPanelProps {
  files: CodeFile[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
}

export function FilesPanel({
  files,
  activeFilePath,
  onSelectFile,
}: FilesPanelProps) {
  return (
    <CodeSidebar
      files={files}
      activeFile={activeFilePath ?? ""}
      handleFileSelect={onSelectFile}
      className="border-r-0 w-full"
    />
  );
}
