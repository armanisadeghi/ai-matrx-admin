// contexts/NotesManagerContext.tsx
import { createContext, useContext } from 'react';
import { useNotesManager, UseNotesManagerReturn } from '@/hooks/notes-app/useNotesManager';

const NotesManagerContext = createContext<UseNotesManagerReturn | null>(null);

export const NotesManagerProvider = ({ children }: { children: React.ReactNode }) => {
    const notesManager = useNotesManager();
    return (
        <NotesManagerContext.Provider value={notesManager}>
            {children}
        </NotesManagerContext.Provider>
    );
};

export const useNotesManagerContext = () => {
    const context = useContext(NotesManagerContext);
    if (!context) {
        throw new Error('useNotesManagerContext must be used within NotesManagerProvider');
    }
    return context;
};
