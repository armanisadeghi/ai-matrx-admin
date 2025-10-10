'use client';

import React from 'react';
import {
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { 
    ContentBlock, 
    CategoryConfig, 
    getBlocksBySubcategory, 
    getBlocksWithoutSubcategory 
} from '../config/contentBlocks';

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
    const CategoryIcon = category.icon;
    const colorClasses = {
        purple: 'text-purple-600 dark:text-purple-400',
        blue: 'text-blue-600 dark:text-blue-400',
        pink: 'text-pink-600 dark:text-pink-400',
        amber: 'text-amber-600 dark:text-amber-400',
    };
    
    const iconColor = colorClasses[category.color as keyof typeof colorClasses];
    
    // Get blocks without subcategory (direct items)
    const directBlocks = getBlocksWithoutSubcategory(category.id as any);
    
    // If no subcategories are defined, render all blocks directly
    if (!category.subcategories || category.subcategories.length === 0) {
        const allBlocks = getBlocksWithoutSubcategory(category.id as any);
        
        return (
            <ContextMenuSub>
                <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <div className="flex items-center gap-2">
                        <CategoryIcon className={`h-4 w-4 ${iconColor}`} />
                        <span className="text-sm font-medium">{category.label}</span>
                    </div>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                    {allBlocks.map((block) => (
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
                    const subcategoryBlocks = getBlocksBySubcategory(category.id as any, subcategory.id);
                    const SubcategoryIcon = subcategory.icon;
                    
                    if (subcategoryBlocks.length === 0) return null;
                    
                    return (
                        <ContextMenuSub key={subcategory.id}>
                            <ContextMenuSubTrigger className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <div className="flex items-center gap-2">
                                    <SubcategoryIcon className={`h-4 w-4 ${iconColor}`} />
                                    <span className="text-sm font-medium">{subcategory.label}</span>
                                </div>
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-56 bg-white dark:bg-zinc-900">
                                {subcategoryBlocks.map((block) => (
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
