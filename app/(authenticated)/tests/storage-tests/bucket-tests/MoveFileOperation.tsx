// components/storage-testing/file-operations/MoveFileOperation.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StorageClient } from '@/utils/supabase/bucket-manager';

interface MoveFileOperationProps {
    bucketName: string;
    selectedFile: string | null;
    onComplete: () => void;
    addLog: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function MoveFileOperation({ bucketName, selectedFile, onComplete, addLog }: MoveFileOperationProps) {
    const [newFileName, setNewFileName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const storage = new StorageClient(bucketName);

    const handleMove = async () => {
        if (!selectedFile || !newFileName.trim()) return;

        setIsProcessing(true);
        try {
            const { error } = await storage.move(selectedFile, newFileName);
            if (error) throw error;
            addLog(`File moved successfully from ${selectedFile} to ${newFileName}`, 'success');
            onComplete();
        } catch (error) {
            addLog(`Move failed: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Selected File</Label>
                <div className="text-sm font-mono bg-muted p-2 rounded">
                    {selectedFile}
                </div>
                <Label>New File Name</Label>
                <Input
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="Enter new file name"
                />
                <Button
                    onClick={handleMove}
                    disabled={isProcessing || !newFileName.trim()}
                >
                    {isProcessing ? 'Moving...' : 'Move File'}
                </Button>
            </div>
        </div>
    );
}