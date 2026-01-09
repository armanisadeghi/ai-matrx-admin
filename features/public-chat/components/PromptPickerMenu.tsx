'use client';

import React, { useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { LuBrain } from 'react-icons/lu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useUserPrompts } from '../hooks/useUserPrompts';
import type { AgentConfig } from '../context/ChatContext';

// ============================================================================
// TYPES
// ============================================================================

interface PromptPickerMenuProps {
    onSelect: (agent: AgentConfig) => void;
    disabled?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PromptPickerMenu - Lazy-loaded menu for selecting user prompts as agents
 * 
 * Features:
 * - Lazy loads after page is interactive
 * - Search functionality for finding prompts
 * - Suspense/loading state
 * - Minimal data fetching (no messages)
 */
export function PromptPickerMenu({ onSelect, disabled = false }: PromptPickerMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { prompts, isLoading, error } = useUserPrompts();

    // Filter prompts based on search query
    const filteredPrompts = useMemo(() => {
        if (!searchQuery.trim()) {
            return prompts;
        }

        const query = searchQuery.toLowerCase();
        return prompts.filter(prompt =>
            prompt.name?.toLowerCase().includes(query) ||
            prompt.description?.toLowerCase().includes(query)
        );
    }, [prompts, searchQuery]);

    const handleSelect = (prompt: typeof prompts[0]) => {
        onSelect({
            promptId: prompt.id,
            name: prompt.name || 'Untitled Prompt',
            description: prompt.description || undefined,
            variableDefaults: prompt.variable_defaults || [],
        });
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    disabled={disabled}
                    className="py-1 px-2 rounded-full flex items-center border border-zinc-300 dark:border-zinc-700 transition-colors text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="My Prompts"
                >
                    <LuBrain size={16} />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start" side="top" sideOffset={8}>
                <div className="flex flex-col max-h-[400px]">
                    {/* Header with Search */}
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search prompts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 text-sm h-8"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <span className="text-sm">Loading your prompts...</span>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-12 text-red-500">
                                <span className="text-sm">Failed to load prompts</span>
                                <span className="text-xs text-gray-500 mt-1">{error}</span>
                            </div>
                        ) : filteredPrompts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <span className="text-sm">
                                    {searchQuery ? 'No prompts found' : 'No prompts yet'}
                                </span>
                                {!searchQuery && (
                                    <span className="text-xs text-gray-400 mt-1">
                                        Create prompts to use them as agents
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="py-1">
                                {filteredPrompts.map((prompt) => (
                                    <button
                                        key={prompt.id}
                                        onClick={() => handleSelect(prompt)}
                                        className="w-full px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                                    >
                                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                            {prompt.name || 'Untitled Prompt'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default PromptPickerMenu;
