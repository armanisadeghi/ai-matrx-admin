'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  MoreVertical,
  FolderOpen,
  Tag as TagIcon,
  Save,
  Loader2,
  Copy,
  Share2,
  Trash2,
  Download,
} from 'lucide-react';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import MobileNoteToolbar from './MobileNoteToolbar';
import { useToastManager } from '@/hooks/useToastManager';
import type { Note } from '@/features/notes/types';

interface MobileNoteEditorProps {
  note: Note;
  onBack: () => void;
}

export default function MobileNoteEditor({ note, onBack }: MobileNoteEditorProps) {
  const {
    updateNote,
    deleteNote,
    copyNote,
    refreshNotes,
  } = useNotesContext();

  const toast = useToastManager('notes');
  const [localLabel, setLocalLabel] = useState(note.label || '');
  const [localContent, setLocalContent] = useState(note.content || '');
  const [localFolder, setLocalFolder] = useState(note.folder_name || 'Draft');
  const [localTags, setLocalTags] = useState<string[]>(note.tags || []);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when note changes
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
      localLabel !== note.label ||
      localContent !== note.content ||
      localFolder !== note.folder_name ||
      JSON.stringify(localTags) !== JSON.stringify(note.tags || []);
    setIsDirty(hasChanges);
  }, [localLabel, localContent, localFolder, localTags, note]);

  const handleSave = async () => {
    if (!isDirty || isSaving) return;

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
      toast.success('Note saved');
    } catch (error) {
      console.error('Error saving note:', error);
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
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await copyNote(note.id);
      toast.success('Note copied');
    } catch (error) {
      console.error('Error copying note:', error);
      toast.error('Failed to copy note');
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    toast.info('Share functionality coming soon');
  };

  const handleExport = () => {
    // Export as markdown
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

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-3 py-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 h-7 w-7 rounded-full">
            <ChevronLeft size={18} />
          </Button>

          <div className="flex-1 px-2 min-w-0">
            <Input
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              placeholder="Note title..."
              className="text-base font-medium border-none shadow-none focus-visible:ring-0 px-2 text-center"
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-7 w-7 rounded-full">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isDirty && (
                <>
                  <DropdownMenuItem onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Save
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleCopy}>
                <Copy size={16} className="mr-2" />
                Copy Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 size={16} className="mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download size={16} className="mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
        <div className="p-3 pb-[50vh]">
          <Textarea
            ref={contentRef}
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            placeholder="Start writing..."
            className="min-h-[calc(100vh-16rem)] border-none shadow-none focus-visible:ring-0 resize-none text-base p-0"
            onFocus={(e) => {
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
            }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 border-t border-border bg-card">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setShowToolbar(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FolderOpen size={16} />
            <span>{localFolder}</span>
          </button>

          <button
            onClick={() => setShowToolbar(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <TagIcon size={16} />
            <span>{localTags.length > 0 ? `${localTags.length} tags` : 'Add tags'}</span>
          </button>
        </div>
      </div>

      {/* Save Button (Sticky at bottom if dirty) */}
      {isDirty && (
        <div className="flex-shrink-0 border-t border-border bg-card px-3 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
            {isSaving ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Toolbar Sheet */}
      <Sheet open={showToolbar} onOpenChange={setShowToolbar}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Note Settings</SheetTitle>
            <SheetDescription>Edit folder and tags</SheetDescription>
          </SheetHeader>
          <MobileNoteToolbar
            folder={localFolder}
            tags={localTags}
            onFolderChange={setLocalFolder}
            onTagsChange={setLocalTags}
            onClose={() => setShowToolbar(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

