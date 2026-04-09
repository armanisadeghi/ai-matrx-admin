"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save,
  FolderOpen,
  Trash2,
  Clock,
  Archive,
  RotateCcw,
} from "lucide-react";
import type { MarkdownSnippet } from "./useMarkdownSnippets";

interface SnippetManagerProps {
  snippets: MarkdownSnippet[];
  isLoading: boolean;
  hasContent: boolean;
  onSave: (name: string) => Promise<void>;
  onLoad: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onLoadAutosave: () => void;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function truncatePreview(content: string, maxLen = 80): string {
  const oneLine = content.replace(/\n/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen) + "...";
}

export const SnippetManager: React.FC<SnippetManagerProps> = ({
  snippets,
  isLoading,
  hasContent,
  onSave,
  onLoad,
  onDelete,
  onLoadAutosave,
}) => {
  const [open, setOpen] = useState(false);
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MarkdownSnippet | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saveMode) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [saveMode]);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setIsSaving(true);
    await onSave(saveName);
    setIsSaving(false);
    setSaveName("");
    setSaveMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setSaveMode(false);
      setSaveName("");
    }
  };

  const handleLoad = (id: string) => {
    onLoad(id);
    setOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSaveMode(false);
            setSaveName("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
            <Archive className="h-3.5 w-3.5 mr-1.5" />
            Snippets
            {snippets.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-4 px-1 text-[10px]"
              >
                {snippets.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 pb-2 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium">Saved Snippets</h4>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                Local only
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Stored in your browser. Clearing site data will remove them.
            </p>
          </div>

          {saveMode ? (
            <div className="p-3 border-b border-border flex gap-2">
              <Input
                ref={inputRef}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Snippet name..."
                className="h-7 text-xs"
                style={{ fontSize: "16px" }}
              />
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs shrink-0"
                onClick={handleSave}
                disabled={!saveName.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs shrink-0"
                onClick={() => {
                  setSaveMode(false);
                  setSaveName("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="p-2 border-b border-border flex gap-1.5">
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs flex-1"
                onClick={() => setSaveMode(true)}
                disabled={!hasContent}
              >
                <Save className="h-3 w-3 mr-1.5" />
                Save Current
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={() => {
                  onLoadAutosave();
                  setOpen(false);
                }}
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Restore Last
              </Button>
            </div>
          )}

          <ScrollArea className="max-h-64">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Loading...
              </div>
            ) : snippets.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No saved snippets yet. Save your current content to get started.
              </div>
            ) : (
              <div className="p-1">
                {snippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="group flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                    onClick={() => handleLoad(snippet.id)}
                  >
                    <FolderOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {snippet.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(snippet.updatedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {truncatePreview(snippet.content)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(snippet);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete snippet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
