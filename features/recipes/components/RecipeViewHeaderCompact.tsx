"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from 'next/link';

interface RecipeViewHeaderCompactProps {
    recipeId: string;
}

export function RecipeViewHeaderCompact({ recipeId }: RecipeViewHeaderCompactProps) {
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
                            <Link href={`/ai/recipes/${recipeId}/edit`} className="flex items-center w-full">
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Recipe
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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

                {/* Edit button */}
                <Link href={`/ai/recipes/${recipeId}/edit`}>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit Recipe"
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                </Link>
            </div>
        </div>
    );
}

