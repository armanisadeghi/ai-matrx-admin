'use client';
import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Save, Copy, Trash2, Plus, Pencil, Check, Tags} from 'lucide-react';
import {useNotesManagerContext} from '@/contexts/NotesManagerContext';
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import {TagSelector} from '../selects/TagSelector';

interface NoteContextMenuProps {
    showNew?: boolean;
    showSave?: boolean;
    showCopy?: boolean;
    showDelete?: boolean;
    showEdit?: boolean;
    showTags?: boolean;
    disableNew?: boolean;
    disableSave?: boolean;
    disableCopy?: boolean;
    disableDelete?: boolean;
    disableEdit?: boolean;
    disableTags?: boolean;
    trigger: React.ReactNode;
}

export const NoteContextMenu = (
    {
        showNew = true,
        showSave = true,
        showCopy = true,
        showDelete = true,
        showEdit = true,
        showTags = true,
        disableNew = false,
        disableSave = false,
        disableCopy = false,
        disableDelete = false,
        disableEdit = false,
        disableTags = false,
        trigger
    }: NoteContextMenuProps) => {
    const {
        handleManualSave,
        handleCopyNote,
        handleNoteDelete,
        handleAddNote,
        toggleEditMode,
        isEditing,
        currentNote,
        selectedFolderId,
    } = useNotesManagerContext();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                {trigger}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-48"
                sideOffset={5}
            >
                {/* Note Creation */}
                {showNew && (
                    <DropdownMenuItem
                        onClick={() => handleAddNote(selectedFolderId)}
                        disabled={disableNew}
                    >
                        <Plus className="mr-2 h-4 w-4"/>
                        New Note
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator/>

                {/* Note Actions */}
                {showEdit && (
                    <DropdownMenuItem
                        onClick={toggleEditMode}
                        disabled={disableEdit || !currentNote}
                    >
                        {isEditing ? (
                            <>
                                <Check className="mr-2 h-4 w-4"/>
                                Finish Editing
                            </>
                        ) : (
                             <>
                                 <Pencil className="mr-2 h-4 w-4"/>
                                 Edit Note
                             </>
                         )}
                    </DropdownMenuItem>
                )}

                {showTags && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <DropdownMenuItem
                                onClick={(e) => e.preventDefault()}
                                disabled={disableTags || !currentNote}
                            >
                                <Tags className="mr-2 h-4 w-4"/>
                                Manage Tags
                            </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="w-72 sm:max-w-md">
                            <TagSelector/>
                        </DialogContent>
                    </Dialog>
                )}

                {showSave && (
                    <DropdownMenuItem
                        onClick={handleManualSave}
                        disabled={disableSave || !currentNote}
                    >
                        <Save className="mr-2 h-4 w-4"/>
                        Save Note
                    </DropdownMenuItem>
                )}

                {showCopy && (
                    <DropdownMenuItem
                        onClick={() => currentNote && handleCopyNote(currentNote)}
                        disabled={disableCopy || !currentNote}
                    >
                        <Copy className="mr-2 h-4 w-4"/>
                        Copy Note
                    </DropdownMenuItem>
                )}

                {/* Destructive Actions */}
                {showDelete && (
                    <>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem
                            onClick={() => currentNote && handleNoteDelete(currentNote.id)}
                            disabled={disableDelete || !currentNote}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete Note
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NoteContextMenu;
