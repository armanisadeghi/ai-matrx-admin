// components/notes-app/core/TagSelect/TagSelector.tsx
'use client';

import {useNotesManager} from '@/features/notes/hooks/useNotesManager';
import MultiSelect from '@/components/ui/loaders/multi-select';
import { Tag } from '@/types';

interface TagSelectorProps {
    className?: string;
    mode?: 'filter' | 'edit';
}

export const TagSelector = ({
    className,
    mode = 'edit'
}: TagSelectorProps) => {
    const {
        currentNote,
        tags,
        handleTagSelect,
        handleAddTag
    } = useNotesManager();

    const options = tags.map(tag => ({
        value: tag.id,
        label: tag.name
    }));

    const handleCreateTag = (name: string) => {
        if (!name.trim()) return null;

        const newTag: Tag = {
            id: crypto.randomUUID(),
            name: name.trim()
        };

        handleAddTag(newTag);
        return newTag.id;
    };

    return (
        <MultiSelect
            options={options}
            value={currentNote?.tags || []}
            onChange={handleTagSelect}
            className={className}
            placeholder="Add or create tags..."
            creatable
            onCreateOption={handleCreateTag}
            showSelectedInDropdown={false}
            variant="default"
            size="default"
        />
    );
};

