'use client';

import {Tags} from 'lucide-react';
import {IconButton} from './IconButton';
import {useNotesManager} from '@/features/notes/hooks/useNotesManager';
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {TagSelector} from '../selects/TagSelector';

export const TagButton = () => {
    const {currentNote} = useNotesManager();

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
                <TagSelector/>
            </PopoverContent>
        </Popover>
    );
};

export default TagButton;

