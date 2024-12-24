'use client';

import React, { useState } from 'react';
import { TreeItem } from './TreeItems';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { BucketStructureWithNodes } from "@/utils/file-operations";

export interface BaseNodeStructure {
    name: string;
    path: string;
    bucketName: string;
    contentType: 'FOLDER' | 'FILE' | 'BUCKET';
    extension: string | 'FOLDER';
    isEmpty: boolean;
    children?: BaseNodeStructure[];
    type: string | 'FOLDER';
}

export const TreeView: React.FC = () => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const { getAllBucketStructures } = useFileSystem();

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

    const createBucketNode = (bucketStructure: BucketStructureWithNodes): BaseNodeStructure => ({
        name: bucketStructure.name,
        path: bucketStructure.name,
        bucketName: bucketStructure.name,
        contentType: 'BUCKET',
        extension: 'FOLDER',
        isEmpty: bucketStructure.contents.length === 0,
        children: bucketStructure.contents,
        type: 'FOLDER'
    });

    return (
        <div className="p-2">
            {Array.from(structures.values()).map((bucketStructure: BucketStructureWithNodes) =>
                renderNode(createBucketNode(bucketStructure))
            )}
        </div>
    );
};