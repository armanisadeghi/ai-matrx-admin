// components/FileManager/FileManagerContent/FileList.tsx

import React, {useState} from 'react';
import {FolderIcon, Eye, Download} from 'lucide-react';
import {FileContextMenu} from '../ContextMenus/FileContextMenu';
import {FolderContextMenu} from '../ContextMenus/FolderContextMenu';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {BucketStructure} from '@/utils/file-operations';
import {cn} from '@/lib/utils';
import {formatFileSize} from "./utils";
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent} from '@/components/ui/dialog';
import {FilePreview} from './FilePreview';

interface FileListProps {
    items: BucketStructure[];
    onSelect: (item: BucketStructure) => void;
    selectedFile: BucketStructure | null;
    allowedFileTypes?: string[];
    maxFileSize?: number;
}

export const FileList: React.FC<FileListProps> = (
    {
        items,
        onSelect,
        selectedFile,
        allowedFileTypes,
        maxFileSize
    }) => {
    const [previewDialogFile, setPreviewDialogFile] = useState<BucketStructure | null>(null);
    const {
        currentBucket,
        navigateToPath,
        getFileIcon,
        getFileColor,
        getPublicUrl,
        getFileDetails,
        downloadFile
    } = useFileSystem();

    const isFileAllowed = (item: BucketStructure): boolean => {
        if (item.type === 'FOLDER') return true;

        const extension = item.path.split('.').pop()?.toLowerCase();
        const isTypeAllowed = !allowedFileTypes?.length ||
            (extension && allowedFileTypes.includes(`.${extension}`));

        const isSizeAllowed = !maxFileSize ||
            (item.metadata?.size && item.metadata.size <= maxFileSize);

        return isTypeAllowed && isSizeAllowed;
    };


    const sortedItems = [...items].sort((a, b) => {
        if (a.type === 'FOLDER' && b.type !== 'FOLDER') return -1;
        if (a.type !== 'FOLDER' && b.type === 'FOLDER') return 1;
        return a.path.localeCompare(b.path);
    });

    const handleDoubleClick = async (item: BucketStructure) => {
        if (item.type === 'FOLDER') {
            navigateToPath(item.path.split('/'));
        } else if (isFileAllowed(item)) {
            // Only handle file actions if the file is allowed
            const fileDetails = getFileDetails(item.path);
            if (fileDetails.canPreview) {
                setPreviewDialogFile(item);
            } else {
                await handleDownload(item);
            }
        }
    };

    const handleDownload = async (item: BucketStructure) => {
        try {
            await downloadFile(currentBucket!, item.path);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    const handlePreview = (item: BucketStructure) => {
        const fileDetails = getFileDetails(item.path);
        if (fileDetails.canPreview) {
            setPreviewDialogFile(item);
        }
    };

    const renderFileItem = (item: BucketStructure) => {
        const FileTypeIcon = item.type === 'FOLDER' ? FolderIcon : getFileIcon(item.path);
        const color = item.type === 'FOLDER' ? 'text-yellow-500' : getFileColor(item.path);
        const fileDetails = item.type !== 'FOLDER' ? getFileDetails(item.path) : null;
        const isAllowed = isFileAllowed(item);

        return (
            <div
                className={cn(
                    'p-4 rounded-lg border cursor-pointer',
                    'hover:bg-accent/50 transition-colors',
                    selectedFile?.path === item.path && 'bg-accent border-primary',
                    !isAllowed && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => isAllowed && onSelect(item)}
                onDoubleClick={() => isAllowed && handleDoubleClick(item)}
            >
                <div className="flex items-center space-x-3">
                    <FileTypeIcon className={cn('h-8 w-8', color)}/>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {item.path.split('/').pop()}
                        </p>
                        {item.type !== 'FOLDER' && item.metadata && (
                            <p className="text-xs text-muted-foreground">
                                {formatFileSize(item.metadata.size)}
                            </p>
                        )}
                    </div>
                    {item.type !== 'FOLDER' && isAllowed && ( // Changed from !isAllowed to isAllowed
                        <div className="flex space-x-2">
                            {fileDetails?.canPreview && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePreview(item);
                                    }}
                                >
                                    <Eye className="h-4 w-4"/>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(item);
                                }}
                            >
                                <Download className="h-4 w-4"/>
                            </Button>
                        </div>
                    )}

                    // Add error message for non-allowed files
                    {item.type !== 'FOLDER' && !isAllowed && (
                        <p className="text-xs text-destructive mt-1">
                            {!allowedFileTypes?.includes(`.${item.path.split('.').pop()?.toLowerCase()}`) &&
                                'This file type is not available for preview here'}
                            {maxFileSize && item.metadata?.size && item.metadata.size > maxFileSize &&
                                `File size exceeds limit of ${formatFileSize(maxFileSize)}`}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedItems.map((item) => (
                    item.type === 'FOLDER' ? (
                        <FolderContextMenu
                            key={item.path}
                            path={item.path}
                            bucketName={currentBucket!}
                            type="folder"
                        >
                            {renderFileItem(item)}
                        </FolderContextMenu>
                    ) : (
                        <FileContextMenu
                            key={item.path}
                            path={item.path}
                            bucketName={currentBucket!}
                            type="file"
                        >
                            {renderFileItem(item)}
                        </FileContextMenu>
                    )
                ))}
            </div>

            <Dialog
                open={Boolean(previewDialogFile)}
                onOpenChange={(open) => !open && setPreviewDialogFile(null)}
            >
                <DialogContent className="max-w-4xl w-full">
                    {previewDialogFile && (
                        <FilePreview file={previewDialogFile}/>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};