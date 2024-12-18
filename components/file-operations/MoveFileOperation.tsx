// components/file-operations/MoveFileOperation.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";
import { FolderPicker } from './FolderPicker';

interface MoveFileOperationProps {
    explorer: UseStorageExplorerReturn;
    onComplete: () => void;
}

export function MoveFileOperation({ explorer, onComplete }: MoveFileOperationProps) {
    const [targetPath, setTargetPath] = useState<string[]>([]);
    const [newFileName, setNewFileName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const {
        selectedItem,
        moveItem,
        currentPath,
    } = explorer;

    if (!selectedItem) return null;

    const handleMove = async () => {
        if (!selectedItem || !newFileName.trim()) return;

        setIsProcessing(true);
        try {
            await moveItem(selectedItem, [...targetPath, newFileName]);
            onComplete();
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Selected Item</Label>
                <div className="text-sm font-mono bg-muted p-2 rounded">
                    {selectedItem.name}
                </div>

                <Label>Target Location</Label>
                <FolderPicker
                    explorer={explorer}
                    currentSelection={targetPath}
                    onSelect={setTargetPath}
                />

                <Label>New Name</Label>
                <Input
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="Enter new name"
                    defaultValue={selectedItem.name}
                />

                <div className="pt-4 space-y-2">
                    <Button
                        onClick={handleMove}
                        disabled={isProcessing || !newFileName.trim()}
                        className="w-full"
                    >
                        {isProcessing ? 'Moving...' : 'Move Item'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onComplete}
                        disabled={isProcessing}
                        className="w-full"
                    >
                        Cancel
                    </Button>
                </div>
            </div>

            {targetPath.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    Will move to: /{targetPath.join('/')}/{newFileName}
                </div>
            )}
        </div>
    );
}