'use client';

import React, { useState, useEffect } from 'react';
import {
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { 
    ContentBlock, 
    CategoryConfig,
} from '../config/contentBlocks';
import { 
    getBlocksBySubcategory, 
    getBlocksWithoutSubcategory 
} from '@/lib/services/content-blocks-service';

interface DynamicContextMenuSectionProps {
    category: CategoryConfig;
    onBlockSelect: (block: ContentBlock) => void;
}

interface MenuItemProps {
    block: ContentBlock;
    color: string;
    onSelect: (block: ContentBlock) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ block, color, onSelect }) => {
    const Icon = block.icon;
    const colorClasses = {
        purple: 'text-purple-600 dark:text-purple-400',
        blue: 'text-blue-600 dark:text-blue-400',
        pink: 'text-pink-600 dark:text-pink-400',
        amber: 'text-amber-600 dark:text-amber-400',
        gray: 'text-gray-600 dark:text-gray-400',
    };
    
    const iconColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;

    return (
        <ContextMenuItem
            className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onSelect={() => onSelect(block)}
        >
            <div className="flex items-start gap-2 w-full">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
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
};

export const DynamicContextMenuSection: React.FC<DynamicContextMenuSectionProps> = ({ 
    category, 
    onBlockSelect 
}) => {
    const [directBlocks, setDirectBlocks] = useState<ContentBlock[]>([]);
    const [subcategoryBlocks, setSubcategoryBlocks] = useState<Record<string, ContentBlock[]>>({});
    const [loading, setLoading] = useState(true);

    const CategoryIcon = category.icon;
    const colorClasses = {
        purple: 'text-purple-600 dark:text-purple-400',
        blue: 'text-blue-600 dark:text-blue-400',
        pink: 'text-pink-600 dark:text-pink-400',
        amber: 'text-amber-600 dark:text-amber-400',
    };
    
    const iconColor = colorClasses[category.color as keyof typeof colorClasses];

    // Load blocks from database
    useEffect(() => {
        const loadBlocks = async () => {
            try {
                setLoading(true);

                // Load direct blocks (without subcategory)
                const directBlocksData = await getBlocksWithoutSubcategory(category.id);
                setDirectBlocks(directBlocksData);

                // Load subcategory blocks
                if (category.subcategories && category.subcategories.length > 0) {
                    const subcategoryBlocksData: Record<string, ContentBlock[]> = {};
                    
                    await Promise.all(
                        category.subcategories.map(async (subcategory) => {
                            const blocks = await getBlocksBySubcategory(category.id, subcategory.id);
                            subcategoryBlocksData[subcategory.id] = blocks;
                        })
                    );
                    
                    setSubcategoryBlocks(subcategoryBlocksData);
                }
            } catch (error) {
                console.error('Error loading content blocks:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBlocks();
    }, [category]);

    if (loading) {
        return (
            <ContextMenuSub>
                <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <div className="flex items-center gap-2">
                        <CategoryIcon className={`h-4 w-4 ${iconColor}`} />
                        <span className="text-sm font-medium">{category.label}</span>
                    </div>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                    <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                        Loading...
                    </div>
                </ContextMenuSubContent>
            </ContextMenuSub>
        );
    }
    
    // If no subcategories are defined, render all direct blocks
    if (!category.subcategories || category.subcategories.length === 0) {
        return (
            <ContextMenuSub>
                <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <div className="flex items-center gap-2">
                        <CategoryIcon className={`h-4 w-4 ${iconColor}`} />
                        <span className="text-sm font-medium">{category.label}</span>
                    </div>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                    {directBlocks.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                            No blocks available
                        </div>
                    ) : (
                        directBlocks.map((block) => (
                            <MenuItem
                                key={block.id}
                                block={block}
                                color={category.color}
                                onSelect={onBlockSelect}
                            />
                        ))
                    )}
                </ContextMenuSubContent>
            </ContextMenuSub>
        );
    }

    // Render with subcategories
    return (
        <ContextMenuSub>
            <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <div className="flex items-center gap-2">
                    <CategoryIcon className={`h-4 w-4 ${iconColor}`} />
                    <span className="text-sm font-medium">{category.label}</span>
                </div>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                {/* Render direct blocks first (if any) */}
                {directBlocks.map((block) => (
                    <MenuItem
                        key={block.id}
                        block={block}
                        color={category.color}
                        onSelect={onBlockSelect}
                    />
                ))}
                
                {/* Add separator if there are both direct blocks and subcategories */}
                {directBlocks.length > 0 && category.subcategories.length > 0 && (
                    <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
                )}
                
                {/* Render subcategories */}
                {category.subcategories.map((subcategory) => {
                    const blocks = subcategoryBlocks[subcategory.id] || [];
                    const SubcategoryIcon = subcategory.icon;
                    
                    if (blocks.length === 0) return null;
                    
                    return (
                        <ContextMenuSub key={subcategory.id}>
                            <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <div className="flex items-center gap-2">
                                    <SubcategoryIcon className={`h-4 w-4 ${iconColor}`} />
                                    <span className="text-sm font-medium">{subcategory.label}</span>
                                </div>
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                                {blocks.map((block) => (
                                    <MenuItem
                                        key={block.id}
                                        block={block}
                                        color={category.color}
                                        onSelect={onBlockSelect}
                                    />
                                ))}
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                    );
                })}
            </ContextMenuSubContent>
        </ContextMenuSub>
    );
};
