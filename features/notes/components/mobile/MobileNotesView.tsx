'use client';

import React, { useState } from 'react';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import MobileNotesList from './MobileNotesList';
import MobileNoteEditor from './MobileNoteEditor';
import type { Note } from '@/features/notes/types';

type MobileView = 'list' | 'editor';

export default function MobileNotesView() {
  const { activeNote, notes } = useNotesContext();
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
    <div className="h-page w-full bg-background overflow-hidden relative touch-pan-y">
      {/* Notes List View */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-in-out overflow-hidden ${
          currentView === 'list' ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <MobileNotesList onNoteSelect={handleNoteSelect} />
      </div>

      {/* Note Editor View */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-in-out overflow-hidden ${
          currentView === 'editor' ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedNote && (
          <MobileNoteEditor note={selectedNote} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}

