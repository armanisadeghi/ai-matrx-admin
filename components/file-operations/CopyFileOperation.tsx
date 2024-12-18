// components/file-operations/CopyFileOperation.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseStorageExplorerReturn } from "@/hooks/file-operations/useStorageExplorer";
import { FolderPicker } from './FolderPicker';

interface CopyFileOperationProps {
    explorer: UseStorageExplorerReturn;
    onComplete: () => void;
}

export function CopyFileOperation({ explorer, onComplete }: CopyFileOperationProps) {
    const [targetPath, setTargetPath] = useState<string[]>([]);
    const [newFileName, setNewFileName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const {
        selectedItem,
        copyItem,
        currentPath,
    } = explorer;

    if (!selectedItem) return null;

    const handleCopy = async () => {
        if (!selectedItem || !newFileName.trim()) return;

        setIsProcessing(true);
        try {
            await copyItem(selectedItem, [...targetPath, newFileName]);
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

                <div className="pt-4">
                    <Button
                        onClick={handleCopy}
                        disabled={isProcessing || !newFileName.trim()}
                        className="w-full"
                    >
                        {isProcessing ? 'Copying...' : 'Copy Item'}
                    </Button>
                </div>
            </div>
        </div>
    );
}