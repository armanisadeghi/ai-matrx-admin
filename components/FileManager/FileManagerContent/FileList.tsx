// components/FileManager/FileManagerContent/FileList.tsx
import React, {useState} from 'react';
import {FolderIcon, Eye, Download} from 'lucide-react';
import {useFileSystem} from '@/providers/FileSystemProvider';
import {BucketStructure} from '@/utils/file-operations';
import {cn} from '@/lib/utils';
import {formatFileSize} from "./utils";
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent} from '@/components/ui/dialog';
import {FilePreview} from './FilePreview';
import {FileSystemContextMenu} from '../ContextMenus/FileSystemContextMenu';


interface FileListProps {
    items: BucketStructure[];
    onSelect: (item: BucketStructure) => void;
    selectedFile: BucketStructure | null;
}

export const FileList: React.FC<FileListProps> = (
    {
        items,
        onSelect,
        selectedFile,
    }) => {
    const [previewDialogFile, setPreviewDialogFile] = useState<BucketStructure | null>(null);

    const {
        currentBucket,
        navigateToPath,
        getFileIcon,
        getFileColor,
        getFileDetails,
        downloadFile
    } = useFileSystem();


    const handleDoubleClick = async (item: BucketStructure) => {
        if (item.type === 'folder') {
            navigateToPath(item.path.split('/'));
        } else {
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

    const renderFileItem = (item: BucketStructure, index: number) => {
        const FileTypeIcon = item.type === 'folder' ? FolderIcon : getFileIcon(item.path);
        const color = item.type === 'folder' ? 'text-yellow-500' : getFileColor(item.path);
        const fileDetails = item.type !== 'folder' ? getFileDetails(item.path) : null;

        const menuData = {
            path: item.path,
            bucketName: currentBucket!,
            type: (item.type || 'file').toLowerCase()
        };

        const uniqueKey = `${currentBucket}-${item.path}-${index}`;

        return (
            <FileSystemContextMenu
                key={uniqueKey}
                type={item.type === 'folder' ? 'folder' : 'file'}
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
                            <FileTypeIcon className={cn('h-8 w-8', color)}/>
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {item.path.split('/').pop()}
                                </p>
                                {item.type !== 'folder' && item.metadata && (
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(item.metadata.size)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {item.type !== 'folder' && (
                            <div className="flex">
                                {fileDetails?.canPreview && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
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
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(item);
                                    }}
                                >
                                    <Download className="h-4 w-4"/>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </FileSystemContextMenu>
        );
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                {items.map((item, index) => renderFileItem(item, index))}
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