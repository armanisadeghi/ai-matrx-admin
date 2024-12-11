'use client';

import React, { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addTag } from '@/lib/redux/notes/tagsSlice';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';

interface TagSelectProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
}

export const TagSelect = ({ selectedTags, onChange }: TagSelectProps) => {
    const dispatch = useAppDispatch();
    const tags = useAppSelector(state => state.tags.tags);
    const [newTagName, setNewTagName] = useState('');

    const handleAddTag = () => {
        if (newTagName.trim()) {
            const newTag = {
                id: crypto.randomUUID(),
                name: newTagName.trim()
            };
            dispatch(addTag(newTag));
            setNewTagName('');
        }
    };

    // Convert array to comma-separated string for Select value
    const selectedTagsString = selectedTags.join(',');

    const handleTagSelect = (value: string) => {
        // Convert comma-separated string back to array
        const newTags = value ? value.split(',') : [];
        onChange(newTags);
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="New tag name"
                    className="flex-1"
                />
                <Button onClick={handleAddTag}>Add Tag</Button>
            </div>

            <Select
                value={selectedTagsString}
                onValueChange={handleTagSelect}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select tags" />
                </SelectTrigger>
                <SelectContent>
                    {tags.map(tag => (
                        <SelectItem key={tag.id} value={tag.id}>
                            {tag.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};
