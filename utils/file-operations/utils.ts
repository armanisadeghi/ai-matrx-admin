import {
    BucketStructureContent,
    BucketStructureWithNodes,
    BucketTreeStructure,
    NodeStructure
} from "@/utils/file-operations/types";
import {getFileDetails} from "@/utils/file-operations/constants";
import {getFolderDetails} from "@/utils/file-operations/constants";

const DEFAULT_HIDDEN_FILES = ["Thumbs.db", "desktop.ini", ".DS_Store", ".Spotlight-V100", ".Trashes"];
const DEFAULT_HIDDEN_PREFIXES = ["._"];
const DEFAULT_HIDDEN_FOLDERS = ['.idea', '.git', 'node_modules', 'dist', 'build', 'coverage', 'PRIVATE-USER-PERSONAL'];
const DEFAULT_MAX_FILE_SIZE = 1024 * 1024 * 50; // 50MB
const DEFAULT_DISALLOWED_FILE_TYPES = ['.exe', '.bat', '.sh'];

interface FileFilterConfig {
    hiddenFiles: Set<string>;
    hiddenFolders: Set<string>;
    hiddenPrefixes: Set<string>;
    maxFileSize: number;
    disallowedFileTypes: string[];
}

class FileNodeManager {
    private static instance: FileNodeManager;
    private config: FileFilterConfig = {
        hiddenFiles: new Set(DEFAULT_HIDDEN_FILES),
        hiddenPrefixes: new Set(DEFAULT_HIDDEN_PREFIXES),
        hiddenFolders: new Set(DEFAULT_HIDDEN_FOLDERS),
        maxFileSize: DEFAULT_MAX_FILE_SIZE,
        disallowedFileTypes: [...DEFAULT_DISALLOWED_FILE_TYPES],
    };

    private constructor() {
    }

    static getInstance(): FileNodeManager {
        if (!FileNodeManager.instance) {
            FileNodeManager.instance = new FileNodeManager();
        }
        return FileNodeManager.instance;
    }

    // Enhanced Configuration Management
    addHiddenFiles(files: string[]): void {
        files.forEach(file => this.config.hiddenFiles.add(file));
    }

    removeHiddenFiles(files: string[]): void {
        files.forEach(file => this.config.hiddenFiles.delete(file));
    }

    addHiddenPrefixes(prefixes: string[]): void {
        prefixes.forEach(prefix => this.config.hiddenPrefixes.add(prefix));
    }

    removeHiddenPrefixes(prefixes: string[]): void {
        prefixes.forEach(prefix => this.config.hiddenPrefixes.delete(prefix));
    }

    addHiddenFolders(folders: string[]): void {
        folders.forEach(folder => this.config.hiddenFolders.add(folder));
    }

    removeHiddenFolders(folders: string[]): void {
        folders.forEach(folder => this.config.hiddenFolders.delete(folder));
    }

    addDisallowedFileTypes(types: string[]): void {
        this.config.disallowedFileTypes = [...new Set([...this.config.disallowedFileTypes, ...types])];
    }

    removeDisallowedFileTypes(types: string[]): void {
        this.config.disallowedFileTypes = this.config.disallowedFileTypes
            .filter(type => !types.includes(type));
    }

    resetToDefaults(): void {
        this.config = {
            hiddenFiles: new Set(DEFAULT_HIDDEN_FILES),
            hiddenPrefixes: new Set(DEFAULT_HIDDEN_PREFIXES),
            hiddenFolders: new Set(DEFAULT_HIDDEN_FOLDERS),
            maxFileSize: DEFAULT_MAX_FILE_SIZE,
            disallowedFileTypes: [...DEFAULT_DISALLOWED_FILE_TYPES],
        };
    }

    resetHiddenFiles(): void {
        this.config.hiddenFiles = new Set(DEFAULT_HIDDEN_FILES);
    }

    resetHiddenFolders(): void {
        this.config.hiddenFolders = new Set(DEFAULT_HIDDEN_FOLDERS);
    }

    resetHiddenPrefixes(): void {
        this.config.hiddenPrefixes = new Set(DEFAULT_HIDDEN_PREFIXES);
    }

    resetDisallowedFileTypes(): void {
        this.config.disallowedFileTypes = [...DEFAULT_DISALLOWED_FILE_TYPES];
    }

    resetMaxFileSize(): void {
        this.config.maxFileSize = DEFAULT_MAX_FILE_SIZE;
    }

    // Getter method for current config (useful for UI)
    getConfig(): FileFilterConfig {
        return {
            hiddenFiles: new Set(this.config.hiddenFiles),
            hiddenPrefixes: new Set(this.config.hiddenPrefixes),
            hiddenFolders: new Set(this.config.hiddenFolders),
            maxFileSize: this.config.maxFileSize,
            disallowedFileTypes: [...this.config.disallowedFileTypes],
        };
    }

    updateMaxFileSize(size: number): void {
        this.config.maxFileSize = size;
    }

    // Processing Methods
    private shouldHideFile(name: string): boolean {
        return this.config.hiddenFiles.has(name) ||
            Array.from(this.config.hiddenPrefixes).some(prefix => name.startsWith(prefix)) ||
            this.config.disallowedFileTypes.some(type => name.toLowerCase().endsWith(type.toLowerCase()));
    }

    private shouldHideFolder(name: string): boolean {
        return this.config.hiddenFolders.has(name);
    }

    private processFiles(items: any[]): any[] {
        return items.filter(item => {
            if (item.contentType !== 'FILE') return true;
            return !this.shouldHideFile(item.name);
        });
    }

    private processFolders(items: any[]): any[] {
        return items.filter(item => {
            if (item.contentType !== 'FOLDER') return true;
            return !this.shouldHideFolder(item.name);
        });
    }

    private sortItems(items: any[]): any[] {
        return [...items].sort((a, b) => {
            if (a.contentType === 'FOLDER' && b.contentType !== 'FOLDER') return -1;
            if (a.contentType !== 'FOLDER' && b.contentType === 'FOLDER') return 1;
            return a.path.localeCompare(b.path);
        });
    }


    private buildTreeNode(bucketName: string, sortedItems: any[]): NodeStructure[] {
        const nodeMap = new Map<string, NodeStructure>();
        const rootNodes: NodeStructure[] = [];

        sortedItems.forEach(item => {
            const pathParts = item.path.split('/');
            let currentPath = '';

            pathParts.forEach((part, index) => {
                const isLast = index === pathParts.length - 1;
                const fullPath = index === 0 ? part : `${currentPath}/${part}`;

                if (!nodeMap.has(fullPath)) {
                    const newNode: NodeStructure = {
                        path: fullPath,
                        bucketName: bucketName,
                        name: part,
                        children: [],

                        ...(isLast ? {
                            type: item.type,
                            contentType: item.contentType,
                            extension: item.extension,
                            isEmpty: item.contentType === 'FILE' ? false : true,
                            ...(item.contentType === 'FILE' && {
                                details: getFileDetails(item.extension)
                            }),
                            // Preserve additional fields
                            ...(item.metadata && {metadata: item.metadata}),
                            ...(item.id && {id: item.id}),
                            ...(item.updated_at && {updated_at: item.updated_at}),
                            ...(item.created_at && {created_at: item.created_at}),
                            ...(item.last_accessed_at && {last_accessed_at: item.last_accessed_at})
                        } : {
                            type: 'FOLDER',
                            contentType: 'FOLDER',
                            extension: 'FOLDER',
                            isEmpty: true,
                            details: getFolderDetails(part)
                        })
                    };

                    const parentNode = index > 0 ? nodeMap.get(currentPath) : null;
                    if (parentNode) {
                        parentNode.children.push(newNode);
                        parentNode.isEmpty = false;
                    } else {
                        rootNodes.push(newNode);
                    }

                    nodeMap.set(fullPath, newNode);
                }

                currentPath = fullPath;
            });
        });

        nodeMap.forEach(node => {
            if (node.contentType === 'FOLDER') {
                node.isEmpty = !node.children ||
                    node.children.length === 0 ||
                    node.children.every(child =>
                        child.contentType === 'FOLDER' && child.isEmpty
                    );
            }
        });

        return rootNodes;
    }

    processCoreStructure(contents: BucketStructureContent[], bucketName: string) {
        return contents.map(item => {
            if (['emptyfolder', 'emptyfolderplaceholder', 'folder'].includes(item.type.toLowerCase())) {
                return null;
            }

            const processedItem = {
                ...item,
                bucket: bucketName,
                name: item.path.split('/').pop() || item.path,
            };

            if (item.type === 'FOLDER') {
                return {
                    ...processedItem,
                    contentType: 'FOLDER',
                    extension: 'FOLDER'
                };
            }

            return {
                ...processedItem,
                contentType: 'FILE',
                extension: item.type
            };
        })
            .filter(item => item !== null);
    }

    processBucketStructure(structure: BucketTreeStructure): BucketStructureWithNodes {
        console.log('Processing bucket structure: ', structure);
        const updatedStructure = this.processCoreStructure(structure.contents, structure.name);
        const filteredFiles = this.processFiles(updatedStructure);
        const finalFiltered = this.processFolders(filteredFiles);
        const sortedItems = this.sortItems(finalFiltered);
        const hierarchicalNodes = this.buildTreeNode(structure.name, sortedItems);

        return {
            name: structure.name,
            contents: hierarchicalNodes,
        };
    }

    processAllBucketStructures(structures: Map<string, BucketTreeStructure>): Map<string, BucketStructureWithNodes> {
        const processedStructures = new Map<string, BucketStructureWithNodes>();
        structures.forEach((structure, bucketName) => {
            const processedBucket = this.processBucketStructure(structure);
            processedStructures.set(bucketName, processedBucket);
        });

        return processedStructures;
    }
}

export const fileNodeManager = FileNodeManager.getInstance();
