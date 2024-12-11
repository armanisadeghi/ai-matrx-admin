'use client';

import React from 'react';
import { NotesList } from '@/components/notes-app/NotesList';
import { NoteEditor } from '@/components/notes-app/NoteEditor';

export default function NotesPage() {
    return (
        <div className="flex h-full">
            <NotesList />
            <NoteEditor />
        </div>
    );
}
