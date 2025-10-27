'use client';

import React from "react";
import { Plus, Search, SortAsc, SortDesc, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NotesHeaderCompactProps {
    onCreateNote: () => void;
    onCreateFolder: () => void;
    sortConfig: { field: string; order: 'asc' | 'desc' };
    onSortChange: (field: string, order: 'asc' | 'desc') => void;
}

export function NotesHeaderCompact({ 
    onCreateNote, 
    onCreateFolder,
    sortConfig,
    onSortChange
}: NotesHeaderCompactProps) {
    const toggleSortOrder = () => {
        onSortChange(sortConfig.field, sortConfig.order === 'asc' ? 'desc' : 'asc');
    };

    return (
        <div className="flex items-center gap-1 h-full bg-textured">
            {/* New Note Button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={onCreateNote}
                            title="New Note"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>New Note</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* New Folder Button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={onCreateFolder}
                            title="New Folder"
                        >
                            <FolderPlus className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>New Folder</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Sort Menu */}
            <DropdownMenu>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title="Sort Options"
                                >
                                    {sortConfig.order === 'asc' ? (
                                        <SortAsc className="h-3.5 w-3.5" />
                                    ) : (
                                        <SortDesc className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Sort Options</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onSortChange('label', sortConfig.order)}>
                        Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSortChange('updated_at', sortConfig.order)}>
                        Last Modified
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSortChange('created_at', sortConfig.order)}>
                        Date Created
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toggleSortOrder}>
                        {sortConfig.order === 'asc' ? 'Ascending' : 'Descending'}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

