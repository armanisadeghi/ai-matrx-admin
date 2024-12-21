// components/StorageExplorer/StorageExplorer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import FileTree from '@/components/DirectoryTree/new/FileTree';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    Upload,
    Download,
    Trash2,
    RefreshCw,
    Plus,
    File,
    AlertCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PathBreadcrumbs from './PathBreadcrumbs';
import { StorageItem } from '@/types/file-operations.types';

export function StorageExplorer() {
    const {
        isLoading,
        currentBucket,
        getBuckets,
        uploadFile,
        downloadFile,
        deleteFile,
        createFolder,
        renameFile,
        renameFolder,
        refreshFolderContents,
        setCurrentBucket,
        getBucketStructure,
    } = useFileSystem();

    const [buckets, setBuckets] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
    const [config, setConfig] = useState<StorageConfig>({
        filter: {
            hideHiddenFiles: true,
        },
        sorting: {
            by: 'name',
            foldersFirst: true,
        },
    });

    // Load buckets on mount
    useEffect(() => {
        const loadBuckets = async () => {
            const bucketList = await getBuckets();
            setBuckets(bucketList);
        };
        loadBuckets();
    }, []);

    const handleUpload = async (files: FileList | null) => {
        if (!files?.length || !currentBucket) return;

        for (const file of Array.from(files)) {
            const path = selectedItem?.isFolder
                ? `${selectedItem.path}/${file.name}`
                : file.name;

            await uploadFile(currentBucket, path, file);
        }

        // Refresh the current folder after upload
        if (selectedItem?.isFolder) {
            await refreshFolderContents(currentBucket, selectedItem.path);
        } else {
            await refreshFolderContents(currentBucket, '');
        }
    };

    const handleCreateFolder = async () => {
        if (!currentBucket) return;

        const name = window.prompt('Enter folder name:');
        if (!name) return;

        const path = selectedItem?.isFolder
            ? `${selectedItem.path}/${name}`
            : name;

        await createFolder(currentBucket, path);
        await refreshFolderContents(currentBucket, selectedItem?.path || '');
    };

    const handleDelete = async () => {
        if (!currentBucket || !selectedItem) return;

        if (selectedItem.isFolder) {
            // Implement folder deletion logic if needed
            // This might require additional confirmation due to being a destructive operation
            if (window.confirm(`Delete folder "${selectedItem.name}" and all its contents?`)) {
                // You might need to implement a recursive deletion in FileSystemManager
                // await deleteFolder(currentBucket, selectedItem.path);
            }
        } else {
            await deleteFile(currentBucket, selectedItem.path);
        }

        setSelectedItem(null);
        await refreshFolderContents(currentBucket, '');
    };

    const handleRename = async (newName: string) => {
        if (!currentBucket || !selectedItem) return;

        const newPath = selectedItem.path.split('/').slice(0, -1).concat(newName).join('/');

        if (selectedItem.isFolder) {
            await renameFolder(currentBucket, selectedItem.path, newPath);
        } else {
            await renameFile(currentBucket, selectedItem.path, newPath);
        }

        await refreshFolderContents(currentBucket, '');
    };

    const handleDownload = async () => {
        if (!currentBucket || !selectedItem || selectedItem.isFolder) return;

        const blob = await downloadFile(currentBucket, selectedItem.path);
        if (!blob) return;

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedItem.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleRefresh = async () => {
        if (!currentBucket) return;
        await refreshFolderContents(currentBucket, selectedItem?.path || '');
    };

    const updateConfig = (newConfig: Partial<StorageConfig>) => {
        setConfig(prev => ({
            ...prev,
            ...newConfig,
        }));
    };


    return (
        <div className="min-h-screen bg-background p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle>Storage Explorer</CardTitle>
                            <CardDescription>
                                Browse and manage your storage buckets
                            </CardDescription>
                        </div>
                        <Select
                            value={currentBucket || ''}
                            onValueChange={setCurrentBucket}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select bucket" />
                            </SelectTrigger>
                            <SelectContent>
                                {buckets.map(bucket => (
                                    <SelectItem key={bucket.name} value={bucket.name}>
                                        {bucket.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {currentBucket && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <PathBreadcrumbs
                                            path={selectedItem?.path || ''}
                                            onNavigate={(path) => {
                                                // Implement path navigation
                                            }}
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => document.getElementById('fileInput')?.click()}
                                            >
                                                <Upload className="w-4 h-4 mr-2" />
                                                Upload
                                            </Button>
                                            <input
                                                id="fileInput"
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={e => handleUpload(e.target.files)}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCreateFolder}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                New Folder
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleRefresh}
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Refresh
                                            </Button>
                                        </div>
                                    </div>

                                    <Card className="border">
                                        <ScrollArea className="h-[600px]">
                                            {isLoading ? (
                                                <div className="p-4 space-y-2">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-8 w-full" />
                                                    ))}
                                                </div>
                                            ) : (
                                                <FileTree
                                                    structure={getBucketStructure(currentBucket)}
                                                    onSelect={setSelectedItem}
                                                    config={config}
                                                />
                                            )}
                                        </ScrollArea>
                                    </Card>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Item Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedItem ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <File className="w-4 h-4" />
                                            <span className="font-medium">{selectedItem.name}</span>
                                        </div>
                                        <div className="text-sm space-y-1 text-muted-foreground">
                                            <p>Type: {getItemTypeInfo(selectedItem).category}</p>
                                            <p>Size: {selectedItem.size || 'N/A'} bytes</p>
                                            {selectedItem.updated_at && (
                                                <p>Modified: {new Date(selectedItem.updated_at).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {!selectedItem.isFolder && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleDownload}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const newName = window.prompt('New name:', selectedItem.name);
                                                if (newName) handleRename(newName);
                                            }}
                                        >
                                            Rename
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleDelete}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-4">
                                    Select an item to view details
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Show Hidden Files</span>
                                    <Switch
                                        checked={!config.filter.hideHiddenFiles}
                                        onCheckedChange={(checked) => updateConfig({
                                            filter: {
                                                ...config.filter,
                                                hideHiddenFiles: !checked
                                            }
                                        })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Folders First</span>
                                    <Switch
                                        checked={config.sorting.foldersFirst}
                                        onCheckedChange={(checked) => updateConfig({
                                            sorting: {
                                                ...config.sorting,
                                                foldersFirst: checked
                                            }
                                        })}
                                    />
                                </div>
                                <Select
                                    value={config.sorting.by}
                                    onValueChange={(value: string) => updateConfig({
                                        sorting: {
                                            ...config.sorting,
                                            by: value as any
                                        }
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">Name</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="size">Size</SelectItem>
                                        <SelectItem value="type">Type</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
