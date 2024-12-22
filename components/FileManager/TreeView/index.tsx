// components/FileManager/TreeView/index.tsx
import React, { useState } from 'react';
import { TreeItem } from './TreeItem';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { buildTreeData } from "./utils";

interface TreeNode {
    label: string;
    path: string;
    type: 'bucket' | 'folder' | 'file';
    children?: TreeNode[];
    bucketName: string;
}

export const TreeView: React.FC = () => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const { getAllBucketStructures } = useFileSystem();

    const structures = getAllBucketStructures();
    const treeData = buildTreeData(structures);

    const toggleNode = (path: string) => {
        const newExpanded = new Set(expandedNodes);
        if (expandedNodes.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedNodes(newExpanded);
    };

    const renderNode = (node: TreeNode, level: number = 0) => {
        const isExpanded = expandedNodes.has(node.path);

        return (
            <div key={node.path}>
                <TreeItem
                    label={node.label}
                    path={node.path}
                    level={level}
                    type={node.type}
                    isExpanded={isExpanded}
                    onToggle={() => toggleNode(node.path)}
                    bucketName={node.bucketName}
                />
                {isExpanded && node.children?.map(child => renderNode(child, level + 1))}
            </div>
        );
    };

    return (
        <div className="p-2">
            {treeData.map(node => renderNode(node))}
        </div>
    );
};