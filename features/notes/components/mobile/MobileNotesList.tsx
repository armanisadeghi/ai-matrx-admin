'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, Plus, Search, X, FolderOpen, Clock, Tag } from 'lucide-react';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MobileFolderSelector from './MobileFolderSelector';
import MobileActionsMenu from './MobileActionsMenu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Note } from '@/features/notes/types';

interface MobileNotesListProps {
  onNoteSelect: (note: Note) => void;
}

export default function MobileNotesList({ onNoteSelect }: MobileNotesListProps) {
  const {
    notes,
    findOrCreateEmptyNote,
    isLoading,
  } = useNotesContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('All Notes');
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  // Group notes by folder
  const notesByFolder = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    
    notes.forEach(note => {
      const folder = note.folder_name || 'Draft';
      if (!grouped[folder]) {
        grouped[folder] = [];
      }
      grouped[folder].push(note);
    });

    // Sort notes within each folder by updated date
    Object.keys(grouped).forEach(folder => {
      grouped[folder].sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

    return grouped;
  }, [notes]);

  // Get all folder names
  const folderNames = useMemo(() => {
    return ['All Notes', ...Object.keys(notesByFolder).sort()];
  }, [notesByFolder]);

  // Filter notes based on search and folder
  const filteredNotes = useMemo(() => {
    // Deduplicate notes first
    const seenIds = new Set<string>();
    const uniqueNotes = notes.filter(note => {
      if (seenIds.has(note.id)) {
        return false;
      }
      seenIds.add(note.id);
      return true;
    });

    let result = uniqueNotes;

    // Filter by folder
    if (selectedFolder !== 'All Notes') {
      result = result.filter(note => note.folder_name === selectedFolder);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(note =>
        note.label.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort by updated date
    return result.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [notes, selectedFolder, searchQuery]);

  const handleCreateNote = async () => {
    try {
      const folder = selectedFolder === 'All Notes' ? 'Draft' : selectedFolder;
      const note = await findOrCreateEmptyNote(folder);
      if (note) {
        onNoteSelect(note);
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getPreviewText = (content: string) => {
    // Strip markdown and get first line
    const stripped = content.replace(/[#*_~`]/g, '').trim();
    const firstLine = stripped.split('\n')[0];
    return firstLine || 'No content';
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <h1 className="text-2xl font-bold text-foreground">Notes</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateNote}
              className="h-9 w-9"
            >
              <Plus size={20} />
            </Button>
            <MobileActionsMenu />
          </div>
        </div>

        {/* Folder Selector */}
        <div className="px-4 pb-1">
          <button
            onClick={() => setShowFolderSelector(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
          >
            <FolderOpen size={16} className="text-primary flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-foreground truncate">
              {selectedFolder}
            </span>
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-1">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="pl-9 pr-9 h-10 bg-muted/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Loading notes...</p>
            </div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'No notes found' : 'No notes yet. Create one above!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => onNoteSelect(note)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-foreground mb-1 truncate">
                    {note.label || 'Untitled Note'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {getPreviewText(note.content)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formatDate(note.updated_at)}</span>
                    </div>
                    {selectedFolder === 'All Notes' && note.folder_name && (
                      <div className="flex items-center gap-1">
                        <FolderOpen size={12} />
                        <span>{note.folder_name}</span>
                      </div>
                    )}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag size={12} />
                        <span>{note.tags.length}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Folder Selector Sheet */}
      <Sheet open={showFolderSelector} onOpenChange={setShowFolderSelector}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Select Folder</SheetTitle>
            <SheetDescription>Choose a folder to view its notes</SheetDescription>
          </SheetHeader>
          <MobileFolderSelector
            folders={folderNames}
            selectedFolder={selectedFolder}
            onSelectFolder={(folder) => {
              setSelectedFolder(folder);
              setShowFolderSelector(false);
            }}
            notesByFolder={notesByFolder}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

