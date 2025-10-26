import React, { useState, useMemo } from 'react';
import { Eye, Download } from 'lucide-react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { getFolderDetails, NodeStructure } from '@/utils/file-operations';
import { cn } from '@/lib/utils';
import { formatFileSize } from "./utils";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FilePreview } from './FilePreview';
import { FileSystemContextMenu } from '../ContextMenus/FileSystemContextMenu';
import { getFileDetails } from "@/utils/file-operations";

interface FileListProps {
    items: NodeStructure[];
    onSelect: (item: NodeStructure) => void;
    selectedFile: NodeStructure | null;
}

export const FileList: React.FC<FileListProps> = ({
    items,
    onSelect,
    selectedFile,
}) => {
    const [previewDialogFile, setPreviewDialogFile] = useState<NodeStructure | null>(null);
    const { currentBucket, navigateToPath, downloadCurrentFile } = useFileSystem();

    const enhancedItems = useMemo(() => items.map(item => ({
        ...item,
        details: item.type === 'FOLDER' ? getFolderDetails(item.name) : getFileDetails(item.extension)
    })), [items]);

    const handleDoubleClick = async (item: NodeStructure) => {
        if (item.type === 'FOLDER') {
            navigateToPath(item.path);
        } else {
            const fileDetails = getFileDetails(item.extension);
            if (fileDetails.canPreview) {
                setPreviewDialogFile(item);
            } else {
                await handleDownload(item);
            }
        }
    };

    const handleDownload = async (item: NodeStructure) => {
        try {
            await downloadCurrentFile();
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    const handlePreview = (item: NodeStructure) => {
        const fileDetails = getFileDetails(item.extension);
        if (fileDetails.canPreview) {
            setPreviewDialogFile(item);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                {enhancedItems.map((item, index) => {
                    const { details } = item;
                    const IconComponent = details.icon;
                    const menuData = {
                        path: item.path,
                        bucketName: currentBucket!,
                        type: (item.contentType || 'file').toLowerCase()
                    };

                    return (
                        <FileSystemContextMenu
                            key={`${currentBucket}-${item.path}-${index}`}
                            type={item.type === 'FOLDER' ? 'folder' : 'file'}
                            menuData={menuData}
                        >
                            <div
                                className={cn(
                                    'p-4 rounded-lg border cursor-pointer',
                                    'hover:bg-accent/50 transition-colors',
                                    selectedFile?.path === item.path && 'bg-accent border-primary'
                                )}
                                onClick={() => onSelect(item)}
                                onDoubleClick={() => handleDoubleClick(item)}
                            >
                                <div className="flex items-center justify-between space-x-2">
                                    <div className="flex items-center flex-1 min-w-0 space-x-2">
                                        <IconComponent className={cn('h-8 w-8', details.color)} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {item.path.split('/').pop()}
                                            </p>
                                            {item.type !== 'FOLDER' && item.metadata && (
                                                <p className="text-xs text-muted-foreground">
                                                    {formatFileSize(item.metadata.size)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {item.type !== 'FOLDER' && (
                                        <div className="flex">
                                            {(details as { canPreview: boolean }).canPreview && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePreview(item);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(item);
                                                }}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FileSystemContextMenu>
                    );
                })}
            </div>

            <Dialog
                open={Boolean(previewDialogFile)}
                onOpenChange={(open) => !open && setPreviewDialogFile(null)}
            >
                <DialogContent className="max-w-4xl w-full">
                    {previewDialogFile && (
                        <FilePreview file={previewDialogFile} />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};