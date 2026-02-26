'use client';

import React, { useState } from 'react';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import { PageSpecificHeader } from '@/components/layout/new-layout/PageSpecificHeader';
import MobileNotesList from './MobileNotesList';
import MobileNoteEditor from './MobileNoteEditor';
import type { Note } from '@/features/notes/types';

type MobileView = 'list' | 'editor';

export default function MobileNotesView() {
  const { notes } = useNotesContext();
  const [currentView, setCurrentView] = useState<MobileView>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const selectedNote = selectedNoteId
    ? notes.find(n => n.id === selectedNoteId) || null
    : null;

  const handleNoteSelect = (note: Note) => {
    setSelectedNoteId(note.id);
    setCurrentView('editor');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedNoteId(null);
  };

  return (
    <>
      {/* "Notes" title in the app header — only when on the list view */}
      {currentView === 'list' && (
        <PageSpecificHeader>
          <span className="text-sm font-semibold text-foreground">Notes</span>
        </PageSpecificHeader>
      )}

      <div className="h-[calc(100dvh-var(--header-height))] w-full bg-background overflow-hidden relative">
        {/* List View */}
        <div
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            currentView === 'list' ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <MobileNotesList onNoteSelect={handleNoteSelect} />
        </div>

        {/* Editor View — scrollable, not overflow-hidden */}
        <div
          className={`absolute inset-0 transition-transform duration-300 ease-in-out overflow-y-auto ${
            currentView === 'editor' ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selectedNote && (
            <MobileNoteEditor note={selectedNote} onBack={handleBack} />
          )}
        </div>
      </div>
    </>
  );
}
