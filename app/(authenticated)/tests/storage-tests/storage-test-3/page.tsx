'use client';

import React, {useEffect, useState} from 'react';
import {
    useStorageManager,
    useBuckets,
    useFolderNavigation,
    useCreateFolder,
    useUploadFile,
    useItemOperations
} from '@/hooks/file-operations/useStorageManagerHooks';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
    FolderIcon,
    FileIcon,
    ChevronUpIcon,
    UploadIcon,
    TrashIcon,
    FolderPlusIcon,
    CheckIcon,
    XIcon
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {toast} from '@/components/ui/use-toast';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import DebuggerConsole from "@/components/file-operations/debugger/DebuggerConsole";

const StorageExplorer = () => {
    const manager = useStorageManager();
    const {buckets, currentBucket, listBuckets, selectBucket} = useBuckets(manager);
    const {currentPath, currentItems, navigateToFolder} = useFolderNavigation(manager);
    const {createFolder} = useCreateFolder(manager);
    const {uploadFile} = useUploadFile(manager);
    const {moveItem, renameItem, copyItem, deleteItem} = useItemOperations(manager);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [bucketLoading, setBucketLoading] = useState(false);

    useEffect(() => {
        const fetchBuckets = async () => {
            setBucketLoading(true);
            try {
                await listBuckets();
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to fetch buckets',
                    variant: 'destructive',
                });
            } finally {
                setBucketLoading(false);
            }
        };
        fetchBuckets();
    }, [listBuckets]);

    const handleSelectBucket = async (bucketName: string) => {
        try {
            await selectBucket(bucketName);
            await navigateToFolder([]);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to select bucket',
                variant: 'destructive',
            });
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName) return;
        try {
            await createFolder([...currentPath, newFolderName]);
            setNewFolderName('');
            setIsCreatingFolder(false);
            await navigateToFolder(currentPath);
            toast({
                title: 'Success',
                description: 'Folder created successfully',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create folder',
                variant: 'destructive',
            });
        }
    };

    const handleUploadFile = async () => {
        if (!selectedFile) return;
        try {
            await uploadFile(selectedFile, currentPath);
            setSelectedFile(null);
            await navigateToFolder(currentPath);
            toast({
                title: 'Success',
                description: 'File uploaded successfully',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to upload file',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteItem = async (item: { name: string; fullPath: string }) => {
        try {
            await deleteItem(item.fullPath);
            await navigateToFolder(currentPath);
            toast({
                title: 'Success',
                description: 'Item deleted successfully',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete item',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Storage Explorer</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Buckets Section */}
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Buckets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px]">
                                    {bucketLoading ? (
                                        <div className="space-y-2">
                                            {[1, 2, 3].map((i) => (
                                                <Skeleton key={i} className="h-10 w-full"/>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {buckets.map((bucket) => (
                                                <Button
                                                    key={bucket.name}
                                                    variant={currentBucket?.name === bucket.name ? "secondary" : "ghost"}
                                                    className="w-full justify-start"
                                                    onClick={() => handleSelectBucket(bucket.name)}
                                                >
                                                    <FolderIcon className="mr-2 h-4 w-4"/>
                                                    {bucket.name}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Files Section */}
                        <Card className="lg:col-span-3">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-medium">Files</CardTitle>
                                    <div className="flex items-center gap-2 mt-2">
                                        {currentPath.map((folder, index) => (
                                            <React.Fragment key={folder}>
                                                {index > 0 && <span>/</span>}
                                                <Button
                                                    variant="ghost"
                                                    className="h-6 px-2"
                                                    onClick={() => navigateToFolder(currentPath.slice(0, index + 1))}
                                                >
                                                    {folder}
                                                </Button>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {isCreatingFolder ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                placeholder="Folder name"
                                                className="h-8 w-40"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={handleCreateFolder}
                                            >
                                                <CheckIcon className="h-4 w-4"/>
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                    setIsCreatingFolder(false);
                                                    setNewFolderName('');
                                                }}
                                            >
                                                <XIcon className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsCreatingFolder(true)}
                                        >
                                            <FolderPlusIcon className="mr-2 h-4 w-4"/>
                                            New Folder
                                        </Button>
                                    )}
                                    <div className="relative">
                                        <Input
                                            type="file"
                                            className="hidden"
                                            id="file-upload"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                        >
                                            <UploadIcon className="mr-2 h-4 w-4"/>
                                            Upload
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] w-full">
                                    <div className="space-y-2">
                                        {currentPath.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start"
                                                onClick={() => navigateToFolder(currentPath.slice(0, -1))}
                                            >
                                                <ChevronUpIcon className="mr-2 h-4 w-4"/>
                                                ..
                                            </Button>
                                        )}
                                        {currentItems.map((item) => (
                                            <div
                                                key={item.fullPath}
                                                className="flex items-center justify-between p-2 rounded-md hover:bg-accent group"
                                            >
                                                <Button
                                                    variant="ghost"
                                                    className="w-full justify-start"
                                                    onClick={() => {
                                                        if (item.isFolder) {
                                                            navigateToFolder([...currentPath, item.name]);
                                                        }
                                                    }}
                                                >
                                                    {item.isFolder ? (
                                                        <FolderIcon className="mr-2 h-4 w-4"/>
                                                    ) : (
                                                        <FileIcon className="mr-2 h-4 w-4"/>
                                                    )}
                                                    {item.name}
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="opacity-0 group-hover:opacity-100"
                                                        >
                                                            <TrashIcon className="h-4 w-4"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleDeleteItem(item)}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardTitle className="text-lg p-4 font-medium">Debugger Console</CardTitle>
                <CardContent>
                    <DebuggerConsole/>
                </CardContent>
            </Card>
        </div>
    );
};

export default StorageExplorer;