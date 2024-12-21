// components/FileManager/TreeView/utils.ts
import {BucketTreeStructure} from "@/utils/file-operations";

interface TreeNode {
    label: string;
    path: string;
    type: 'bucket' | 'folder' | 'file';
    children?: TreeNode[];
}

export const buildTreeData = (structures: Map<string, BucketTreeStructure>): TreeNode[] => {
    const treeData: TreeNode[] = [];

    // Convert bucket structures to tree nodes
    structures.forEach((structure, bucketName) => {
        const bucketNode: TreeNode = {
            label: bucketName,
            path: bucketName,
            type: 'bucket',
            children: []
        };

        // Create a map to store all nodes for easy reference
        const nodeMap = new Map<string, TreeNode>();
        nodeMap.set(bucketName, bucketNode);

        // Process each item in the bucket
        structure.contents.forEach(item => {
            const pathParts = item.path.split('/');
            let currentPath = bucketName;

            // Process each part of the path
            pathParts.forEach((part, index) => {
                const isLast = index === pathParts.length - 1;
                const fullPath = index === 0 ? part : `${currentPath}/${part}`;

                if (!nodeMap.has(fullPath)) {
                    const newNode: TreeNode = {
                        label: part,
                        path: fullPath,
                        type: isLast ? (item.type === 'FOLDER' ? 'folder' : 'file') : 'folder',
                        children: []
                    };

                    // Add to parent's children
                    const parentNode = nodeMap.get(currentPath);
                    if (parentNode) {
                        parentNode.children = parentNode.children || [];
                        parentNode.children.push(newNode);
                    }

                    nodeMap.set(fullPath, newNode);
                }

                currentPath = fullPath;
            });
        });

        treeData.push(bucketNode);
    });

    // Sort nodes recursively
    const sortNodes = (nodes: TreeNode[]) => {
        return nodes.sort((a, b) => {
            // Folders before files
            if (a.type !== 'file' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type !== 'file') return 1;
            // Alphabetical order
            return a.label.localeCompare(b.label);
        }).map(node => ({
            ...node,
            children: node.children ? sortNodes(node.children) : undefined
        }));
    };

    return sortNodes(treeData);
};