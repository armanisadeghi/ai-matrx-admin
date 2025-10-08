'use client';

import React from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
    ContextMenuLabel,
} from '@/components/ui/context-menu';
import { Brain, FileText, Palette, Sparkles } from 'lucide-react';
import { contentBlocks, getBlocksByCategory, type ContentBlock } from '@/features/rich-text-editor/config/contentBlocks';
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

    const aiPromptBlocks = getBlocksByCategory('ai-prompts');
    const structureBlocks = getBlocksByCategory('structure');
    const formattingBlocks = getBlocksByCategory('formatting');
    const specialBlocks = getBlocksByCategory('special');

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

                {/* AI Prompts Section */}
                <ContextMenuSub>
                    <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium">AI Prompts</span>
                        </div>
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                        {aiPromptBlocks.map((block) => {
                            const Icon = block.icon;
                            return (
                                <ContextMenuItem
                                    key={block.id}
                                    className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onSelect={() => handleInsertBlock(block)}
                                >
                                    <div className="flex items-start gap-2 w-full">
                                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
                                        <div className="flex flex-col flex-1">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {block.label}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                {block.description}
                                            </span>
                                        </div>
                                    </div>
                                </ContextMenuItem>
                            );
                        })}
                    </ContextMenuSubContent>
                </ContextMenuSub>

                {/* Structure Section */}
                <ContextMenuSub>
                    <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium">Structure</span>
                        </div>
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                        {structureBlocks.map((block) => {
                            const Icon = block.icon;
                            return (
                                <ContextMenuItem
                                    key={block.id}
                                    className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onSelect={() => handleInsertBlock(block)}
                                >
                                    <div className="flex items-start gap-2 w-full">
                                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                                        <div className="flex flex-col flex-1">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {block.label}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                {block.description}
                                            </span>
                                        </div>
                                    </div>
                                </ContextMenuItem>
                            );
                        })}
                    </ContextMenuSubContent>
                </ContextMenuSub>

                {/* Formatting Section */}
                <ContextMenuSub>
                    <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                            <span className="text-sm font-medium">Formatting</span>
                        </div>
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                        {formattingBlocks.map((block) => {
                            const Icon = block.icon;
                            return (
                                <ContextMenuItem
                                    key={block.id}
                                    className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onSelect={() => handleInsertBlock(block)}
                                >
                                    <div className="flex items-start gap-2 w-full">
                                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-pink-600 dark:text-pink-400" />
                                        <div className="flex flex-col flex-1">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {block.label}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                {block.description}
                                            </span>
                                        </div>
                                    </div>
                                </ContextMenuItem>
                            );
                        })}
                    </ContextMenuSubContent>
                </ContextMenuSub>

                {/* Special Section */}
                <ContextMenuSub>
                    <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-medium">Special</span>
                        </div>
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                        {specialBlocks.map((block) => {
                            const Icon = block.icon;
                            return (
                                <ContextMenuItem
                                    key={block.id}
                                    className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onSelect={() => handleInsertBlock(block)}
                                >
                                    <div className="flex items-start gap-2 w-full">
                                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                                        <div className="flex flex-col flex-1">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {block.label}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                {block.description}
                                            </span>
                                        </div>
                                    </div>
                                </ContextMenuItem>
                            );
                        })}
                    </ContextMenuSubContent>
                </ContextMenuSub>

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

