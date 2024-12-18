// components/storage-testing/BulkOperations.tsx

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StorageClient } from '@/utils/supabase/bucket-manager';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkOperationsProps {
    currentBucket: string;
    addLog: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface FileUploadItem {
    file: File;
    path: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}

export default function BulkOps({ currentBucket, addLog }: BulkOperationsProps) {
    const [selectedFiles, setSelectedFiles] = useState<FileUploadItem[]>([]);
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [preserveStructure, setPreserveStructure] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const storage = new StorageClient(currentBucket);

    if (!currentBucket) {
        return (
            <Alert>
                <AlertDescription>
                    Please select a bucket first to perform bulk operations.
                </AlertDescription>
            </Alert>
        );
    }

    const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const fileItems: FileUploadItem[] = files.map(file => ({
            file,
            path: preserveStructure ? file.webkitRelativePath || file.name : file.name,
            status: 'pending',
            progress: 0
        }));
        setSelectedFiles(prev => [...prev, ...fileItems]);
    };

    const uploadFiles = async () => {
        let completed = 0;

        const updateProgress = () => {
            completed++;
            const newProgress = (completed / selectedFiles.length) * 100;
            setProgress(newProgress);
        };

        try {
            const uploads = selectedFiles.map(async (item, index) => {
                try {
                    setSelectedFiles(prev => prev.map((f, i) =>
                        i === index ? { ...f, status: 'uploading' } : f
                    ));

                    const { data, error } = await storage.upload(item.path, item.file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                    if (error) throw error;

                    setSelectedFiles(prev => prev.map((f, i) =>
                        i === index ? { ...f, status: 'success', progress: 100 } : f
                    ));

                    addLog(`Uploaded ${item.path} successfully`, 'success');
                } catch (error) {
                    setSelectedFiles(prev => prev.map((f, i) =>
                        i === index ? { ...f, status: 'error', error: error.message } : f
                    ));
                    addLog(`Failed to upload ${item.path}: ${error.message}`, 'error');
                } finally {
                    updateProgress();
                }
            });

            await Promise.all(uploads);
            addLog('Bulk upload completed', 'success');
        } catch (error) {
            addLog(`Bulk upload failed: ${error.message}`, 'error');
        }
    };

    const downloadSelected = async () => {
        try {
            const downloads = selectedPaths.map(async (path) => {
                const { data, error } = await storage.download(path);
                if (error) throw error;

                const blob = new Blob([data], { type: 'application/octet-stream' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = path.split('/').pop() || 'download';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });

            await Promise.all(downloads);
            addLog('Bulk download completed', 'success');
        } catch (error) {
            addLog(`Bulk download failed: ${error.message}`, 'error');
        }
    };

    const deleteSelected = async () => {
        try {
            const { error } = await storage.deleteMany(selectedPaths);
            if (error) throw error;

            addLog('Bulk deletion completed', 'success');
            setSelectedPaths([]);
        } catch (error) {
            addLog(`Bulk deletion failed: ${error.message}`, 'error');
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelection}
                                multiple
                                className="hidden"
                                // @ts-ignore
                                webkitdirectory={preserveStructure.toString()}
                            />
                            <Button onClick={() => fileInputRef.current?.click()}>
                                Select Files
                            </Button>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="preserveStructure"
                                    checked={preserveStructure}
                                    onCheckedChange={(checked) => setPreserveStructure(!!checked)}
                                />
                                <label htmlFor="preserveStructure">Preserve folder structure</label>
                            </div>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Upload Progress</span>
                                    <Progress value={progress} className="w-1/2" />
                                </div>
                                <Button onClick={uploadFiles}>
                                    Upload {selectedFiles.length} Files
                                </Button>
                            </div>
                        )}

                        <div className="space-y-2">
                            {selectedFiles.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded">
                                    <span className="truncate">{item.path}</span>
                                    <Badge variant={
                                        item.status === 'success' ? 'default' :
                                            item.status === 'error' ? 'destructive' :
                                                item.status === 'uploading' ? 'secondary' : 'outline'
                                    }>
                                        {item.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Bulk Actions</h3>
                        <div className="space-x-2">
                            <Button
                                variant="outline"
                                onClick={downloadSelected}
                                disabled={selectedPaths.length === 0}
                            >
                                Download Selected ({selectedPaths.length})
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={deleteSelected}
                                disabled={selectedPaths.length === 0}
                            >
                                Delete Selected
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}