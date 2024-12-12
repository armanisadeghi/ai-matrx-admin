// components/notes-app/core/NotesControls.tsx
'use client';

import { Search, SortAsc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TagFilter } from '@/components/notes-app/shared/selects/TagFilter';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useNotesManagerContext } from '@/contexts/NotesManagerContext';

export const NotesControls = () => {
    const {
        searchTerm,
        handleSearchChange,
        sortBy,
        handleSortChange
    } = useNotesManagerContext();

    return (
        <>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search notes..."
                        className="pl-8"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <TagFilter className="flex-1" />
                <Select
                    value={sortBy}
                    onValueChange={handleSortChange}
                >
                    <SelectTrigger>
                        <SortAsc className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date">Date Modified</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );
};
