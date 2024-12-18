// components/storage-testing/file-operations/CopyFileOperation.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StorageClient } from '@/utils/supabase/bucket-manager';

interface CopyFileOperationProps {
    bucketName: string;
    selectedFile: string | null;
    onComplete: () => void;
    addLog: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function CopyFileOperation({ bucketName, selectedFile, onComplete, addLog }: CopyFileOperationProps) {
    const [newFileName, setNewFileName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const storage = new StorageClient(bucketName);

    const handleCopy = async () => {
        if (!selectedFile || !newFileName.trim()) return;

        setIsProcessing(true);
        try {
            const { error } = await storage.copy(selectedFile, newFileName);
            if (error) throw error;
            addLog(`File copied successfully from ${selectedFile} to ${newFileName}`, 'success');
            onComplete();
        } catch (error) {
            addLog(`Copy failed: ${error.message}`, 'error');
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
                    onClick={handleCopy}
                    disabled={isProcessing || !newFileName.trim()}
                >
                    {isProcessing ? 'Copying...' : 'Copy File'}
                </Button>
            </div>
        </div>
    );
}
