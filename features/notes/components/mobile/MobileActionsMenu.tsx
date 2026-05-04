'use client';

import React, { useState } from 'react';
import {
  MoreVertical,
  FolderPlus,
  SortAsc,
  SortDesc,
  Clock,
  Type,
  RefreshCw,
} from 'lucide-react';
import { useNotesRedux } from '../../hooks/useNotesRedux';
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
import { TextInputDialog } from '@/components/dialogs/text-input/TextInputDialog';

export default function MobileActionsMenu() {
  const { refreshNotes, findOrCreateEmptyNote } = useNotesRedux();
  const toast = useToastManager('notes');

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleCreateFolder = async (folderName: string) => {
    setCreatingFolder(true);
    try {
      await findOrCreateEmptyNote(folderName);
      toast.success(`Folder "${folderName}" created`);
      setFolderDialogOpen(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setCreatingFolder(false);
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setFolderDialogOpen(true)}>
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

      <TextInputDialog
        open={folderDialogOpen}
        onOpenChange={(open) => {
          if (!open && creatingFolder) return;
          setFolderDialogOpen(open);
        }}
        title="New folder"
        description="Enter a name for the new folder."
        placeholder="Folder name"
        confirmLabel="Create"
        busy={creatingFolder}
        onConfirm={handleCreateFolder}
      />
    </>
  );
}
