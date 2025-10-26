// providers/FileSystemProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToastManager } from '@/hooks/useToastManager';
import {
    FileSystemManager,
    BucketStructure,
    BucketTreeStructure,
    FileTypeDetails,
    getFileDetailsByExtension,
    isStructureWithContents, IconComponent,
    BucketStructureWithNodes, NodeStructure,
} from '@/utils/file-operations';
import {
    downloadBlob,
    fileNodeManager,
    getCreatePath,
    getFilenameFromPath,
    getParentPath
} from '@/utils/file-operations/utils';
import {FileSystemDialogProvider} from '@/components/FileManager/Dialogs/FileSystemDialogProvider';

export interface FileConfigurationMethods {
    // Add methods
    addHiddenFiles: (filenames: string[]) => void;
    addHiddenFolders: (foldernames: string[]) => void;
    addHiddenPrefixes: (prefixes: string[]) => void;
    addDisallowedFileTypes: (fileTypes: string[]) => void;

    // Remove methods
    removeHiddenFiles: (filenames: string[]) => void;
    removeHiddenFolders: (foldernames: string[]) => void;
    removeHiddenPrefixes: (prefixes: string[]) => void;
    removeDisallowedFileTypes: (fileTypes: string[]) => void;

    // Update methods
    updateMaxFileSize: (size: number) => void;

    // Reset methods
    resetToDefaults: () => void;
    resetHiddenFiles: () => void;
    resetHiddenFolders: () => void;
    resetHiddenPrefixes: () => void;
    resetDisallowedFileTypes: () => void;
    resetMaxFileSize: () => void;
}

interface FolderItem {
    path: string;
    name: string;
}

// interface StorageContextType {
//     isLoading: boolean;
//     isInitialized: boolean;
//     currentBucket: string | null;
//     currentPath: string[];
//     downloadFile: () => Promise<boolean>;
//     getPublicUrl: () => Promise<string | null>;
//     deleteFile: () => Promise<boolean>;
//     openInNewTab: () => Promise<boolean>;
//
//     moveFileToPath: (destinationPath: string) => Promise<boolean>;
//     copyFileToPath: (destinationPath: string) => Promise<boolean>;
//     getFolderStructure: () => FolderItem[];
//     getCurrentItemType: () => 'file' | 'folder';
//     renameCurrentItem: (newName: string) => Promise<boolean>;
//
//     // Core operations
//     uploadFile: (bucketName: string, path: string, file: File) => Promise<boolean | null>;
//     createFolder: (bucketName: string, path: string) => Promise<boolean | null>;
//     copyFile: (bucketName: string, sourcePath: string, destinationPath: string) => Promise<boolean | null>;
//     moveFile: (bucketName: string, oldPath: string, newPath: string) => Promise<boolean | null>;
//     renameFile: (bucketName: string, oldPath: string, newPath: string) => Promise<boolean | null>;
//     renameFolder: (bucketName: string, oldPath: string, newPath: string) => Promise<boolean | null>;
//
//     createFolderInCurrentPath: (folderName: string) => Promise<boolean>;
//
//
//     // Structure management
//     refreshBucketStructure: (bucketName: string) => Promise<BucketTreeStructure | null>;
//     refreshFolderContents: (bucketName: string, folderPath: string) => Promise<boolean | null>;
//
//     getBucketStructure: (bucketName: string) => BucketStructureWithNodes | undefined;
//     getAllBucketStructures: () => Map<string, BucketStructureWithNodes>;
//
//     // Utility methods
//     fileConfigurationMethods: FileConfigurationMethods;
//
//     getBuckets: () => Promise<any[]>;
//     setCurrentBucket: (bucketName: string) => void;
//
//     getFileDetails: (fileName: string) => FileTypeDetails;
//     getFileIcon: (fileName: string) => IconComponent;
//     getFileColor: (fileName: string) => string;
//     filterFilesByCategory: (files: BucketStructure[], category: string) => BucketStructure[];
//     filterFilesBySubCategory: (files: BucketStructure[], subCategory: string) => BucketStructure[];
//
//     setCurrentPath: (path: string[]) => void;
//     navigateToPath: (path: string | string[]) => void;
//     navigateUp: () => void;
//     getFullPath: () => string;
//
//     getSignedUrl: (bucketName: string, filePath: string) => Promise<string | null>;
//     getPublicUrlSync: (bucketName: string, filePath: string) => string;
//
//     // Missing structure operations
//     loadBucketStructure: (bucketName: string, forceRefresh?: boolean) => Promise<BucketTreeStructure | null>;
//     loadAllBucketStructures: (forceRefresh?: boolean) => Promise<boolean>;
//
//     // Missing utility methods
//     getFilesByCategory: (bucketName: string) => Record<string, BucketStructure[]>;
//
//     // Add sync status methods
//     getSyncStatus: () => Promise<{
//         pendingUploads: number;
//         modifiedFiles: number;
//         conflicts: number;
//     }>;
//     // Add force sync method
//     forceSyncBucket: (bucketName: string) => Promise<boolean>;
//
//     uploadFilesToCurrentFolder: () => Promise<boolean>;
//     refreshCurrentFolder: () => Promise<boolean>;
//
//     refreshCurrentBucket: () => Promise<boolean>;
//     uploadToBucket: () => Promise<boolean>;
//     getBucketProperties: () => Promise<void>;
//     updateBucketSettings: () => Promise<void>;
//     activeNode: NodeStructure | null;
//     navigateToNode: (node: NodeStructure | null) => void;
//     structures : Map<string, BucketStructureWithNodes>;
//     updateFolderContentsInStructure: (
//         structure: BucketStructureWithNodes,
//         folderPath: string,
//         newContents: NodeStructure[]
//     ) => BucketStructureWithNodes;
//
//     updateStructures: (bucketName: string, newStructure: BucketStructureWithNodes) => void;
//     findNodeByPath: (structure: BucketStructureWithNodes, path: string) => NodeStructure | null;
// }

const FileSystemContext = createContext(undefined);

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentBucket, setCurrentBucket] = useState<string | null>(null);
    const [currentPath, setCurrentPathState] = useState<string[]>([]);
    const [structures, setStructures] = useState<Map<string, BucketStructureWithNodes>>(new Map());
    const [activeNode, setActiveNode] = useState<NodeStructure | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const fileSystemManager = FileSystemManager.getInstance();

    const [isInitialized, setIsInitialized] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{
        pendingUploads: number;
        modifiedFiles: number;
        conflicts: number;
    }>({
        pendingUploads: 0,
        modifiedFiles: 0,
        conflicts: 0
    });


    const handlePathChange = (path: string[]) => {
        if (!currentBucket) {
            setCurrentPathState(path);
            setActiveNode(null);
            return;
        }
        navigateToPath(path);
    };



    const toast = useToastManager('storage');

    useEffect(() => {
        toast.register?.('storage', {
            success: "Storage operation completed successfully",
            error: "Storage operation failed",
            info: "Processing storage request",
            loading: "Storage operation in progress",
            warning: "Storage operation warning",
            notify: "Storage notification",
        });

        // Cleanup when component unmounts
        return () => toast.removeDefaults?.('storage');
    }, []);


    useEffect(() => {
        const checkSyncStatus = async () => {
            const status = await getSyncStatus();
            setSyncStatus(status);
        };

        const interval = setInterval(checkSyncStatus, 90000); // Check every 90 seconds
        checkSyncStatus(); // Initial check

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const initializeStorage = async () => {
            setIsLoading(true);
            try {
                await fileSystemManager.loadAllBucketStructures(true);
                const rawStructures = fileSystemManager.getAllBucketStructures();
                const processedStructures = fileNodeManager.processAllBucketStructures(rawStructures);
                setStructures(processedStructures);

                // toast.success("Storage system initialized successfully");
                setIsInitialized(true);
            } catch (error) {
                toast.error(error);
                console.error('Storage initialization error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeStorage();
    }, []);


    const processFileDetails = (structure: BucketStructure): BucketStructure => {
        if (structure.type !== 'FOLDER') {
            structure.details = getFileDetailsByExtension(structure.path);
        }
        return structure;
    };

    const withLoadingAndToast = async <T,>(
        operation: () => Promise<T>,
        successMessage: string,
        errorMessage: string
    ) => {
        return toast.loading(
            async () => {
                setIsLoading(true);
                try {
                    const result = await operation();
                    if (result && isStructureWithContents(result)) {
                        result.contents = result.contents.map(processFileDetails);
                    }
                    return result;
                } finally {
                    setIsLoading(false);
                }
            },
            {
                loading: "Processing storage request...",
                success: successMessage,
                error: errorMessage
            }
        );
    };

    const findNodeByPath = (structure: BucketStructureWithNodes, path: string) => {
        if (!path) return null;

        const findNode = (nodes: NodeStructure[]): NodeStructure | null => {
            for (const node of nodes) {
                if (node.path === path) return node;
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findNode(structure.contents);
    };

    const updateStructures = (bucketName: string, newStructure: BucketStructureWithNodes) => {
        setStructures(prev => new Map(prev).set(bucketName, newStructure));
    };


    const getAllBucketStructures = (): Map<string, BucketStructureWithNodes> => {
        if (!isInitialized) return new Map();

        if (structures.size === 0) {
            const rawStructures = fileSystemManager.getAllBucketStructures();
            const processedStructures = fileNodeManager.processAllBucketStructures(rawStructures);
            setStructures(processedStructures);
            return processedStructures;
        }

        return structures;
    };

    const getBucketStructure = (bucketName: string): BucketStructureWithNodes | undefined => {
        if (!isInitialized) return undefined;

        const structureFromState = structures.get(bucketName);
        if (structureFromState) return structureFromState;

        const rawStructure = fileSystemManager.getBucketStructure(bucketName);
        if (rawStructure) {
            const processedStructure = fileNodeManager.processBucketStructure(rawStructure);
            setStructures(prev => new Map(prev).set(bucketName, processedStructure));
            return processedStructure;
        }

        return undefined;
    };

    const refreshBucketStructure = async (bucketName: string) => {
        return withLoadingAndToast(
            async () => {
                if (!isInitialized) return undefined;
                const structure = await fileSystemManager.loadBucketStructure(bucketName);
                if (!structure || !structure.contents) return undefined;
                const processedStructure = fileNodeManager.processBucketStructure(structure);
                updateStructures(bucketName, processedStructure);
                return processedStructure;
            },
            'Bucket structure refreshed',
            'Failed to refresh bucket structure'
        );
    };

    const refreshFolderContents = async (bucketName: string, folderPath: string) => {
        return withLoadingAndToast(
            async () => {
                if (!isInitialized) return false;

                const success = await fileSystemManager.refreshFolderContents(bucketName, folderPath);
                if (!success) return false;

                const currentStructure = structures.get(bucketName);
                if (!currentStructure) return false;

                const folderContents = {
                    path: folderPath,
                    contents: currentStructure.contents.filter(item =>
                        item.path.startsWith(folderPath + '/') || item.path === folderPath
                    )
                };

                const processedContents = fileNodeManager.processFolderContents(folderContents, bucketName);
                const updatedStructure = {
                    ...currentStructure,
                    contents: currentStructure.contents.map(item => {
                        if (item.path.startsWith(folderPath + '/') || item.path === folderPath) {
                            const matchingNode = processedContents.contents.find(
                                node => node.path === item.path
                            );
                            return matchingNode || item;
                        }
                        return item;
                    })
                };

                updateStructures(bucketName, updatedStructure);
                return true;
            },
            'Folder contents refreshed',
            'Failed to refresh folder contents'
        );
    };

    const updateFolderContentsInStructure = (
        structure: BucketStructureWithNodes,
        folderPath: string,
        newContents: NodeStructure[]
    ) => {
        const updateNode = (node: NodeStructure) => {
            if (node.path === folderPath) {
                return {
                    ...node,
                    children: newContents,
                    isEmpty: newContents.length === 0
                };
            }
            if (node.children) {
                return {
                    ...node,
                    children: node.children.map(updateNode)
                };
            }
            return node;
        };

        return {
            ...structure,
            contents: structure.contents.map(updateNode)
        };
    };



    const navigateToNode = (node: NodeStructure | null) => {
        if (!node) {
            setCurrentPathState([]);
            setActiveNode(null);
            return;
        }

        const pathParts = node.path.split('/').filter(Boolean);
        setCurrentPathState(pathParts);
        setActiveNode(node);
    };

    const navigateToPath = (path: string | string[]) => {
        const pathArray = typeof path === 'string'
            ? path.split('/').filter(Boolean)
            : path;

        if (!currentBucket || !structures.has(currentBucket)) {
            setCurrentPathState(pathArray);
            setActiveNode(null);
            return;
        }

        const structure = structures.get(currentBucket)!;
        const fullPath = pathArray.join('/');
        const node = findNodeByPath(structure, fullPath);

        setCurrentPathState(pathArray);
        setActiveNode(node);
    };

    const navigateUp = () => {
        if (!currentPath.length) return;

        const newPath = currentPath.slice(0, -1);
        if (!currentBucket || !structures.has(currentBucket)) {
            setCurrentPathState(newPath);
            setActiveNode(null);
            return;
        }

        const structure = structures.get(currentBucket)!;
        const fullPath = newPath.join('/');
        const node = fullPath ? findNodeByPath(structure, fullPath) : null;

        setCurrentPathState(newPath);
        setActiveNode(node);
    };

    const handleSetCurrentBucket = (bucketName: string) => {
        setCurrentBucket(bucketName);
        setCurrentPathState([]);
        setActiveNode(null);
    };

    const updateStructureAfterOperation = async (
        operation: 'add' | 'delete' | 'rename' | 'move',
        bucketName: string,
        path: string,
        newPath?: string
    ) => {
        const structure = await refreshBucketStructure(bucketName);
        if (structure) {
            if (currentBucket === bucketName) {
                const node = findNodeByPath(structure, newPath || path);
                if (node) navigateToNode(node);
            }
        }
    };



    const getFullPath = () => {
        return currentPath.join('/');
    };

    const getFileDetails = (fileName: string): FileTypeDetails => {
        return getFileDetailsByExtension(fileName);
    };

    const getFileIcon = (fileName: string): React.ComponentType => {
        return getFileDetailsByExtension(fileName).icon;
    };

    const getFileColor = (fileName: string): string => {
        return getFileDetailsByExtension(fileName).color;
    };

    const filterFilesByCategory = (files: BucketStructure[], category: string): BucketStructure[] => {
        return files.filter(file =>
            file.details?.category === category
        );
    };

    const filterFilesBySubCategory = (files: BucketStructure[], subCategory: string): BucketStructure[] => {
        return files.filter(file =>
            file.details?.subCategory === subCategory
        );
    };

    const getFilesByCategory = (bucketName: string): Record<string, BucketStructure[]> => {
        const structure = getBucketStructure(bucketName);
        if (!structure) return {};

        return structure.contents.reduce((acc, file) => {
            if (file.type !== 'FOLDER') {
                const category = getFileDetails(file.extension).category;
                acc[category] = acc[category] || [];
                acc[category].push(file);
            }
            return acc;
        }, {} as Record<string, BucketStructure[]>);
    };

    const uploadFile = async (bucketName: string, path: string, file: File) => {
        const result = await withLoadingAndToast(
            async () => {
                const uploadResult = await fileSystemManager.uploadFile(bucketName, path, file);
                if (uploadResult) {
                    await updateStructureAfterOperation('add', bucketName, path);
                }
                return uploadResult;
            },
            `File ${file.name} uploaded successfully`,
            `Failed to upload ${file.name}`
        );
        return result;
    };


    // Download file from storage (for preview/reading)
    const downloadFile = async (bucketName: string, filePath: string): Promise<Blob | null> => {
        try {
            const blob = await fileSystemManager.downloadFile(bucketName, filePath);
            return blob;
        } catch (error) {
            console.error('Error downloading file:', error);
            return null;
        }
    };

    // Download current file and save to user's computer
    const downloadCurrentFile = async (): Promise<boolean> => {
        try {
            const blob = await withLoadingAndToast(
                () => fileSystemManager.downloadFile(currentBucket!, currentPath.join('/')),
                'File downloaded successfully',
                'Failed to download file'
            );

            if (!blob) return false;

            return downloadBlob(blob, getFilenameFromPath(currentPath));
        } catch (error) {
            console.error('Error downloading file:', error);
            return false;
        }
    };

    const createFolderInCurrentPath = async (folderName: string): Promise<boolean> => {
        if (!currentBucket || !folderName.trim()) return false;

        const newPath = getCreatePath(currentPath, folderName);

        const result = await withLoadingAndToast(
            () => fileSystemManager.createFolder(currentBucket, newPath),
            'Folder created successfully',
            'Failed to create folder'
        );

        return result !== null;
    };


    // Get public URL for a specific file
    const getPublicUrl = async (bucketName: string, filePath: string): Promise<string | null> => {
        try {
            return await fileSystemManager.getPublicUrl(bucketName, filePath);
        } catch (error) {
            console.error('Error getting public URL:', error);
            return null;
        }
    };

    // Get public URL for current file
    const getCurrentPublicUrl = async (): Promise<string | null> => {
        try {
            return await fileSystemManager.getPublicUrl(currentBucket!, currentPath.join('/'));
        } catch (error) {
            console.error('Error getting public URL:', error);
            return null;
        }
    };

    const openInNewTab = async () => {
        try {
            const url = await getCurrentPublicUrl();
            if (url) {
                window.open(url);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error opening in new tab:', error);
            return false;
        }
    };

    const deleteFile = async () => {
        return withLoadingAndToast(
            () => fileSystemManager.deleteFile(currentBucket!, currentPath.join('/')),
            'File deleted successfully',
            'Failed to delete file'
        );
    };

    const createFolder = async (bucketName: string, path: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.createFolder(bucketName, path),
            'Folder created successfully',
            'Failed to create folder'
        );
    };

    const copyFile = async (bucketName: string, sourcePath: string, destinationPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.copyFile(bucketName, sourcePath, destinationPath),
            'File copied successfully',
            'Failed to copy file'
        );
    };

    const moveFile = async (bucketName: string, oldPath: string, newPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.moveFile(bucketName, oldPath, newPath),
            'File moved successfully',
            'Failed to move file'
        );
    };

    const renameFile = async (bucketName: string, oldPath: string, newPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.renameFile(bucketName, oldPath, newPath),
            'File renamed successfully',
            'Failed to rename file'
        );
    };

    const renameFolder = async (bucketName: string, oldPath: string, newPath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.renameFolder(bucketName, oldPath, newPath),
            'Folder renamed successfully',
            'Failed to rename folder'
        );
    };

    const getCurrentItemType = (): 'file' | 'folder' => {
        if (!currentBucket || !currentPath.length) return 'file';
        const structure = getBucketStructure(currentBucket);
        if (!structure) return 'file';

        const currentItem = structure.contents.find(
            item => item.path === currentPath.join('/')
        );

        return currentItem?.type === 'FOLDER' ? 'folder' : 'file';
    };

    const renameCurrentItem = async (newName: string): Promise<boolean> => {
        if (!currentBucket || !currentPath.length) return false;

        const oldPath = currentPath.join('/');
        const parentPath = getParentPath(currentPath).join('/');
        const newPath = getCreatePath([parentPath], newName);
        const type = getCurrentItemType();

        const operation = type === 'file'
            ? () => fileSystemManager.renameFile(currentBucket!, oldPath, newPath)
            : () => fileSystemManager.renameFolder(currentBucket!, oldPath, newPath);

        const result = await withLoadingAndToast(
            operation,
            `${type === 'file' ? 'File' : 'Folder'} renamed successfully`,
            `Failed to rename ${type}`
        );

        return result !== null;
    };



    const getBuckets = async () =>
        fileSystemManager.getBuckets();

    const getSignedUrl = async (bucketName: string, filePath: string) => {
        return withLoadingAndToast(
            () => fileSystemManager.getSignedUrl(bucketName, filePath),
            'Signed URL generated successfully',
            'Failed to generate signed URL'
        );
    };

    const getPublicUrlSync = (bucketName: string, filePath: string) =>
        fileSystemManager.getPublicUrlSync(bucketName, filePath);

    const loadBucketStructure = async (bucketName: string, forceRefresh?: boolean) => {
        return withLoadingAndToast(
            () => fileSystemManager.loadBucketStructure(bucketName, forceRefresh),
            'Bucket structure loaded successfully',
            'Failed to load bucket structure'
        );
    };

    const loadAllBucketStructures = async (forceRefresh?: boolean) => {
        return withLoadingAndToast(
            () => fileSystemManager.loadAllBucketStructures(forceRefresh),
            'All bucket structures loaded successfully',
            'Failed to load bucket structures'
        );
    };

    const getSyncStatus = async () => {
        const fileSystemManager = FileSystemManager.getInstance();
        const localStorage = fileSystemManager.getLocalStorage();

        const pendingUploads = await localStorage.getPendingUploads();
        const modifiedFiles = await localStorage.getModifiedFiles();
        const conflicts = await localStorage.getConflicts();

        return {
            pendingUploads: pendingUploads.length,
            modifiedFiles: modifiedFiles.length,
            conflicts: conflicts.length
        };
    };

    const forceSyncBucket = async (bucketName: string) => {
        return withLoadingAndToast(
            async () => {
                await fileSystemManager.loadBucketStructure(bucketName, true);
                const status = await getSyncStatus();
                if (status.conflicts > 0) {
                    toast.warning(`Found ${status.conflicts} conflicts that need resolution`);
                }
                return true;
            },
            'Bucket synced successfully',
            'Failed to sync bucket'
        );
    };

    const moveFileToPath = async (destinationPath: string): Promise<boolean> => {
        if (!currentBucket || !currentPath.length) return false;

        const sourcePath = currentPath.join('/');
        const filename = getFilenameFromPath(currentPath);
        const fullDestPath = getCreatePath([destinationPath], filename);

        const result = await withLoadingAndToast(
            () => fileSystemManager.moveFile(currentBucket, sourcePath, fullDestPath),
            'File moved successfully',
            'Failed to move file'
        );

        return result !== null;
    };


    const copyFileToPath = async (destinationPath: string): Promise<boolean> => {
        if (!currentBucket || !currentPath.length) return false;

        const sourcePath = currentPath.join('/');
        const filename = getFilenameFromPath(currentPath);
        const fullDestPath = getCreatePath([destinationPath], filename);

        const result = await withLoadingAndToast(
            () => fileSystemManager.copyFile(currentBucket, sourcePath, fullDestPath),
            'File copied successfully',
            'Failed to copy file'
        );

        return result !== null;
    };

    const getFolderStructure = () => {
        if (!currentBucket) return [];

        const structure = getBucketStructure(currentBucket);
        if (!structure) return [];

        return structure.contents
            .filter(item => item.type === 'FOLDER')
            .map(folder => ({
                path: folder.path,
                name: getFilenameFromPath(folder.path)
            }))
            .sort((a, b) => a.path.localeCompare(b.path));
    };

    const uploadFilesToCurrentFolder = async (): Promise<boolean> => {
        if (!currentBucket || !currentPath) return false;

        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = async (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (!files) {
                    resolve(false);
                    return;
                }

                let success = true;
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const result = await uploadFile(
                        currentBucket!,
                        getCreatePath(currentPath, file.name),
                        file
                    );
                    if (!result) success = false;
                }

                if (success) {
                    await refreshCurrentFolder();
                }
                resolve(success);
            };
            input.click();
        });
    };

    const refreshCurrentFolder = async (): Promise<boolean> => {
        if (!currentBucket || !currentPath) return false;

        const result = await refreshFolderContents(
            currentBucket,
            currentPath.join('/')
        );

        return result !== null;
    };


    const refreshCurrentBucket = async (): Promise<boolean> => {
        if (!currentBucket) return false;
        const result = await refreshBucketStructure(currentBucket);
        return result !== null;
    };

    const uploadToBucket = async (): Promise<boolean> => {
        if (!currentBucket) return false;
        return uploadFilesToCurrentFolder();
    };

    const getBucketProperties = async (): Promise<void> => {
        toast.info("Not yet implemented... See Armani");
    };

    const updateBucketSettings = async (): Promise<void> => {
        toast.info("Not yet implemented... See Armani");
    };

    const fileConfigurationMethods: FileConfigurationMethods = {
        // Add methods
        addHiddenFiles: (filenames: string[]) => {
            fileNodeManager.addHiddenFiles(filenames);
        },

        addHiddenFolders: (foldernames: string[]) => {
            fileNodeManager.addHiddenFolders(foldernames);
        },

        addHiddenPrefixes: (prefixes: string[]) => {
            fileNodeManager.addHiddenPrefixes(prefixes);
        },

        addDisallowedFileTypes: (fileTypes: string[]) => {
            fileNodeManager.addDisallowedFileTypes(fileTypes);
        },

        // Remove methods
        removeHiddenFiles: (filenames: string[]) => {
            fileNodeManager.removeHiddenFiles(filenames);
        },

        removeHiddenFolders: (foldernames: string[]) => {
            fileNodeManager.removeHiddenFolders(foldernames);
        },

        removeHiddenPrefixes: (prefixes: string[]) => {
            fileNodeManager.removeHiddenPrefixes(prefixes);
        },

        removeDisallowedFileTypes: (fileTypes: string[]) => {
            fileNodeManager.removeDisallowedFileTypes(fileTypes);
        },

        // Update methods
        updateMaxFileSize: (size: number) => {
            fileNodeManager.updateMaxFileSize(size);
        },

        // Reset methods
        resetToDefaults: () => {
            fileNodeManager.resetToDefaults();
        },

        resetHiddenFiles: () => {
            fileNodeManager.resetHiddenFiles();
        },

        resetHiddenFolders: () => {
            fileNodeManager.resetHiddenFolders();
        },

        resetHiddenPrefixes: () => {
            fileNodeManager.resetHiddenPrefixes();
        },

        resetDisallowedFileTypes: () => {
            fileNodeManager.resetDisallowedFileTypes();
        },

        resetMaxFileSize: () => {
            fileNodeManager.resetMaxFileSize();
        }
    };

    const value = {
        isLoading,
        currentBucket,
        currentPath,
        setCurrentPath: handlePathChange,
        navigateToPath,
        navigateUp,
        getFullPath,
        setCurrentBucket: handleSetCurrentBucket,
        uploadFile,
        downloadFile,
        downloadCurrentFile,
        deleteFile,
        createFolder,
        copyFile,
        moveFile,
        renameFile,
        renameFolder,
        refreshBucketStructure,
        refreshFolderContents,
        getPublicUrl,
        getCurrentPublicUrl,
        getBucketStructure,
        getAllBucketStructures,
        getBuckets,
        getFileDetails,
        getFileIcon,
        getFileColor,
        filterFilesByCategory,
        filterFilesBySubCategory,
        getFilesByCategory,
        getSignedUrl,
        getPublicUrlSync,
        loadBucketStructure,
        loadAllBucketStructures,
        getSyncStatus,
        forceSyncBucket,
        syncStatus,
        fileConfigurationMethods,

        openInNewTab,
        createFolderInCurrentPath,
        moveFileToPath,
        copyFileToPath,
        getFolderStructure,
        getCurrentItemType,
        renameCurrentItem,
        uploadFilesToCurrentFolder,
        refreshCurrentFolder,

        refreshCurrentBucket,
        uploadToBucket,
        getBucketProperties,
        updateBucketSettings,
        isInitialized,

        activeNode,
        navigateToNode,
        structures,
        updateFolderContentsInStructure,


    };

    return (
        <FileSystemContext.Provider value={value}>
            <FileSystemDialogProvider>
                {children}
            </FileSystemDialogProvider>
        </FileSystemContext.Provider>
    );
};

export const useFileSystem = () => {
    const context = useContext(FileSystemContext);
    if (context === undefined) {
        throw new Error('useStorage must be used within a FileSystemProvider');
    }
    return context;
};

export type UseFileSystemType = ReturnType<typeof useFileSystem>;