// components/notes-app/core/TagSelect/TagFilter.tsx
'use client';

import { useNotesManager } from '@/features/notes/hooks/useNotesManager';
import MultiSelect from '@/components/ui/loaders/multi-select';

interface TagFilterProps {
    className?: string;
}

export const TagFilter = ({ className }: TagFilterProps) => {
    const {
        tags,
        selectedFilterTags,
        handleFilterByTags
    } = useNotesManager();

    const options = tags.map(tag => ({
        value: tag.id,
        label: tag.name
    }));

    return (
        <MultiSelect
            options={options}
            value={selectedFilterTags}
            onChange={handleFilterByTags}
            className={className}
            placeholder="Filter by tags..."
            showSelectedInDropdown={false}
            variant="secondary"
            size="sm"
        />
    );
};

export default TagFilter;
