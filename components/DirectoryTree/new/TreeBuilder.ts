import {
    FileTypeInfo,
    FileCategory,
    FolderTypeInfo
} from '@/types/file-operations.types';
import {
    EnhancedDirectoryTreeConfig
} from '@/components/DirectoryTree/config';
import {StorageItem} from '@/utils/supabase/StorageBase';
import { FileTypeManager } from '@/utils/file-operations/FileTypeManager';


export interface TreeNodeData {
    item: StorageItem;
    typeInfo: FileTypeInfo | FolderTypeInfo;
    depth: number;
    isExpanded?: boolean;
    isSelected?: boolean;
    isLoading?: boolean;
    children: Map<string, TreeNodeData>;
}

export class TreeBuilder {
    private static instance: TreeBuilder;
    private fileTypeManager: FileTypeManager;

    private constructor() {
        this.fileTypeManager = FileTypeManager.getInstance();
    }

    static getInstance(): TreeBuilder {
        if (!TreeBuilder.instance) {
            TreeBuilder.instance = new TreeBuilder();
        }
        return TreeBuilder.instance;
    }

    buildTree(items: StorageItem[]): TreeNodeData[] {
        const rootNodes: TreeNodeData[] = [];
        const nodeMap = new Map<string, TreeNodeData>();

        // First pass: create all nodes
        items.forEach(item => {
            const node: TreeNodeData = {
                item,
                typeInfo: this.fileTypeManager.getItemTypeInfo(item),
                depth: item.path.length,
                children: new Map()
            };
            nodeMap.set(item.fullPath, node);

            // If it's at root level, add to rootNodes
            if (item.path.length === 0) {
                rootNodes.push(node);
            }
        });

        // Second pass: build relationships
        items.forEach(item => {
            if (item.path.length > 0) {
                const parentPath = item.path.slice(0, -1).join('/');
                const parentNode = nodeMap.get(parentPath);
                const currentNode = nodeMap.get(item.fullPath);

                if (parentNode && currentNode) {
                    parentNode.children.set(item.name, currentNode);
                }
            }
        });

        return rootNodes;
    }

    sortTree(nodes: TreeNodeData[], config: EnhancedDirectoryTreeConfig): TreeNodeData[] {
        const sorted = [...nodes].sort((a, b) => {
            if (config.sorting.foldersFirst) {
                if (a.item.isFolder !== b.item.isFolder) {
                    return a.item.isFolder ? -1 : 1;
                }
            }

            return a.item.name.localeCompare(b.item.name);
        });

        // Recursively sort children
        sorted.forEach(node => {
            if (node.children.size > 0) {
                const sortedChildren = this.sortTree(
                    Array.from(node.children.values()),
                    config
                );
                node.children = new Map(
                    sortedChildren.map(child => [child.item.name, child])
                );
            }
        });

        return sorted;
    }
}