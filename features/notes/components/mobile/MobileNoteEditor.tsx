'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Copy,
  Share2,
  Trash2,
  Download,
  FolderOpen,
  Tag as TagIcon,
  MoreHorizontal,
  Save,
  Loader2,
  Check,
} from 'lucide-react';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import MobileNoteToolbar from './MobileNoteToolbar';
import { useToastManager } from '@/hooks/useToastManager';
import type { Note } from '@/features/notes/types';

interface MobileNoteEditorProps {
  note: Note;
  onBack: () => void;
}

export default function MobileNoteEditor({ note, onBack }: MobileNoteEditorProps) {
  const { updateNote, deleteNote, copyNote, refreshNotes } = useNotesContext();

  const toast = useToastManager('notes');
  const [localLabel, setLocalLabel] = useState(note.label || '');
  const [localContent, setLocalContent] = useState(note.content || '');
  const [localFolder, setLocalFolder] = useState(note.folder_name || 'Draft');
  const [localTags, setLocalTags] = useState<string[]>(note.tags || []);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync state when note changes
  useEffect(() => {
    setLocalLabel(note.label || '');
    setLocalContent(note.content || '');
    setLocalFolder(note.folder_name || 'Draft');
    setLocalTags(note.tags || []);
    setIsDirty(false);
  }, [note.id]);

  // Track dirty state
  useEffect(() => {
    const hasChanges =
      localLabel !== (note.label || '') ||
      localContent !== (note.content || '') ||
      localFolder !== (note.folder_name || 'Draft') ||
      JSON.stringify(localTags) !== JSON.stringify(note.tags || []);
    setIsDirty(hasChanges);
  }, [localLabel, localContent, localFolder, localTags, note]);

  // Auto-grow textarea
  const growTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    growTextarea();
  }, [localContent, growTextarea]);

  // Auto-save after 2s of no typing
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!isDirty || isSaving) return;
      setIsSaving(true);
      try {
        await updateNote(note.id, {
          label: localLabel.trim() || 'Untitled Note',
          content: localContent,
          folder_name: localFolder,
          tags: localTags,
        });
        setIsDirty(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      } catch {
        // silent — user can manually save
      } finally {
        setIsSaving(false);
      }
    }, 2000);
  }, [isDirty, isSaving, note.id, localLabel, localContent, localFolder, localTags, updateNote]);

  useEffect(() => {
    if (isDirty) scheduleAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, scheduleAutoSave]);

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setIsSaving(true);
    try {
      await updateNote(note.id, {
        label: localLabel.trim() || 'Untitled Note',
        content: localContent,
        folder_name: localFolder,
        tags: localTags,
      });
      await refreshNotes();
      setIsDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteNote(note.id);
      toast.success('Note deleted');
      onBack();
    } catch {
      toast.error('Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await copyNote(note.id);
      toast.success('Note copied');
    } catch {
      toast.error('Failed to copy note');
    }
  };

  const handleExport = () => {
    const blob = new Blob([localContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localLabel || 'note'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Note exported');
  };

  const displayLabel = localLabel || 'Untitled Note';

  return (
    <>
      {/* Scrollable page */}
      <div className="min-h-dvh bg-background flex flex-col">
        {/* Inline mini-header for back + title + actions */}
        <div className="sticky top-0 z-20 flex items-center gap-2 px-3 py-2 bg-background/90 backdrop-blur-md border-b border-border/30">
          <button
            onClick={onBack}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors text-foreground"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Title — small, centered, editable inline */}
          <div className="flex-1 min-w-0 text-center">
            <input
              type="text"
              value={localLabel}
              onChange={e => setLocalLabel(e.target.value)}
              placeholder="Untitled Note"
              className="w-full bg-transparent text-xs font-medium text-foreground text-center outline-none border-none placeholder:text-muted-foreground"
              style={{ fontSize: '13px' }}
            />
          </div>

          {/* Save indicator + overflow menu */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {isSaving && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            {justSaved && !isSaving && <Check size={14} className="text-green-500" />}
            {isDirty && !isSaving && (
              <button
                onClick={handleSave}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors text-primary"
                aria-label="Save"
              >
                <Save size={15} />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors text-foreground">
                  <MoreHorizontal size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy size={15} className="mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Share coming soon')}>
                  <Share2 size={15} className="mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download size={15} className="mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  {isDeleting ? (
                    <><Loader2 size={15} className="mr-2 animate-spin" />Deleting...</>
                  ) : (
                    <><Trash2 size={15} className="mr-2" />Delete Note</>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 px-4 pt-4 pb-32">
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={e => {
              setLocalContent(e.target.value);
              growTextarea();
            }}
            placeholder="Start writing..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none border-none resize-none text-base leading-relaxed"
            style={{ fontSize: '16px', minHeight: 'calc(100dvh - 180px)' }}
          />
        </div>

        {/* Bottom safe area spacer */}
        <div className="h-safe" />
      </div>

      {/* Floating glass toolbar — pinned above keyboard safe area */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-safe pointer-events-none z-30">
        <div className="pointer-events-auto mb-4 flex items-center gap-1 bg-background/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl px-3 py-2">
          {/* Folder chip */}
          <button
            onClick={() => setShowToolbar(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <FolderOpen size={15} />
            <span className="text-xs font-medium max-w-[80px] truncate">{localFolder}</span>
          </button>

          <div className="w-px h-4 bg-border/60" />

          {/* Tags chip */}
          <button
            onClick={() => setShowToolbar(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <TagIcon size={15} />
            <span className="text-xs font-medium">
              {localTags.length > 0 ? `${localTags.length} tag${localTags.length !== 1 ? 's' : ''}` : 'Tags'}
            </span>
          </button>

          <div className="w-px h-4 bg-border/60" />

          {/* More / share */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-44 mb-1">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy size={14} className="mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Share coming soon')}>
                <Share2 size={14} className="mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download size={14} className="mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Folder + Tags Sheet */}
      <Sheet open={showToolbar} onOpenChange={setShowToolbar}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Note Settings</SheetTitle>
            <SheetDescription>Edit folder and tags</SheetDescription>
          </SheetHeader>
          <MobileNoteToolbar
            folder={localFolder}
            tags={localTags}
            onFolderChange={f => { setLocalFolder(f); }}
            onTagsChange={t => { setLocalTags(t); }}
            onClose={() => setShowToolbar(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
