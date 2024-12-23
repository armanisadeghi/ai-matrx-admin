import React, { useState } from 'react';
import { TreeItem } from './TreeItem';
import { useFileSystem } from '@/providers/FileSystemProvider';
import {BucketStructureWithNodes, FileCategory, IconComponent} from "@/utils/file-operations";

export interface FolderTypeDetails {
    icon: IconComponent;
    category: 'FOLDER';
    subCategory?: string;
    description?: string;
    color?: string;
    protected?: boolean;
}

export type FileTypeDetails = {
    category: FileCategory;
    subCategory: string;
    icon: IconComponent;
    color?: string
    canPreview?: boolean;
}

export interface BaseNodeStructure {
    name: string;
    path: string;
    bucketName: string;
    contentType: 'FOLDER' | 'FILE' | 'BUCKET';
    extension: string | 'FOLDER';
    isEmpty: boolean;
    details?: FileTypeDetails | FolderTypeDetails;
    children?: BaseNodeStructure[];
    type: string | 'FOLDER'
}

export interface TreeItemProps extends BaseNodeStructure {
    level: number;
    isExpanded: boolean;
    onToggle: () => void;
}

export const TreeView: React.FC = () => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const { getAllBucketStructures } = useFileSystem(); // Added setActiveNode

    const structures: Map<string, BucketStructureWithNodes> = getAllBucketStructures();

    const toggleNode = (path: string) => {
        const newExpanded = new Set(expandedNodes);
        if (expandedNodes.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedNodes(newExpanded);
    };

    const renderNode = (node: BaseNodeStructure, level: number = 0) => {
        const isExpanded = expandedNodes.has(node.path);

        return (
            <div key={node.path}>
                <TreeItem
                    {...node}
                    level={level}
                    isExpanded={isExpanded}
                    onToggle={() => toggleNode(node.path)}
                />
                {isExpanded && node.children?.map(child => renderNode(child, level + 1))}
            </div>
        );
    };

    return (
        <div className="p-2">
            {Array.from(structures.values()).map((bucketStructure: BucketStructureWithNodes) => (
                <div key={bucketStructure.name}>
                    {bucketStructure.contents.map((node: BaseNodeStructure) => renderNode(node))}
                </div>
            ))}
        </div>
    );
};
