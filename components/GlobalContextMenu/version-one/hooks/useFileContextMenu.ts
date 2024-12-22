// hooks/useFileContextMenu.ts
import { useState } from 'react';
import { Copy, Download, Edit, ExternalLink, Move, Trash } from 'lucide-react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { useDialog } from '@/components/FileManager/DialogManager';
import { ContextMenuItemProps } from '../types';

export interface UseFileContextMenuProps {
    path: string;
    bucketName: string;
    onClose?: () => void;
}

export const useFileContextMenu = ({ path, bucketName, onClose }: UseFileContextMenuProps) => {
    const { downloadFile, deleteFile, getPublicUrl } = useFileSystem();
    const { openDialog } = useDialog();
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);

    const handleDownload = async () => {
        const blob = await downloadFile(bucketName, path);
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = path.split('/').pop() || 'download';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        onClose?.();
    };

    const items: ContextMenuItemProps[] = [
        {
            id: 'download',
            label: 'Download',
            icon: Download,
            onClick: handleDownload
        },
        {
            id: 'openNewTab',
            label: 'Open in new tab',
            icon: ExternalLink,
            onClick: () => window.open(getPublicUrl(bucketName, path))
        },
        {
            id: 'fileOperations',
            label: 'File Operations',
            items: [
                {
                    id: 'copy',
                    label: 'Copy to...',
                    icon: Copy,
                    onClick: () => openDialog('move', {
                        sourcePath: path,
                        type: 'file',
                        mode: 'copy',
                        bucketName
                    })
                },
                {
                    id: 'move',
                    label: 'Move to...',
                    icon: Move,
                    onClick: () => openDialog('move', {
                        sourcePath: path,
                        type: 'file',
                        mode: 'move',
                        bucketName
                    })
                },
                {
                    id: 'rename',
                    label: 'Rename',
                    icon: Edit,
                    onClick: () => openDialog('rename', {
                        path,
                        type: 'file',
                        bucketName
                    })
                }
            ]
        },
        {
            id: 'delete',
            label: 'Delete',
            icon: Trash,
            onClick: () => setShowDeleteAlert(true),
            danger: true
        }
    ];

    return {
        items,
        showDeleteAlert,
        setShowDeleteAlert,
        handleDelete: async () => {
            await deleteFile(bucketName, path);
            setShowDeleteAlert(false);
            onClose?.();
        }
    };
};