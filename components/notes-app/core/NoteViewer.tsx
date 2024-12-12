// components/notes-app/core/NoteViewer.tsx
import { EditorHeader } from '../layout/EditorHeader';
import PlainTextArea from './PlainTextArea';
import { useNotesManagerContext } from '@/contexts/NotesManagerContext';

export const NoteViewer = () => {
    const { currentNote, handleNoteChange } = useNotesManagerContext();

    if (!currentNote) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a note to edit
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
                <PlainTextArea />
            </div>
        </div>
    );
};
