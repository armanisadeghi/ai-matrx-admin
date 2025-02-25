import { IRepoData } from "../../types";

export type IFileNode = {
    name: string;
    isFolder: boolean;
    content?: string | null;
    children?: IFileNode[];
    matches?: boolean;
    path: string;
};

export function buildTree(repoData: IRepoData): IFileNode[] {
    const root: IFileNode[] = [];

    if (repoData?.files) {
        const sortedKeys = Object.keys(repoData.files).sort();

        sortedKeys.forEach((key) => {
            const value = repoData.files[key];
            const parts = key.split("/");
            let currentLevel = root;

            parts.forEach((part, index) => {
                if (part === "") return; // Skip empty parts (e.g., trailing slashes)

                let existingNode = currentLevel.find((node) => node.name === part);

                if (!existingNode) {
                    existingNode = {
                        name: part,
                        content: index === parts.length - 1 ? value : null,
                        isFolder: index < parts.length - 1,
                        children: index < parts.length - 1 ? [] : undefined,
                        path: key,
                    };
                    currentLevel.push(existingNode);
                }

                if (index < parts.length - 1) {
                    currentLevel = existingNode.children!;
                }
            });
        });
    }

    // Recursive function to sort each level of the tree
    const sortLevel = (level: IFileNode[]): IFileNode[] => {
        return level
            .sort((a, b) => {
                if (a.isFolder && !b.isFolder) return -1;
                if (!a.isFolder && b.isFolder) return 1;
                return a.name.localeCompare(b.name);
            })
            .map((node) => {
                if (node.children) {
                    node.children = sortLevel(node.children);
                }
                return node;
            });
    };

    // Sort the entire tree
    return sortLevel(root);
}

export const flattenTree = (nodes: IFileNode[], parentPath: string = ""): IFileNode[] => {
    return nodes.reduce((acc: IFileNode[], node) => {
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        const newNode = { ...node, path: currentPath };
        acc.push(newNode);
        if (node.children) {
            acc.push(...flattenTree(node.children, currentPath));
        }
        return acc;
    }, []);
};

export const buildSearchTree = (results: IFileNode[]): IFileNode[] => {
    const tree: IFileNode[] = [];
    const map = new Map<string, IFileNode>();

    results.forEach((node) => {
        const parts = node.path.split("/");
        let currentPath = "";
        parts.forEach((part, index) => {
            currentPath += (currentPath ? "/" : "") + part;

            if (!map.has(currentPath)) {
                const isFolder = index < parts.length - 1 || node.isFolder;
                const newNode: IFileNode = {
                    name: part,
                    isFolder: isFolder,
                    children: isFolder ? [] : undefined,
                    path: currentPath,
                    matches: currentPath === node.path,
                    content: !isFolder ? node.content : undefined,
                };
                map.set(currentPath, newNode);
                if (index === 0) {
                    tree.push(newNode);
                } else {
                    const parentPath = parts.slice(0, index).join("/");
                    const parent = map.get(parentPath);
                    if (parent && parent.children) {
                        parent.children.push(newNode);
                    }
                }
            }
        });
    });

    return tree;
};
