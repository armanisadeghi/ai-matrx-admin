'use client';

import React from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuLabel,
} from '@/components/ui/context-menu';
import { contentBlocks, categoryConfigs, type ContentBlock } from '@/features/rich-text-editor/config/contentBlocks';
import { DynamicContextMenuSection } from '@/features/rich-text-editor/components/DynamicContextMenuSection';
import { insertTextAtTextareaCursor } from '../utils/textareaInsertUtils';

interface PromptEditorContextMenuProps {
    getTextarea: () => HTMLTextAreaElement | null;
    children: React.ReactNode;
    onContentInserted?: () => void;
}

export const PromptEditorContextMenu: React.FC<PromptEditorContextMenuProps> = ({
    getTextarea,
    children,
    onContentInserted,
}) => {
    const handleInsertBlock = (block: ContentBlock) => {
        const textarea = getTextarea();
        if (!textarea) {
            console.error('Textarea not available');
            return;
        }
        const success = insertTextAtTextareaCursor(textarea, block.template);
        if (success) {
            onContentInserted?.();
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200">
                <ContextMenuLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2 py-1">
                    Insert Content Block
                </ContextMenuLabel>
                <ContextMenuSeparator />

                {/* Dynamic sections based on category configuration */}
                {categoryConfigs.map((category) => (
                    <DynamicContextMenuSection
                        key={category.id}
                        category={category}
                        onBlockSelect={handleInsertBlock}
                    />
                ))}

                <ContextMenuSeparator />

                {/* Quick Access - Most Common Blocks */}
                <ContextMenuLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2 py-1">
                    Quick Insert
                </ContextMenuLabel>
                {[
                    contentBlocks.find(b => b.id === 'heading-2'),
                    contentBlocks.find(b => b.id === 'bullet-list'),
                    contentBlocks.find(b => b.id === 'code-block'),
                    contentBlocks.find(b => b.id === 'todo'),
                ].filter(Boolean).map((block) => {
                    if (!block) return null;
                    const Icon = block.icon;
                    return (
                        <ContextMenuItem
                            key={block.id}
                            className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onSelect={() => handleInsertBlock(block)}
                        >
                            <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm text-gray-800 dark:text-gray-200">{block.label}</span>
                            </div>
                        </ContextMenuItem>
                    );
                })}
            </ContextMenuContent>
        </ContextMenu>
    );
};

