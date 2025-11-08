"use client";

import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Save, FileJson, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import Link from 'next/link';

interface RecipeEditHeaderCompactProps {
    recipeId: string;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    onSettingsClick: () => void;
    nextVersion: number;
}

export function RecipeEditHeaderCompact({ 
    recipeId, 
    isDirty,
    isSaving,
    onSave,
    onSettingsClick,
    nextVersion
}: RecipeEditHeaderCompactProps) {
    return (
        <div className="flex items-center gap-2 h-full bg-textured">
            {/* Mobile - Dropdown menu */}
            <div className="md:hidden">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href="/ai/recipes" className="flex items-center w-full">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Recipes
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/ai/recipes/${recipeId}`} className="flex items-center w-full">
                                <Eye className="h-4 w-4 mr-2" />
                                View Recipe
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onSettingsClick}>
                            <FileJson className="h-4 w-4 mr-2" />
                            Edit Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onSave} disabled={isSaving || !isDirty}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Version {nextVersion}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile status indicator */}
                {isDirty && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full ml-1" title="Unsaved changes" />
                )}
            </div>

            {/* Desktop - Inline icon buttons */}
            <div className="hidden md:flex items-center gap-1">
                {/* Back button */}
                <Link href="/ai/recipes">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Back to Recipes"
                    >
                        <ArrowLeft className="h-3 w-3" />
                    </Button>
                </Link>

                {/* View button */}
                <Link href={`/ai/recipes/${recipeId}`}>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="View Recipe"
                    >
                        <Eye className="h-3 w-3" />
                    </Button>
                </Link>

                {/* Status indicators */}
                {isDirty && (
                    <span className="px-1.5 py-0.5 text-[10px] border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded">
                        Unsaved
                    </span>
                )}

                {/* Settings button */}
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 ml-1"
                    onClick={onSettingsClick}
                    title="Edit Settings"
                >
                    <FileJson className="h-3 w-3" />
                </Button>

                {/* Save button */}
                <Button
                    onClick={onSave}
                    disabled={isSaving || !isDirty}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white h-7 px-2 ml-1 text-xs"
                >
                    <Save className="h-3 w-3" />
                    Save
                </Button>
            </div>
        </div>
    );
}

