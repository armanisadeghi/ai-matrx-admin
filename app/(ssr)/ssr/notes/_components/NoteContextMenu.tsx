"use client";

import { useState } from "react";
import {
  Save,
  Copy,
  Download,
  Link2,
  Share2,
  FolderInput,
  Sparkles,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const NoteAiMenu = dynamic(() => import("./NoteAiMenu"), {
  ssr: false,
  loading: () => null,
});

interface NoteContextMenuProps {
  x: number;
  y: number;
  noteId: string;
  type: "tab" | "editor";
  isDirty: boolean;
  allFolders: string[];
  currentFolder: string | undefined;
  noteContent: string;
  selectedText: string;
  onSave: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onShareLink: () => void;
  onShareClipboard: () => void;
  onMove: (folder: string) => void;
  onAiResult: (result: string, action: "replace" | "insert") => void;
  onCloseTab: () => void;
  onCloseOtherTabs: () => void;
  onCloseAllTabs: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NoteContextMenu({
  x,
  y,
  noteId,
  isDirty,
  allFolders,
  currentFolder,
  noteContent,
  selectedText,
  onSave,
  onDuplicate,
  onExport,
  onShareLink,
  onShareClipboard,
  onMove,
  onAiResult,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onDelete,
  onClose,
}: NoteContextMenuProps) {
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);

  const itemClass =
    "flex items-center gap-2 w-full py-1.5 px-2.5 text-xs text-muted-foreground bg-transparent border-none rounded-md cursor-pointer text-left transition-colors hover:bg-accent hover:text-foreground [&_svg]:w-[0.8125rem] [&_svg]:h-[0.8125rem] [&_svg]:shrink-0";

  return (
    <div
      className="fixed z-100 min-w-[200px] p-1 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-lg shadow-lg"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {isDirty && (
        <button className={itemClass} onClick={() => { onSave(); onClose(); }}>
          <Save /> Save
        </button>
      )}
      <button className={itemClass} onClick={() => { onDuplicate(); onClose(); }}>
        <Copy /> Duplicate
      </button>
      <button className={itemClass} onClick={() => { onExport(); onClose(); }}>
        <Download /> Export as Markdown
      </button>
      <button className={itemClass} onClick={() => { onShareLink(); onClose(); }}>
        <Link2 /> Share Link
      </button>
      <button className={itemClass} onClick={() => { onShareClipboard(); onClose(); }}>
        <Share2 /> Copy to Clipboard
      </button>

      <div className="h-px my-1 mx-1.5 bg-border" />

      <button
        className={cn(itemClass, "justify-between")}
        onClick={(e) => { e.stopPropagation(); setShowFolderSubmenu((v) => !v); }}
      >
        <span className="flex items-center gap-2"><FolderInput /> Move to folder</span>
        <ChevronRight className={cn("w-3! h-3! transition-transform", showFolderSubmenu && "rotate-90")} />
      </button>
      {showFolderSubmenu && (
        <div className="ml-3 max-h-[200px] overflow-y-auto notes-scrollable">
          {allFolders.map((folder) => {
            const isCurrent = currentFolder === folder;
            return (
              <button
                key={folder}
                className={cn(itemClass, isCurrent && "text-amber-600 dark:text-amber-400 bg-amber-500/5")}
                onClick={() => { onMove(folder); onClose(); }}
                disabled={isCurrent}
              >
                <FolderInput />
                {folder}
                {isCurrent && <span className="ml-auto text-[0.625rem] opacity-50">current</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="h-px my-1 mx-1.5 bg-border" />

      <button
        className={cn(itemClass, "[&_svg]:text-purple-500")}
        onClick={(e) => { e.stopPropagation(); setShowAiMenu((v) => !v); }}
      >
        <Sparkles /> AI Actions
      </button>
      {showAiMenu && (
        <NoteAiMenu
          noteId={noteId}
          noteContent={noteContent}
          selectedText={selectedText || undefined}
          onResult={onAiResult}
          onClose={onClose}
        />
      )}

      <div className="h-px my-1 mx-1.5 bg-border" />
      <button className={itemClass} onClick={() => { onCloseTab(); onClose(); }}>
        <X /> Close Tab
      </button>
      <button className={itemClass} onClick={() => { onCloseOtherTabs(); onClose(); }}>
        <X /> Close Other Tabs
      </button>
      <button className={itemClass} onClick={() => { onCloseAllTabs(); onClose(); }}>
        <X /> Close All Tabs
      </button>
      <div className="h-px my-1 mx-1.5 bg-border" />
      <button
        className={cn(itemClass, "text-destructive hover:bg-destructive/10 hover:text-destructive")}
        onClick={() => { onDelete(); onClose(); }}
      >
        <Trash2 /> Delete Note
      </button>
    </div>
  );
}
