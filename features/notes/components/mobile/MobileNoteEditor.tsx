'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import { NoteEditorDock } from './NoteEditorDock';
import { useToastManager } from '@/hooks/useToastManager';
import MarkdownStream from '@/components/MarkdownStream';
import type { Note } from '@/features/notes/types';

export type MobileEditorMode = 'plain' | 'wysiwyg' | 'preview';

// Heavy TUI editor — only loaded when needed
const TuiEditorContent = dynamic(
  () => import('@/components/mardown-display/chat-markdown/tui/TuiEditorContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface MobileNoteEditorProps {
  note: Note;
  editorMode: MobileEditorMode;
  onBack: () => void;
}

export default function MobileNoteEditor({ note, editorMode, onBack }: MobileNoteEditorProps) {
  const { updateNote, deleteNote, copyNote, refreshNotes } = useNotesContext();
  const toast = useToastManager('notes');

  const [localLabel, setLocalLabel] = useState(note.label || '');
  const [localContent, setLocalContent] = useState(note.content || '');
  const [localFolder, setLocalFolder] = useState(note.folder_name || 'Draft');
  const [localTags, setLocalTags] = useState<string[]>(note.tags || []);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tuiRef = useRef<any>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync when note switches
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

  // Auto-grow plain textarea
  const growTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (editorMode === 'plain') growTextarea();
  }, [localContent, editorMode, growTextarea]);

  // Auto-save 2s after last change
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
      } catch {
        // silent — user can see save button
      } finally {
        setIsSaving(false);
      }
    }, 2000);
  }, [isDirty, isSaving, note.id, localLabel, localContent, localFolder, localTags, updateNote]);

  useEffect(() => {
    if (isDirty) scheduleAutoSave();
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [isDirty, scheduleAutoSave]);

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setIsSaving(true);
    try {
      // Capture latest TUI content if in rich mode
      let content = localContent;
      if ((editorMode === 'wysiwyg') && tuiRef.current?.getCurrentMarkdown) {
        content = tuiRef.current.getCurrentMarkdown();
        setLocalContent(content);
      }
      await updateNote(note.id, {
        label: localLabel.trim() || 'Untitled Note',
        content,
        folder_name: localFolder,
        tags: localTags,
      });
      await refreshNotes();
      setIsDirty(false);
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // Expose save state and handler to parent (MobileNotesView injects into header)
  // We use a module-level ref pattern so the parent can read current values
  useEffect(() => {
    (window as any).__mobileNoteEditorState = { isDirty, isSaving, handleSave };
    return () => { delete (window as any).__mobileNoteEditorState; };
  });

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
      toast.success('Note duplicated');
    } catch {
      toast.error('Failed to duplicate note');
    }
  };

  const handleExport = () => {
    const content = (editorMode === 'wysiwyg' && tuiRef.current?.getCurrentMarkdown)
      ? tuiRef.current.getCurrentMarkdown()
      : localContent;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localLabel || 'note'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    // This div is the scroll root — the parent container (in MobileNotesView) has overflow-y-auto
    <div className="min-h-full bg-background flex flex-col">
      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-4 pb-32">

        {/* Plain text */}
        {editorMode === 'plain' && (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={e => { setLocalContent(e.target.value); growTextarea(); }}
            placeholder="Start writing..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none border-none resize-none leading-relaxed"
            style={{ fontSize: '16px', minHeight: 'calc(100dvh - 200px)' }}
          />
        )}

        {/* Rich (WYSIWYG) */}
        {editorMode === 'wysiwyg' && (
          <div className="min-h-[calc(100dvh-200px)]">
            <TuiEditorContent
              ref={tuiRef}
              content={localContent}
              onChange={(val: string) => setLocalContent(val)}
              isActive={true}
              editMode="wysiwyg"
              className="w-full"
            />
          </div>
        )}

        {/* Preview */}
        {editorMode === 'preview' && (
          <div className="min-h-[calc(100dvh-200px)] prose prose-sm dark:prose-invert max-w-none">
            {localContent.trim() ? (
              <MarkdownStream content={localContent} />
            ) : (
              <p className="text-muted-foreground text-sm">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Fixed bottom dock ────────────────────────────────────────────────── */}
      <NoteEditorDock
        folder={localFolder}
        tags={localTags}
        onFolderChange={setLocalFolder}
        onTagsChange={setLocalTags}
        onCopy={handleCopy}
        onExport={handleExport}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
