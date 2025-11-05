'use client';

import React from 'react';
import {
  MoreVertical,
  FolderPlus,
  SortAsc,
  SortDesc,
  Clock,
  Type,
  RefreshCw,
} from 'lucide-react';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useToastManager } from '@/hooks/useToastManager';

export default function MobileActionsMenu() {
  const { refreshNotes, findOrCreateEmptyNote } = useNotesContext();
  const toast = useToastManager('notes');

  const handleCreateFolder = async () => {
    // For now, just prompt with a simple alert-style approach
    // In a real app, you'd want a proper modal/dialog
    const folderName = prompt('Enter folder name:');
    if (folderName?.trim()) {
      try {
        await findOrCreateEmptyNote(folderName.trim());
        toast.success(`Folder "${folderName}" created`);
      } catch (error) {
        console.error('Error creating folder:', error);
        toast.error('Failed to create folder');
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshNotes();
      toast.success('Notes refreshed');
    } catch (error) {
      console.error('Error refreshing notes:', error);
      toast.error('Failed to refresh notes');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCreateFolder}>
          <FolderPlus size={18} className="mr-2" />
          New Folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRefresh}>
          <RefreshCw size={18} className="mr-2" />
          Refresh Notes
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
        <DropdownMenuItem>
          <Clock size={18} className="mr-2" />
          Recently Updated
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Type size={18} className="mr-2" />
          Title (A-Z)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

