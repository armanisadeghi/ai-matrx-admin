'use client';

import React from 'react';
import { ChevronRight, FolderOpen, Layers } from 'lucide-react';
import type { Note } from '@/features/notes/types';

interface MobileFolderSelectorProps {
  folders: string[];
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
  notesByFolder: Record<string, Note[]>;
}

export default function MobileFolderSelector({
  folders,
  selectedFolder,
  onSelectFolder,
  notesByFolder,
}: MobileFolderSelectorProps) {
  const getNoteCount = (folder: string) => {
    if (folder === 'All Notes') {
      return Object.values(notesByFolder).reduce((sum, notes) => sum + notes.length, 0);
    }
    return notesByFolder[folder]?.length || 0;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Select Folder</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a folder to view its notes
        </p>
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="divide-y divide-border">
          {folders.map((folder) => {
            const noteCount = getNoteCount(folder);
            const isSelected = selectedFolder === folder;

            return (
              <button
                key={folder}
                onClick={() => onSelectFolder(folder)}
                className={`w-full flex items-center gap-3 p-4 text-left active:bg-muted/50 transition-colors ${
                  isSelected ? 'bg-primary/10' : ''
                }`}
              >
                {folder === 'All Notes' ? (
                  <Layers size={20} className="text-primary flex-shrink-0" />
                ) : (
                  <FolderOpen size={20} className="text-primary flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-foreground truncate">
                    {folder}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                  </p>
                </div>
                {isSelected && (
                  <ChevronRight size={20} className="text-primary flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

