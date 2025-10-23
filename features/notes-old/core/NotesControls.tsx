// components/notes-app/core/NotesControls.tsx
'use client';

import { Search, ArrowUpDown, Calendar, Type } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TagFilter } from '@/features/notes/shared/selects/TagFilter';
import { useNotesManager } from '@/features/notes/hooks/useNotesManager';

export const NotesControls = () => {
    const {
        searchTerm,
        handleSearchChange,
        sortBy,
        handleSortChange
    } = useNotesManager();

    const toggleSort = () => {
        handleSortChange(sortBy === 'date' ? 'title' : 'date');
    };

    const getSortIcon = () => {
        if (sortBy === 'date') {
            return <Calendar className="h-4 w-4" />;
        }
        return <Type className="h-4 w-4" />;
    };

    const getSortTooltip = () => {
        return sortBy === 'date' ? 'Sorted by Date' : 'Sorted by Title';
    };

    return (
        <div className="space-y-2">
            {/* Search and Sort Row */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search notes..."
                        className="pl-8 h-8 text-sm"
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleSort}
                    className="h-8 w-8 flex-shrink-0"
                    title={getSortTooltip()}
                >
                    {getSortIcon()}
                </Button>
            </div>
            
            {/* Tag Filter Row */}
            <TagFilter className="w-full" />
        </div>
    );
};

