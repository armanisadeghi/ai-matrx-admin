'use client';

import React from 'react';
import TreeItemFile from "@/components/FileManager/TreeView/TreeItemFile";
import TreeItemFolder from "@/components/FileManager/TreeView/TreeitemFolder";
import TreeBucketItem from "@/components/FileManager/TreeView/TreeItemBucket";

interface BaseTreeItemProps {
    name: string;
    path: string;
    level: number;
    contentType: 'BUCKET' | 'FOLDER' | 'FILE';
    extension: string;
    isEmpty: boolean;
    bucketName: string;
    isExpanded?: boolean;
    onToggle?: () => void;
}

export const TreeItem: React.FC<BaseTreeItemProps> = (props) => {
    switch (props.contentType) {
        case 'FILE':
            return <TreeItemFile {...props} />;
        case 'FOLDER':
            return <TreeItemFolder {...props} />;
        case 'BUCKET':
            return <TreeBucketItem {...props} />;
        default:
            return null;
    }
};