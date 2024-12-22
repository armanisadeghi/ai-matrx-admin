import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";
import StorageDebugger from "./StorageDebugger";
import { BucketTreeStructure } from "./types";
import LocalFileSystem from "./LocalFileSystem";

class FileSystemManager {
    private static instance: FileSystemManager;
    private supabase: SupabaseClient;
    private bucketStructures: Map<string, BucketTreeStructure>;
    private debugger: StorageDebugger;
    private localStorage: LocalFileSystem;

    private constructor() {
        this.supabase = supabase;
        this.bucketStructures = new Map();
        this.debugger = StorageDebugger.getInstance();
        this.localStorage = LocalFileSystem.getInstance();

        // Initialize sync check
        this.initializeSyncCheck();
    }

    private async initializeSyncCheck() {
        // Check for any pending operations on startup
        const pendingUploads = await this.localStorage.getPendingUploads();
        const modifiedFiles = await this.localStorage.getModifiedFiles();
        const conflicts = await this.localStorage.getConflicts();

        this.debugger.logOperation('initializeSyncCheck', {}, {
            pendingUploads: pendingUploads.length,
            modifiedFiles: modifiedFiles.length,
            conflicts: conflicts.length
        });
    }

    static getInstance(): FileSystemManager {
        if (!FileSystemManager.instance) {
            FileSystemManager.instance = new FileSystemManager();
        }
        return FileSystemManager.instance;
    }

    getLocalStorage(): LocalFileSystem {
        return this.localStorage;
    }

    async loadBucketStructure(bucketName: string, forceRefresh: boolean = false): Promise<BucketTreeStructure | null> {
        try {
            // Check local storage first if not forcing refresh
            if (!forceRefresh) {
                const localStructure = await this.localStorage.getBucketStructure(bucketName);
                if (localStructure) {
                    this.bucketStructures.set(bucketName, localStructure.structure);
                    this.debugger.logOperation('loadBucketStructure',
                        { bucketName, source: 'local' },
                        { data: localStructure }
                    );
                    return localStructure.structure;
                }
            }

            // Fetch from server
            const { data, error } = await this.supabase
                .rpc('update_bucket_tree_structure', { bucket_name: bucketName });

            if (error) throw error;

            // Update both memory and local storage
            this.bucketStructures.set(bucketName, data);
            await this.localStorage.updateBucketStructure(bucketName, data);
            await this.localStorage.updateSyncState(bucketName);

            this.debugger.logOperation('loadBucketStructure',
                { bucketName, source: 'server' },
                { data }
            );

            return data;
        } catch (error) {
            console.error(`Error loading bucket structure for ${bucketName}:`, error);
            this.debugger.logOperation('loadBucketStructure', { bucketName }, { error });
            return null;
        }
    }

    async loadAllBucketStructures(forceRefresh: boolean = false): Promise<boolean> {
        try {
            // Check local storage first if not forcing refresh
            if (!forceRefresh) {
                const localStructures = await this.localStorage.getAllBucketStructures();
                if (localStructures.length > 0) {
                    this.bucketStructures.clear();
                    localStructures.forEach(struct => {
                        this.bucketStructures.set(struct.bucketName, struct.structure);
                    });

                    this.debugger.logOperation('loadAllBucketStructures',
                        { source: 'local' },
                        { success: true, structureCount: localStructures.length }
                    );
                    return true;
                }
            }

            // Fetch from server
            const { data, error } = await this.supabase
                .rpc('update_all_bucket_structures');

            if (error) throw error;

            // Clear existing structures
            this.bucketStructures.clear();

            // Update both memory and local storage
            for (const result of data.results) {
                this.bucketStructures.set(result.bucket, result.structure);
                await this.localStorage.updateBucketStructure(result.bucket, result.structure);
                await this.localStorage.updateSyncState(result.bucket);
            }

            this.debugger.logOperation('loadAllBucketStructures',
                { source: 'server' },
                { success: true, structureCount: data.results.length }
            );

            return true;
        } catch (error) {
            console.error('Error loading all bucket structures:', error);
            this.debugger.logOperation('loadAllBucketStructures', {}, { error });
            return false;
        }
    }

    getBucketStructure(bucketName: string): BucketTreeStructure | undefined {
        return this.bucketStructures.get(bucketName);
    }

    getAllBucketStructures(): Map<string, BucketTreeStructure> {
        return new Map(this.bucketStructures);
    }

    private async updateStructureAfterFileOperation(
        bucketName: string,
        path: string,
        operation: 'add' | 'delete' | 'rename',
        fileType: string,
        newPath?: string,
        metadata?: any
    ): Promise<void> {
        const structure = this.bucketStructures.get(bucketName);
        if (!structure) return;

        switch (operation) {
            case 'add':
                structure.contents.push({
                    path,
                    type: fileType,
                    metadata: metadata || null
                });
                break;

            case 'delete':
                structure.contents = structure.contents.filter(item => item.path !== path);
                // Also remove from local storage
                await this.localStorage.deleteFile(bucketName, path);
                break;

            case 'rename':
                if (newPath) {
                    const itemIndex = structure.contents.findIndex(item => item.path === path);
                    if (itemIndex !== -1) {
                        structure.contents[itemIndex] = {
                            ...structure.contents[itemIndex],
                            path: newPath,
                            metadata: metadata || structure.contents[itemIndex].metadata
                        };
                        // Update local storage path
                        await this.localStorage.updateFilePath(bucketName, path, newPath);
                    }
                }
                break;
        }

        // Sort contents by path
        structure.contents.sort((a, b) => a.path.localeCompare(b.path));

        // Update local storage structure
        await this.localStorage.updateBucketStructure(bucketName, structure);

        this.debugger.logOperation('updateStructure',
            { bucketName, path, operation, fileType, newPath },
            { success: true, metadata }
        );
    }
    async uploadFile(bucketName: string, path: string, file: File): Promise<boolean> {
        try {
            // First, store locally with pending status
            const fileType = path.split('.').pop() || 'file';
            await this.localStorage.storeFile({
                id: `${bucketName}:${path}`,
                bucketName,
                path,
                blob: file,
                metadata: {
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                },
                version: Date.now(),
                lastModified: Date.now(),
                lastSynced: 0, // Not synced yet
                status: 'pending_upload'
            });

            // Attempt upload to Supabase
            const result = await this.supabase.storage
                .from(bucketName)
                .upload(path, file);

            if (result.error) throw result.error;

            // Get additional metadata from Supabase
            const { data: metadata } = await this.supabase.storage
                .from(bucketName)
                .getPublicUrl(path);

            // Update local file status and metadata
            await this.localStorage.updateFile({
                id: `${bucketName}:${path}`,
                status: 'synced',
                lastSynced: Date.now(),
                metadata: {
                    ...metadata,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }
            });

            // Update structure
            await this.updateStructureAfterFileOperation(bucketName, path, 'add', fileType, undefined, metadata);

            this.debugger.logOperation('uploadFile',
                { bucketName, path },
                { success: true, metadata }
            );

            return true;
        } catch (error) {
            // Mark local file as modified if upload failed
            await this.localStorage.updateFileStatus(`${bucketName}:${path}`, 'modified');

            console.error('Error uploading file:', error);
            this.debugger.logOperation('uploadFile', { bucketName, path }, { error });
            return false;
        }
    }

    async deleteFile(bucketName: string, path: string): Promise<boolean> {
        try {
            // First, mark file as pending deletion locally
            await this.localStorage.markFileForDeletion(bucketName, path);

            const result = await this.supabase.storage
                .from(bucketName)
                .remove([path]);

            if (result.error) throw result.error;

            // Remove from local storage and update structure
            await this.localStorage.deleteFile(bucketName, path);
            await this.updateStructureAfterFileOperation(bucketName, path, 'delete', '');

            this.debugger.logOperation('deleteFile',
                { bucketName, path },
                { success: true }
            );

            return true;
        } catch (error) {
            // Revert deletion mark if failed
            await this.localStorage.revertDeletion(bucketName, path);

            console.error('Error deleting file:', error);
            this.debugger.logOperation('deleteFile', { bucketName, path }, { error });
            return false;
        }
    }

    async moveFile(bucketName: string, oldPath: string, newPath: string): Promise<boolean> {
        try {
            // First, get the file from local storage
            const localFile = await this.localStorage.getFile(bucketName, oldPath);
            if (localFile) {
                // Mark as pending move
                await this.localStorage.markFileForMove(bucketName, oldPath, newPath);
            }

            const result = await this.supabase.storage
                .from(bucketName)
                .move(oldPath, newPath);

            if (result.error) throw result.error;

            // Update local storage and structure
            if (localFile) {
                await this.localStorage.moveFile(bucketName, oldPath, newPath);
            }

            await this.updateStructureAfterFileOperation(bucketName, oldPath, 'rename', '', newPath);

            this.debugger.logOperation('moveFile',
                { bucketName, oldPath, newPath },
                { success: true }
            );

            return true;
        } catch (error) {
            // Revert move operation locally if failed
            await this.localStorage.revertMove(bucketName, oldPath, newPath);

            console.error('Error moving file:', error);
            this.debugger.logOperation('moveFile', { bucketName, oldPath, newPath }, { error });
            return false;
        }
    }

    async createFolder(bucketName: string, folderPath: string): Promise<boolean> {
        try {
            // Create folder marker locally first
            await this.localStorage.createFolder(bucketName, folderPath);

            const result = await this.supabase.storage
                .from(bucketName)
                .upload(`${folderPath}/.folder`, new Blob([]));

            if (result.error) throw result.error;

            await this.updateStructureAfterFileOperation(bucketName, folderPath, 'add', 'FOLDER');

            this.debugger.logOperation('createFolder',
                { bucketName, folderPath },
                { success: true }
            );

            return true;
        } catch (error) {
            // Remove local folder marker if failed
            await this.localStorage.deleteFolder(bucketName, folderPath);

            console.error('Error creating folder:', error);
            this.debugger.logOperation('createFolder', { bucketName, folderPath }, { error });
            return false;
        }
    }

    async downloadFile(bucketName: string, filePath: string): Promise<Blob | null> {
        try {
            // Check local storage first
            const localFile = await this.localStorage.getFile(bucketName, filePath);
            if (localFile && localFile.status === 'synced') {
                this.debugger.logOperation('downloadFile',
                    { bucketName, filePath, source: 'local' },
                    { success: true, size: localFile.blob.size }
                );
                return localFile.blob;
            }

            // If not in local storage or not synced, download from Supabase
            const { data: signedUrl, error: signedUrlError } = await this.supabase.storage
                .from(bucketName)
                .createSignedUrl(filePath, 60);

            if (signedUrlError) throw signedUrlError;

            const response = await fetch(signedUrl.signedUrl);
            if (!response.ok) throw new Error('Failed to download file');

            const blob = await response.blob();

            // Store in local storage
            await this.localStorage.storeFile({
                id: `${bucketName}:${filePath}`,
                bucketName,
                path: filePath,
                blob,
                metadata: {
                    size: blob.size,
                    type: blob.type,
                    lastModified: new Date().toISOString()
                },
                version: Date.now(),
                lastModified: Date.now(),
                lastSynced: Date.now(),
                status: 'synced'
            });

            this.debugger.logOperation('downloadFile',
                { bucketName, filePath, source: 'remote' },
                { success: true, size: blob.size }
            );

            return blob;
        } catch (error) {
            console.error('Error downloading file:', error);
            this.debugger.logOperation('downloadFile', { bucketName, filePath }, { error });
            return null;
        }
    }

    async renameFile(bucketName: string, oldPath: string, newPath: string): Promise<boolean> {
        try {
            // First, get the file from local storage
            const localFile = await this.localStorage.getFile(bucketName, oldPath);
            if (localFile) {
                // Mark as pending rename
                await this.localStorage.markFileForRename(bucketName, oldPath, newPath);
            }

            const result = await this.supabase.storage
                .from(bucketName)
                .move(oldPath, newPath);

            if (result.error) throw result.error;

            // Update local storage and structure
            if (localFile) {
                await this.localStorage.renameFile(bucketName, oldPath, newPath, {
                    ...localFile,
                    path: newPath,
                    id: `${bucketName}:${newPath}`,
                    lastModified: Date.now(),
                    lastSynced: Date.now(),
                    status: 'synced'
                });
            }

            await this.updateStructureAfterFileOperation(bucketName, oldPath, 'rename', '', newPath);

            this.debugger.logOperation('renameFile',
                { bucketName, oldPath, newPath },
                { success: true }
            );
            return true;
        } catch (error) {
            // Revert rename operation locally if failed
            if (await this.localStorage.getFile(bucketName, oldPath)) {
                await this.localStorage.revertRename(bucketName, oldPath, newPath);
            }

            console.error('Error renaming file:', error);
            this.debugger.logOperation('renameFile', { bucketName, oldPath, newPath }, { error });
            return false;
        }
    }

    async copyFile(bucketName: string, sourcePath: string, destinationPath: string): Promise<boolean> {
        try {
            // First check local storage for the source file
            let fileData = await this.localStorage.getFile(bucketName, sourcePath);
            if (!fileData) {
                // If not in local storage, download from Supabase
                const downloadedData = await this.downloadFile(bucketName, sourcePath);
                if (!downloadedData) throw new Error('Failed to download source file');
                fileData = {
                    id: `${bucketName}:${sourcePath}`,
                    bucketName,
                    path: sourcePath,
                    blob: downloadedData,
                    metadata: null,
                    version: Date.now(),
                    lastModified: Date.now(),
                    lastSynced: Date.now(),
                    status: 'synced'
                };
            }

            // Store the copy in local storage with pending status
            await this.localStorage.storeFile({
                ...fileData,
                id: `${bucketName}:${destinationPath}`,
                path: destinationPath,
                status: 'pending_upload',
                lastSynced: 0
            });

            // Upload to Supabase
            const result = await this.supabase.storage
                .from(bucketName)
                .upload(destinationPath, fileData.blob);

            if (result.error) throw result.error;

            // Update local storage status
            await this.localStorage.updateFileStatus(
                `${bucketName}:${destinationPath}`,
                'synced'
            );

            const fileType = destinationPath.split('.').pop() || 'file';
            await this.updateStructureAfterFileOperation(bucketName, destinationPath, 'add', fileType);

            this.debugger.logOperation('copyFile',
                { bucketName, sourcePath, destinationPath },
                { success: true }
            );
            return true;
        } catch (error) {
            // Clean up failed copy from local storage
            await this.localStorage.deleteFile(bucketName, destinationPath);

            console.error('Error copying file:', error);
            this.debugger.logOperation('copyFile', { bucketName, sourcePath, destinationPath }, { error });
            return false;
        }
    }

    async renameFolder(bucketName: string, oldPath: string, newPath: string): Promise<boolean> {
        try {
            const structure = this.bucketStructures.get(bucketName);
            if (!structure) throw new Error('Bucket structure not found');

            // Get all items in the folder
            const itemsToMove = structure.contents.filter(item =>
                item.path.startsWith(oldPath + '/') || item.path === oldPath
            );

            // Mark all files for move in local storage
            await this.localStorage.markFolderForRename(bucketName, oldPath, newPath);

            // Move each item
            for (const item of itemsToMove) {
                const newItemPath = item.path.replace(oldPath, newPath);
                const result = await this.supabase.storage
                    .from(bucketName)
                    .move(item.path, newItemPath);

                if (result.error) throw result.error;

                // Update local storage for each file
                if (item.type !== 'FOLDER') {
                    await this.localStorage.renameFile(bucketName, item.path, newItemPath);
                }

                await this.updateStructureAfterFileOperation(bucketName, item.path, 'rename', item.type, newItemPath);
            }

            // Update folder structure in local storage
            await this.localStorage.updateFolderStructure(bucketName, oldPath, newPath);

            this.debugger.logOperation('renameFolder',
                { bucketName, oldPath, newPath },
                { success: true, itemsMoved: itemsToMove.length }
            );
            return true;
        } catch (error) {
            // Revert all moves in local storage
            await this.localStorage.revertFolderRename(bucketName, oldPath, newPath);

            console.error('Error renaming folder:', error);
            this.debugger.logOperation('renameFolder', { bucketName, oldPath, newPath }, { error });
            return false;
        }
    }

    async refreshFolderContents(bucketName: string, folderPath: string): Promise<boolean> {
        try {
            // Get local structure first
            const localStructure = await this.localStorage.getFolderContents(bucketName, folderPath);

            // Get remote structure
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .list(folderPath);

            if (error) throw error;

            // Compare and merge structures
            const structure = this.bucketStructures.get(bucketName);
            if (structure) {
                // Remove existing folder contents
                structure.contents = structure.contents.filter(item =>
                    !item.path.startsWith(folderPath + '/') && item.path !== folderPath
                );

                // Add merged contents
                const mergedContents = await this.mergeFolderContents(
                    localStructure,
                    data,
                    bucketName,
                    folderPath
                );

                structure.contents.push(...mergedContents);

                // Update local storage
                await this.localStorage.updateBucketStructure(bucketName, structure);
            }

            this.debugger.logOperation('refreshFolderContents',
                { bucketName, folderPath },
                { success: true, itemCount: data.length }
            );
            return true;
        } catch (error) {
            console.error('Error refreshing folder contents:', error);
            this.debugger.logOperation('refreshFolderContents', { bucketName, folderPath }, { error });
            return false;
        }
    }

    async getPublicUrl(bucketName: string, filePath: string): Promise<string> {
        try {
            const { data } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // Cache the URL in local storage
            await this.localStorage.cachePublicUrl(bucketName, filePath, data.publicUrl);

            this.debugger.logOperation('getPublicUrl',
                { bucketName, filePath },
                { success: true, url: data.publicUrl }
            );
            return data.publicUrl;
        } catch (error) {
            // Try to get cached URL
            try {
                const cachedUrl = await this.localStorage.getCachedPublicUrl(bucketName, filePath);
                if (cachedUrl) {
                    this.debugger.logOperation('getPublicUrl',
                        { bucketName, filePath, source: 'cache' },
                        { success: true, url: cachedUrl }
                    );
                    return cachedUrl;
                }
            } catch (cacheError) {
                console.error('Error getting cached URL:', cacheError);
            }

            console.error('Error getting public URL:', error);
            this.debugger.logOperation('getPublicUrl', { bucketName, filePath }, { error });
            return '';
        }
    }

    getPublicUrlSync(bucketName: string, filePath: string): string {
        try {
            const { data } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // Queue the cache update without waiting for it
            this.localStorage.cachePublicUrl(bucketName, filePath, data.publicUrl)
                .catch(error => console.error('Error caching URL:', error));

            this.debugger.logOperation('getPublicUrlSync',
                { bucketName, filePath },
                { success: true, url: data.publicUrl }
            );
            return data.publicUrl;
        } catch (error) {
            console.error('Error getting public URL:', error);
            this.debugger.logOperation('getPublicUrlSync', { bucketName, filePath }, { error });
            return '';
        }
    }

    async getSignedUrl(bucketName: string, filePath: string): Promise<string> {
        try {
            const { data } = await this.supabase.storage
                .from(bucketName)
                .createSignedUrl(filePath, 60);

            this.debugger.logOperation('getSignedUrl',
                { bucketName, filePath },
                { success: true, url: data.signedUrl }
            );
            return data.signedUrl;
        } catch (error) {
            console.error('Error getting signed URL:', error);
            this.debugger.logOperation('getSignedUrl', { bucketName, filePath }, { error });
            return '';
        }
    }


    async getBuckets(): Promise<any[]> {
        try {
            // Check local storage first
            const localBuckets = await this.localStorage.getBuckets();
            if (localBuckets.length > 0) {
                this.debugger.logOperation('getBuckets',
                    { source: 'local' },
                    { success: true, count: localBuckets.length }
                );
                return localBuckets;
            }

            // Fetch from Supabase if not in local storage
            const { data, error } = await this.supabase.storage.listBuckets();

            if (error) throw error;

            // Cache buckets in local storage
            await this.localStorage.storeBuckets(data);

            this.debugger.logOperation('getBuckets',
                { source: 'remote' },
                { success: true, count: data.length }
            );
            return data;
        } catch (error) {
            console.error('Error getting buckets:', error);
            this.debugger.logOperation('getBuckets', {}, { error });
            return [];
        }
    }

    private async mergeFolderContents(
        localContents: any[],
        remoteContents: any[],
        bucketName: string,
        folderPath: string
    ): Promise<any[]> {
        const mergedContents = new Map();

        // Add local contents first
        localContents.forEach(item => {
            mergedContents.set(item.path, {
                ...item,
                source: 'local'
            });
        });

        // Merge remote contents
        for (const item of remoteContents) {
            const path = folderPath ? `${folderPath}/${item.name}` : item.name;
            const existing = mergedContents.get(path);

            if (existing) {
                // Compare versions and update if needed
                if (item.metadata?.lastModified > existing.lastModified) {
                    mergedContents.set(path, {
                        ...item,
                        path,
                        type: item.metadata ? (path.split('.').pop() || 'file') : 'FOLDER',
                        source: 'remote'
                    });
                }
            } else {
                mergedContents.set(path, {
                    path,
                    type: item.metadata ? (path.split('.').pop() || 'file') : 'FOLDER',
                    metadata: item.metadata,
                    source: 'remote'
                });
            }
        }

        return Array.from(mergedContents.values());
    }

}

export default FileSystemManager;
