'use client';

import { Plus, Save, Copy, Trash2, MoreVertical, Pencil, Check, Tags } from 'lucide-react';
import { useNotesManager } from '@/features/notes/hooks/useNotesManager';
import { IconButton } from './IconButton';
import { NoteContextMenu } from './NoteContextMenu';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { TagSelector } from '../selects/TagSelector';


interface NoteActionButtonsProps {
    className?: string;
    showNew?: boolean;
    showEdit?: boolean;
    showSave?: boolean;
    showCopy?: boolean;
    showDelete?: boolean;
    showTags?: boolean;
    disableNew?: boolean;
    disableEdit?: boolean;
    disableSave?: boolean;
    disableCopy?: boolean;
    disableDelete?: boolean;
    disableTags?: boolean;
}

export const NewButton = () => {
    const { handleAddNote, selectedFolderId } = useNotesManager();

    return (
        <IconButton
            icon={Plus}
            variant="primary"
            onClick={() => handleAddNote(selectedFolderId)}
        />
    );
};

export const EditButton = () => {
    const { isEditing, toggleEditMode, currentNote } = useNotesManager();
    return (
        <IconButton
            icon={isEditing ? Check : Pencil}
            variant="secondary"
            onClick={toggleEditMode}
            disabled={!currentNote}
        />
    );
};

export const TagButton = () => {
    const { currentNote } = useNotesManager();
    return (
        <Popover>
            <PopoverTrigger asChild>
                <IconButton
                    icon={Tags}
                    variant="secondary"
                    disabled={!currentNote}
                />
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end" sideOffset={5}>
                <TagSelector />
            </PopoverContent>
        </Popover>
    );
};

export const SaveButton = () => {
    const { handleManualSave } = useNotesManager();
    return <IconButton icon={Save} variant="secondary" onClick={handleManualSave} />;
};

export const CopyButton = () => {
    const { handleCopyNote, currentNote } = useNotesManager();
    return (
        <IconButton
            icon={Copy}
            variant="ghost"
            onClick={() => currentNote && handleCopyNote(currentNote)}
            disabled={!currentNote}
        />
    );
};

export const DeleteButton = () => {
    const { handleNoteDelete, currentNote } = useNotesManager();
    return (
        <IconButton
            icon={Trash2}
            variant="destructive"
            onClick={() => currentNote && handleNoteDelete(currentNote.id)}
            disabled={!currentNote}
        />
    );
};

export const MenuButton = ({
    showNew,
    showEdit,
    showSave,
    showCopy,
    showDelete,
    showTags,
    disableNew,
    disableEdit,
    disableSave,
    disableCopy,
    disableDelete,
    disableTags
}: Omit<NoteActionButtonsProps, 'className'>) => {
    const trigger = <IconButton icon={MoreVertical} />;

    return (
        <NoteContextMenu
            trigger={trigger}
            showNew={showNew}
            showEdit={showEdit}
            showSave={showSave}
            showCopy={showCopy}
            showDelete={showDelete}
            showTags={showTags}
            disableNew={disableNew}
            disableEdit={disableEdit}
            disableSave={disableSave}
            disableCopy={disableCopy}
            disableDelete={disableDelete}
            disableTags={disableTags}
        />
    );
};

export const NoteActionButtons = ({
    className,
    showNew = true,
    showEdit = true,
    showSave = true,
    showCopy = true,
    showDelete = true,
    showTags = true,
    disableNew = false,
    disableEdit = false,
    disableSave = false,
    disableCopy = false,
    disableDelete = false,
    disableTags = false
}: NoteActionButtonsProps) => {
    return (
        <div className={cn(
            "flex items-center gap-2 md:gap-3 px-3 py-1.5",
            "bg-background/80 backdrop-blur-sm",
            "rounded-md shadow-sm",
            "border border-border/50",
            "mr-3 md:mr-4",
            className
        )}>
            {showNew && <NewButton />}
            {showEdit && <EditButton />}
            {showTags && <TagButton />}
            {showSave && <SaveButton />}
            {showCopy && <CopyButton />}
            {showDelete && <DeleteButton />}
            <MenuButton
                showNew={showNew}
                showEdit={showEdit}
                showSave={showSave}
                showCopy={showCopy}
                showDelete={showDelete}
                showTags={showTags}
                disableNew={disableNew}
                disableEdit={disableEdit}
                disableSave={disableSave}
                disableCopy={disableCopy}
                disableDelete={disableDelete}
                disableTags={disableTags}
            />
        </div>
    );
};

