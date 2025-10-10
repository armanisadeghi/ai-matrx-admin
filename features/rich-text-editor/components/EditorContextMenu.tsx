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
import { ContentBlock } from '../config/contentBlocks';
import { DynamicContextMenuSection } from './DynamicContextMenuSection';
import { useContentBlocks } from '@/hooks/useContentBlocks';
import { insertTextAtCursor } from '../utils/insertTextUtils';
import contentBlocksConfig from '@/config/content-blocks';

interface EditorContextMenuProps {
    editorId: string;
    children: React.ReactNode;
    onContentInserted?: () => void;
    useDatabase?: boolean;
    quickAccessBlocks?: string[];
    className?: string;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
    editorId,
    children,
    onContentInserted,
    useDatabase = contentBlocksConfig.useDatabase,
    quickAccessBlocks = contentBlocksConfig.defaultQuickAccessBlocks,
    className
}) => {
    const { contentBlocks, categoryConfigs, loading, error } = useContentBlocks({ 
        useDatabase,
        autoRefresh: useDatabase 
    });

    const handleInsertBlock = (block: ContentBlock) => {
        const success = insertTextAtCursor(editorId, block.template);
        if (success) {
            onContentInserted?.();
        }
    };

    // Get quick access blocks
    const getQuickAccessBlocks = () => {
        return quickAccessBlocks
            .map(blockId => contentBlocks.find(b => b.id === blockId))
            .filter(Boolean) as ContentBlock[];
    };

    if (loading) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent className={`w-64 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 ${className}`}>
                    <ContextMenuLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2 py-1">
                        Loading...
                    </ContextMenuLabel>
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    if (error) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent className={`w-64 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 ${className}`}>
                    <ContextMenuLabel className="text-xs font-semibold text-red-600 dark:text-red-400 px-2 py-1">
                        Error loading blocks
                    </ContextMenuLabel>
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    const quickAccessBlocksList = getQuickAccessBlocks();
    const MenuSectionComponent = DynamicContextMenuSection;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className={`w-64 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 ${className}`}>
                <ContextMenuLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2 py-1">
                    Insert Content Block
                </ContextMenuLabel>
                <ContextMenuSeparator />

                {/* Dynamic sections based on category configuration */}
                {categoryConfigs.map((category) => (
                    <MenuSectionComponent
                        key={category.id}
                        category={category}
                        onBlockSelect={handleInsertBlock}
                    />
                ))}

                {/* Quick Access Section */}
                {quickAccessBlocksList.length > 0 && (
                    <>
                        <ContextMenuSeparator />
                        <ContextMenuLabel className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2 py-1">
                            Quick Insert
                        </ContextMenuLabel>
                        {quickAccessBlocksList.map((block) => {
                            const Icon = block.icon;
                            return (
                                <ContextMenuItem
                                    key={block.id}
                                    className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onSelect={() => handleInsertBlock(block)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        <span className="text-sm text-gray-800 dark:text-gray-200">
                                            {block.label}
                                        </span>
                                    </div>
                                </ContextMenuItem>
                            );
                        })}
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};
