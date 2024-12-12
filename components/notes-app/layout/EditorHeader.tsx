// components/notes-app/layout/EditorHeader.tsx
import {useNotesManagerContext} from '@/contexts/NotesManagerContext';


import NoteContextMenu from '../shared/buttons/NoteContextMenu';
import {IconButton} from "@/components/notes-app/shared/buttons/IconButton";
import {MoreVertical} from "lucide-react";

export const EditorHeader = () => {
    const {currentNote, handleNoteChange} = useNotesManagerContext();
    const trigger = <IconButton icon={MoreVertical}/>;

    if (!currentNote) return null;

    return (
        <div className="h-6 min-h-[3rem]">
            <div className="flex items-center gap-1">
                <NoteContextMenu trigger={trigger}/>
            </div>
        </div>
    );
};

export default EditorHeader;
