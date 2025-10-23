// components/notes-app/core/TagFilterSelector.tsx
'use client';

import { Tags } from 'lucide-react';
import { useNotesManager } from '@/features/notes/hooks/useNotesManager';
import MultiSelect from '@/components/ui/loaders/multi-select';

interface TagFilterSelectorProps {
    className?: string;
}

export const TagFilterSelector = ({ className }: TagFilterSelectorProps) => {
    const {
        tags,
        selectedFilterTags,
        setSelectedFilterTags,
    } = useNotesManager();

    const options = tags.map(tag => ({
        value: tag.id,
        label: tag.name
    }));

    return (
        <MultiSelect
            options={options}
            value={selectedFilterTags}
            onChange={setSelectedFilterTags}
            className={className}
            placeholder="Filter by tags..."
            showSelectedInDropdown={false}
            icon={Tags}
        />
    );
};

export default TagFilterSelector;

