"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  AlertTriangle,
  Sparkles,
  FileText,
  Eye,
  Columns2,
  ExternalLink,
  ArrowRight,
  LayoutPanelLeft,
  Check,
  Scissors,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/ButtonMine";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { cn } from "@/lib/utils";
import {
  NoteEditorCore,
  type EditorMode,
} from "@/features/notes/components/NoteEditorCore";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import type { Note } from "@/features/notes/types";
import { useQuickNoteSave } from "./useQuickNoteSave";

export type PostSaveAction = "newTab" | "navigate" | "openWindow" | "none";

export interface QuickNoteSaveCoreProps {
  initialContent: string;
  defaultFolder?: string;
  /** Compact footprint (popover): hide trim chrome by default, smaller gaps. */
  compact?: boolean;
  /** Show post-save action row once a note is saved. Default true. */
  showPostSaveActions?: boolean;
  /** Initial editor mode (default "plain"). */
  initialEditorMode?: EditorMode;
  onSaved?: (note: Note, action: PostSaveAction) => void;
  onCancel?: () => void;
  className?: string;
  /** Custom Save label override. */
  saveLabel?: string;
}

const EDITOR_MODES: Array<{ value: EditorMode; label: string; icon: React.ElementType }> = [
  { value: "plain", label: "Edit", icon: FileText },
  { value: "preview", label: "Preview", icon: Eye },
  { value: "split", label: "Split", icon: Columns2 },
];

export function QuickNoteSaveCore({
  initialContent,
  defaultFolder = "Scratch",
  compact = false,
  showPostSaveActions = true,
  initialEditorMode = "plain",
  onSaved,
  onCancel,
  className,
  saveLabel,
}: QuickNoteSaveCoreProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const {
    workingContent,
    setEditedContent,
    stripThinkingEnabled,
    setStripThinkingEnabled,
    canStripThinking,
    trimStart,
    setTrimStart,
    trimEnd,
    setTrimEnd,
    maxTrim,
    noteName,
    setNoteName,
    folder,
    setFolder,
    mode,
    setMode,
    selectedNoteId,
    setSelectedNoteId,
    updateMethod,
    setUpdateMethod,
    selectedNote,
    allFolders,
    notesInFolder,
    isSaving,
    isSaveDisabled,
    savedNote,
    save,
  } = useQuickNoteSave({ initialContent, defaultFolder });

  const [editorMode, setEditorMode] = useState<EditorMode>(initialEditorMode);
  const [showTrimControls, setShowTrimControls] = useState(!compact);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToStart = useCallback(() => {
    if (textareaRef.current) textareaRef.current.scrollTop = 0;
  }, []);

  const scrollToEnd = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, []);

  const handleSaveClick = useCallback(async () => {
    if (mode === "update" && updateMethod === "overwrite" && selectedNoteId) {
      setShowOverwriteWarning(true);
      return;
    }
    await save();
  }, [mode, updateMethod, selectedNoteId, save]);

  const handleOverwriteConfirm = useCallback(async () => {
    setShowOverwriteWarning(false);
    await save();
  }, [save]);

  const handlePostSaveAction = useCallback(
    (action: PostSaveAction) => {
      if (!savedNote) return;
      if (action === "newTab") {
        window.open(`/notes/${savedNote.id}`, "_blank", "noopener,noreferrer");
      } else if (action === "navigate") {
        router.push(`/notes/${savedNote.id}`);
      } else if (action === "openWindow") {
        dispatch(
          openOverlay({
            overlayId: "notesWindow",
            data: {
              openTabs: [savedNote.id],
              activeTabId: savedNote.id,
            },
          }),
        );
      }
      onSaved?.(savedNote, action);
    },
    [savedNote, router, dispatch, onSaved],
  );

  const rawLen = initialContent.length;
  const charCount = workingContent.length;
  const showTrimRow = showTrimControls && maxTrim > 200;

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 h-full gap-2",
        compact ? "gap-1.5" : "gap-2",
        className,
      )}
    >
      {/* Top trim slider */}
      {showTrimRow && (
        <TrimRow
          label="Trim start"
          max={Math.max(0, maxTrim - trimEnd)}
          value={trimStart}
          onChange={(v) => {
            setTrimStart(v);
            scrollToStart();
          }}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        <Tabs
          value={editorMode}
          onValueChange={(v) => setEditorMode(v as EditorMode)}
        >
          <TabsList className="h-8">
            {EDITOR_MODES.map((m) => {
              const Icon = m.icon;
              return (
                <TabsTrigger
                  key={m.value}
                  value={m.value}
                  className="h-7 px-2 text-xs gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {canStripThinking && (
          <Button
            type="button"
            variant={stripThinkingEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setStripThinkingEnabled((v) => !v)}
            className="h-8 text-xs gap-1.5"
            title="Remove <thinking> and <reasoning> blocks"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {stripThinkingEnabled ? "Thinking removed" : "Remove thinking"}
            </span>
          </Button>
        )}

        {maxTrim > 200 && (
          <Button
            type="button"
            variant={showTrimControls ? "default" : "outline"}
            size="sm"
            onClick={() => setShowTrimControls((v) => !v)}
            className="h-8 text-xs gap-1.5"
            title="Show trim sliders"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Trim</span>
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-mono">
            {charCount.toLocaleString()} chars
            {charCount !== rawLen && (
              <span className="ml-1 text-muted-foreground">
                / {rawLen.toLocaleString()}
              </span>
            )}
          </Badge>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 flex flex-col border border-border rounded-md overflow-hidden bg-background">
        <NoteEditorCore
          content={workingContent}
          onChange={setEditedContent}
          onChangeFlush={setEditedContent}
          editorMode={editorMode}
          textareaRef={textareaRef}
          placeholder="Enter your note content..."
          className="flex-1 min-h-0"
          resetKey={`${stripThinkingEnabled}:${trimStart}:${trimEnd}`}
        />
      </div>

      {/* Bottom trim slider */}
      {showTrimRow && (
        <TrimRow
          label="Trim end"
          max={Math.max(0, maxTrim - trimStart)}
          value={trimEnd}
          onChange={(v) => {
            setTrimEnd(v);
            scrollToEnd();
          }}
        />
      )}

      {/* Target row (hidden once saved) */}
      {!savedNote && (
        <div className="shrink-0 flex flex-col gap-2">
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "create" | "update")}
          >
            <TabsList className="grid grid-cols-2 w-full sm:w-64 h-8">
              <TabsTrigger value="create" className="h-7 text-xs">
                New Note
              </TabsTrigger>
              <TabsTrigger value="update" className="h-7 text-xs">
                Existing Note
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div
            className={cn(
              "grid gap-2",
              compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
            )}
          >
            <div className="grid gap-1">
              <Label htmlFor="qns-folder" className="text-xs">
                Folder
              </Label>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger id="qns-folder" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allFolders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === "create" ? (
              <div className="grid gap-1">
                <Label htmlFor="qns-name" className="text-xs">
                  Note Name
                </Label>
                <Input
                  id="qns-name"
                  value={noteName}
                  onChange={(e) => setNoteName(e.target.value)}
                  placeholder="Note name..."
                  className="h-8 text-xs"
                  style={{ fontSize: "16px" }}
                />
              </div>
            ) : (
              <div className="grid gap-1">
                <Label htmlFor="qns-select" className="text-xs">
                  Note
                </Label>
                <Select
                  value={selectedNoteId}
                  onValueChange={setSelectedNoteId}
                >
                  <SelectTrigger id="qns-select" className="h-8 text-xs">
                    <SelectValue placeholder="Choose a note…" />
                  </SelectTrigger>
                  <SelectContent>
                    {notesInFolder.length > 0 ? (
                      notesInFolder.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.label}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none" disabled>
                        No notes in this folder
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {mode === "update" && selectedNoteId && (
            <div className="grid gap-1">
              <Label className="text-xs">Update Method</Label>
              <RadioGroup
                value={updateMethod}
                onValueChange={(v) => setUpdateMethod(v as "append" | "overwrite")}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="append" id="qns-append" />
                  <Label
                    htmlFor="qns-append"
                    className="cursor-pointer font-normal text-xs"
                  >
                    Append
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="overwrite" id="qns-overwrite" />
                  <Label
                    htmlFor="qns-overwrite"
                    className="cursor-pointer font-normal text-xs flex items-center gap-1.5"
                  >
                    Overwrite
                    {updateMethod === "overwrite" && (
                      <Badge variant="destructive" className="text-[10px] h-4">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Warning
                      </Badge>
                    )}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end gap-2 pt-1 pb-safe">
        {savedNote && showPostSaveActions ? (
          <>
            <Badge variant="outline" className="mr-auto text-xs gap-1">
              <Check className="h-3 w-3 text-green-600" />
              Saved
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePostSaveAction("newTab")}
              className="h-8 text-xs gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New tab</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePostSaveAction("openWindow")}
              className="h-8 text-xs gap-1.5"
            >
              <LayoutPanelLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Window</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePostSaveAction("navigate")}
              className="h-8 text-xs gap-1.5"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Go to note</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handlePostSaveAction("none")}
              className="h-8 text-xs"
            >
              Done
            </Button>
          </>
        ) : (
          <>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
                className="h-8 text-xs gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSaveClick}
              disabled={isSaveDisabled}
              className="h-8 text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving
                ? "Saving…"
                : saveLabel ??
                  (mode === "create" ? "Save Note" : "Update Note")}
            </Button>
          </>
        )}
      </div>

      {/* Overwrite confirm */}
      <AlertDialog
        open={showOverwriteWarning}
        onOpenChange={setShowOverwriteWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Overwrite
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to replace the content of{" "}
              <strong>{selectedNote?.label}</strong>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleOverwriteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TrimRowProps {
  label: string;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

function TrimRow({ label, max, value, onChange }: TrimRowProps) {
  const safeMax = Math.max(0, max);
  const clamped = Math.min(value, safeMax);
  return (
    <div className="flex items-center gap-2 shrink-0 px-0.5">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground w-16 shrink-0">
        {label}
      </Label>
      <Slider
        min={0}
        max={safeMax}
        step={1}
        value={[clamped]}
        onValueChange={(vals) => onChange(vals[0] ?? 0)}
        className="flex-1 touch-none"
        disabled={safeMax === 0}
      />
      <Input
        type="number"
        min={0}
        max={safeMax}
        value={clamped}
        onChange={(e) => {
          const n = Number(e.target.value) || 0;
          onChange(Math.max(0, Math.min(n, safeMax)));
        }}
        className="h-7 w-20 text-xs"
        style={{ fontSize: "16px" }}
      />
    </div>
  );
}
