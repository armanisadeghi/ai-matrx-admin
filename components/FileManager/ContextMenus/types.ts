// components/FileManager/ContextMenus/types.ts
export interface BaseContextMenuProps {
    children: React.ReactNode;
    path: string;
    bucketName: string;
}

export interface FileContextMenuProps extends BaseContextMenuProps {
    type: 'file';
}

export interface FolderContextMenuProps extends BaseContextMenuProps {
    type: 'folder';
}