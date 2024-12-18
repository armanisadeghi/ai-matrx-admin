// components/file-operations/FolderPicker.tsx
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";

interface FolderPickerProps {
    explorer: UseStorageExplorerReturn;
    currentSelection: string[];
    onSelect: (path: string[]) => void;
}

export function FolderPicker({ explorer, currentSelection, onSelect }: FolderPickerProps) {
    const [availableFolders, setAvailableFolders] = useState<string[]>([]);

    const {
        items,
        currentPath,
        navigateToFolder,
        navigateUp,
    } = explorer;

    useEffect(() => {
        const folders = items
            .filter(item => item.isFolder)
            .map(item => item.name);
        setAvailableFolders(folders);
    }, [items]);

    return (
        <div className="border rounded-md p-2">
            <div className="flex items-center space-x-2 mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        navigateUp();
                        onSelect(currentPath.slice(0, -1));
                    }}
                    disabled={currentPath.length === 0}
                >
                    <ChevronUpIcon className="h-4 w-4" />
                </Button>
                <span className="text-sm font-mono">
                    /{currentPath.join('/')}
                </span>
            </div>

            <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                    {availableFolders.map((folder) => (
                        <Button
                            key={folder}
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                                navigateToFolder(folder);
                                onSelect([...currentPath, folder]);
                            }}
                        >
                            <FolderIcon className="h-4 w-4 mr-2" />
                            {folder}
                            <ChevronRightIcon className="h-4 w-4 ml-auto" />
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}