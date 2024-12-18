// components/storage-testing/FileList.tsx
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { StorageClient } from '@/utils/supabase/bucket-manager';

interface FileListProps {
    bucketName: string;
    addLog: (message: string, type: 'success' | 'error' | 'info') => void;
    onFileSelect?: (fileName: string) => void;
}

export function FileList({ bucketName, addLog, onFileSelect }: FileListProps) {
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const storage = new StorageClient(bucketName);

    const loadFiles = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await storage.list();
            if (error) throw error;
            setFiles(data);
            addLog('Files loaded successfully', 'success');
        } catch (error) {
            addLog(`Failed to load files: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (bucketName) {
            loadFiles();
        }
    }, [bucketName]);

    const handleDownload = async (path: string) => {
        try {
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

            addLog(`File downloaded successfully: ${path}`, 'success');
        } catch (error) {
            addLog(`Download failed: ${error.message}`, 'error');
        }
    };

    const handleDelete = async (path: string) => {
        if (!confirm(`Are you sure you want to delete ${path}?`)) return;

        try {
            const { error } = await storage.delete(path);
            if (error) throw error;
            addLog(`File deleted successfully: ${path}`, 'success');
            loadFiles();
        } catch (error) {
            addLog(`Delete failed: ${error.message}`, 'error');
        }
    };

    return (
        <div className="space-y-2">
            {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                    Loading files...
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                    No files found in the {bucketName} directory.
                </div>
            ) : (
                files.map((file) => (
                    <div
                        key={file.name}
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors"
                    >
                        <span className="font-mono truncate">{file.name}</span>
                        <div className="space-x-2 flex-shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(file.name)}
                            >
                                Download
                            </Button>
                            {onFileSelect && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onFileSelect(file.name)}
                                >
                                    Select
                                </Button>
                            )}
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(file.name)}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}