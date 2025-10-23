// components/notes-app/core/NoteViewer.tsx
import PlainTextArea from './PlainTextArea';

export const NoteViewer = () => {
    const { currentNote } = useNotesManager();

    // ALWAYS show the editor - there should always be a selected note
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
                {currentNote ? (
                    <PlainTextArea />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Loading...
                    </div>
                )}
            </div>
        </div>
    );
};
