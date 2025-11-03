// features/notes/components/TagInput.tsx
"use client";

import React, { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    className?: string;
}

export function TagInput({ tags, onChange, className }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddTag = () => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue && !tags.includes(trimmedValue)) {
            onChange([...tags, trimmedValue]);
            setInputValue('');
            setIsAdding(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === 'Escape') {
            setInputValue('');
            setIsAdding(false);
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
            {tags.map((tag) => (
                <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs h-5 px-1.5 pr-1 flex items-center gap-1"
                >
                    {tag}
                    <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-accent rounded-full p-0.5"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            </Badge>
        ))}
        
        {isAdding ? (
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    if (inputValue.trim()) {
                        handleAddTag();
                    } else {
                        setIsAdding(false);
                    }
                }}
                placeholder="Type tag..."
                className="h-5 text-xs px-1.5 w-24 bg-muted border-0"
                autoFocus
            />
        ) : (
            <button
                onClick={() => setIsAdding(true)}
                className="h-5 px-1.5 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
            >
                    <Plus className="h-3 w-3" />
                    Tag
                </button>
            )}
        </div>
    );
}

