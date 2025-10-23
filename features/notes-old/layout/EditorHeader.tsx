// components/notes-app/layout/EditorHeader.tsx

import NoteContextMenu from '../shared/buttons/NoteContextMenu';
import {IconButton} from "@/features/notes/shared/buttons/IconButton";
import {MoreVertical} from "lucide-react";

export const EditorHeader = () => {
    const {currentNote, handleNoteChange} = useNotesManager();
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

