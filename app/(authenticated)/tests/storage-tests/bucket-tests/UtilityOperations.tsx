// components/storage-testing/UtilityOperations.tsx

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StorageClient } from '@/utils/supabase/bucket-manager';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UtilityOperationsProps {
    currentBucket: string;
    addLog: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function UtilityOperations({ currentBucket, addLog }: UtilityOperationsProps) {
    const [filePath, setFilePath] = useState('');
    const [metadata, setMetadata] = useState<any>(null);
    const [publicUrl, setPublicUrl] = useState<string>('');

    const storage = new StorageClient(currentBucket);

    if (!currentBucket) {
        return (
            <Alert>
                <AlertDescription>
                    Please select a bucket first to perform utility operations.
                </AlertDescription>
            </Alert>
        );
    }

    const checkFileExists = async () => {
        try {
            const exists = await storage.fileExists(filePath);
            addLog(`File ${exists ? 'exists' : 'does not exist'}: ${filePath}`, 'info');
        } catch (error) {
            addLog(`Failed to check file existence: ${error.message}`, 'error');
        }
    };

    const getMetadata = async () => {
        try {
            const data = await storage.getFileMetadata(filePath);
            setMetadata(data);
            addLog('Metadata retrieved successfully', 'success');
        } catch (error) {
            addLog(`Failed to get metadata: ${error.message}`, 'error');
            setMetadata(null);
        }
    };

    const getPublicUrl = () => {
        const { data } = storage.getPublicUrl(filePath);
        setPublicUrl(data.publicUrl);
        addLog('Public URL generated', 'success');
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="filePath">File Path</Label>
                            <Input
                                id="filePath"
                                value={filePath}
                                onChange={(e) => setFilePath(e.target.value)}
                                placeholder="Enter file path"
                            />
                        </div>
                        <div className="space-x-2">
                            <Button onClick={checkFileExists}>
                                Check Existence
                            </Button>
                            <Button onClick={getMetadata}>
                                Get Metadata
                            </Button>
                            <Button onClick={getPublicUrl}>
                                Get Public URL
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {metadata && (
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-medium mb-2">File Metadata</h3>
                        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <pre className="text-sm">
                {JSON.stringify(metadata, null, 2)}
              </pre>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {publicUrl && (
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-medium mb-2">Public URL</h3>
                        <div className="break-all">
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                {publicUrl}
                            </a>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}