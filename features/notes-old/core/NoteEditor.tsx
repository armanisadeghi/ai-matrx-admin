// components/notes-app/core/NoteEditor.tsx
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TagSelect } from '@/features/notes/shared/selects/TagSelector';
import PlainTextArea from "./PlainTextArea";
import { useNotesManager } from '@/features/notes/hooks/useNotesManager';
import { MoreVertical } from 'lucide-react';
import NoteContextMenu from '../shared/buttons/NoteContextMenu';

export const NoteEditor = () => {
    const { currentNote, handleNoteChange } = useNotesManager();

    if (!currentNote) {
        return (
            <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
                Select a note to edit
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 space-y-4">
            <div className="flex justify-between items-center gap-2">
                <Input
                    value={currentNote.title}
                    onChange={(e) => handleNoteChange({ title: e.target.value })}
                    className="text-xl font-semibold"
                    placeholder="Note title"
                />
                <NoteContextMenu
                    trigger={
                        <Button variant="outline" size="icon">
                            <span className="sr-only">Note actions</span>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    }
                    showNew={true}
                />
            </div>

            <TagSelect
                selectedTags={currentNote.tags}
                onChange={(tags) => handleNoteChange({ tags })}
            />

            <PlainTextArea />
        </div>
    );
};

