// components/storage-testing/FileOperations.tsx
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StorageClient } from '@/utils/supabase/bucket-manager';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileList } from './FileList';
import { MoveFileOperation } from './MoveFileOperation';
import { CopyFileOperation } from './CopyFileOperation';

interface FileOperationsProps {
    currentBucket: string;
    addLog: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function FileOperations({ currentBucket, addLog }: FileOperationsProps) {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const storage = new StorageClient(currentBucket);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const { data, error } = await storage.upload(file.name, file, {
                cacheControl: '3600',
                upsert: true
            });

            if (error) throw error;
            addLog(`File uploaded successfully to ${data.path}`, 'success');
        } catch (error) {
            addLog(`Upload failed: ${error.message}`, 'error');
        }
    };

    const handleOperationComplete = () => {
        setSelectedFile(null);
    };

    if (!currentBucket) {
        return (
            <Alert>
                <AlertDescription>
                    Please select a bucket first to perform file operations.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <Button onClick={() => fileInputRef.current?.click()}>
                                Upload New File
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Files in '{currentBucket}' Directory</h3>
                        </div>
                        <FileList
                            bucketName={currentBucket}
                            addLog={addLog}
                            onFileSelect={setSelectedFile}
                        />
                    </div>
                </CardContent>
            </Card>

            {selectedFile && (
                <Card>
                    <CardContent className="pt-6">
                        <Tabs defaultValue="move">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="move">Move File</TabsTrigger>
                                <TabsTrigger value="copy">Copy File</TabsTrigger>
                            </TabsList>
                            <TabsContent value="move">
                                <MoveFileOperation
                                    bucketName={currentBucket}
                                    selectedFile={selectedFile}
                                    onComplete={handleOperationComplete}
                                    addLog={addLog}
                                />
                            </TabsContent>
                            <TabsContent value="copy">
                                <CopyFileOperation
                                    bucketName={currentBucket}
                                    selectedFile={selectedFile}
                                    onComplete={handleOperationComplete}
                                    addLog={addLog}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}