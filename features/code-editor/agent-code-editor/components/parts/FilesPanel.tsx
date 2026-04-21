"use client";

/**
 * FilesPanel — the rightmost column (multi-file only).
 *
 * Lists every file the caller provided. Clicking a row sets that file as
 * active. The active file's contents drive the `code` column and the
 * `current_code`/`dynamic_context` variable on the active conversation.
 * The OTHER files are emitted as `file_<id>` context slots so the agent can
 * `ctx_get` them.
 *
 * This panel is just a file picker — it doesn't own file data or the active
 * id. `SmartCodeEditor` owns those via `files` + `activeFileId` + callbacks.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { FileCode } from "lucide-react";
import type { CodeEditorFile } from "../../types";

interface FilesPanelProps {
  files: CodeEditorFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  title?: string;
}

export function FilesPanel({
  files,
  activeFileId,
  onSelectFile,
  title = "Files",
}: FilesPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-background border-l border-border">
      <div className="shrink-0 px-3 py-1.5 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {files.length === 0 && (
          <div className="px-3 pt-4 text-center">
            <p className="text-[10px] text-muted-foreground">No files.</p>
          </div>
        )}

        {files.map((f) => {
          const isActive = f.id === activeFileId;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFile(f.id)}
              className={cn(
                "w-full px-3 py-2 text-left flex items-start gap-2 border-b border-border/50 transition-colors",
                isActive ? "bg-primary/10" : "hover:bg-muted/50",
              )}
            >
              <FileCode
                className={cn(
                  "w-3 h-3 mt-0.5 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs font-medium truncate",
                    isActive && "text-primary",
                  )}
                >
                  {f.title}
                </p>
                {f.description && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {f.description}
                  </p>
                )}
                {f.language && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {f.language}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
