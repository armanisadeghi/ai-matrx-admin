import {SupabaseClient} from "@supabase/supabase-js";
import StorageDebugger from "@/utils/supabase/StorageDebugger";
import { supabase } from "./client";
import {Bucket, StorageItem, StorageMetadata} from './StorageBase';

interface BucketStructure {
    path: string;
    type: string;
}

interface BucketTreeStructure {
    name: string;
    contents: BucketStructure[];
}

class FileSystemManager {
    private static instance: FileSystemManager;
    private supabase: SupabaseClient;
    private bucketStructures: Map<string, BucketTreeStructure>;
    private debugger: StorageDebugger;

    private constructor() {
        this.supabase = supabase;
        this.bucketStructures = new Map();
        this.debugger = StorageDebugger.getInstance();
    }

    static getInstance(): FileSystemManager {
        if (!FileSystemManager.instance) {
            FileSystemManager.instance = new FileSystemManager();
        }
        return FileSystemManager.instance;
    }

    async loadBucketStructure(bucketName: string): Promise<BucketTreeStructure | null> {
        try {
            const { data, error } = await this.supabase
                .rpc('update_bucket_tree_structure', { bucket_name: bucketName });

            if (error) throw error;

            this.bucketStructures.set(bucketName, data);

            this.debugger.logOperation('loadBucketStructure', { bucketName }, { data });

            return data;
        } catch (error) {
            console.error(`Error loading bucket structure for ${bucketName}:`, error);

            this.debugger.logOperation('loadBucketStructure', { bucketName }, { error });

            return null;
        }
    }

    async loadAllBucketStructures(): Promise<boolean> {
        try {
            const { data, error } = await this.supabase
                .rpc('update_all_bucket_structures');

            if (error) throw error;

            // Clear existing structures
            this.bucketStructures.clear();

            // Store new structures
            data.results.forEach((result: any) => {
                this.bucketStructures.set(result.bucket, result.structure);
            });

            this.debugger.logOperation('loadAllBucketStructures', {}, { success: true });

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

    // Update structure after file operations
    private updateStructureAfterFileOperation(
        bucketName: string,
        path: string,
        operation: 'add' | 'delete' | 'rename',
        fileType: string,
        newPath?: string
    ): void {
        const structure = this.bucketStructures.get(bucketName);
        if (!structure) return;

        switch (operation) {
            case 'add':
                structure.contents.push({ path, type: fileType });
                break;

            case 'delete':
                structure.contents = structure.contents.filter(item => item.path !== path);
                break;

            case 'rename':
                if (newPath) {
                    const itemIndex = structure.contents.findIndex(item => item.path === path);
                    if (itemIndex !== -1) {
                        structure.contents[itemIndex].path = newPath;
                    }
                }
                break;
        }

        // Sort contents by path
        structure.contents.sort((a, b) => a.path.localeCompare(b.path));
    }

    // Helper methods for common operations
    async uploadFile(bucketName: string, path: string, file: File): Promise<boolean> {
        try {
            const result = await this.supabase.storage
                .from(bucketName)
                .upload(path, file);

            if (result.error) throw result.error;

            // Update structure
            const fileType = path.split('.').pop() || 'file';
            this.updateStructureAfterFileOperation(bucketName, path, 'add', fileType);

            this.debugger.logOperation('uploadFile', { bucketName, path }, { success: true });

            return true;
        } catch (error) {
            console.error('Error uploading file:', error);

            this.debugger.logOperation('uploadFile', { bucketName, path }, { error });

            return false;
        }
    }

    async deleteFile(bucketName: string, path: string): Promise<boolean> {
        try {
            const result = await this.supabase.storage
                .from(bucketName)
                .remove([path]);

            if (result.error) throw result.error;

            this.updateStructureAfterFileOperation(bucketName, path, 'delete', '');

            this.debugger.logOperation('deleteFile', { bucketName, path }, { success: true });

            return true;
        } catch (error) {
            console.error('Error deleting file:', error);

            this.debugger.logOperation('deleteFile', { bucketName, path }, { error });

            return false;
        }
    }

    async moveFile(bucketName: string, oldPath: string, newPath: string): Promise<boolean> {
        try {
            const result = await this.supabase.storage
                .from(bucketName)
                .move(oldPath, newPath);

            if (result.error) throw result.error;
            this.updateStructureAfterFileOperation(bucketName, oldPath, 'rename', '', newPath);

            // Debugger Trigger
            this.debugger.logOperation(
                'moveFile',
                { bucketName, oldPath, newPath },
                { success: true }
            );

            return true;
        } catch (error) {
            console.error('Error moving file:', error);
            this.debugger.logOperation('moveFile', { bucketName, oldPath, newPath }, { error });

            return false;
        }
    }


    // Create folder
    async createFolder(bucketName: string, folderPath: string): Promise<boolean> {
        try {
            const result = await this.supabase.storage
                .from(bucketName)
                .upload(`${folderPath}/.folder`, new Blob([]));

            if (result.error) throw result.error;
            this.updateStructureAfterFileOperation(bucketName, folderPath, 'add', 'FOLDER');
            this.debugger.logOperation('createFolder', { bucketName, folderPath }, { success: true });

            return true;
        } catch (error) {
            console.error('Error creating folder:', error);
            this.debugger.logOperation('createFolder', { bucketName, folderPath }, { error });

            return false;
        }
    }
    // Download file
    async downloadFile(bucketName: string, filePath: string): Promise<Blob | null> {
        try {
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .download(filePath);

            if (error) throw error;

            this.debugger.logOperation('downloadFile', { bucketName, filePath }, { success: true });
            return data;
        } catch (error) {
            console.error('Error downloading file:', error);
            this.debugger.logOperation('downloadFile', { bucketName, filePath }, { error });
            return null;
        }
    }

    // Rename file
    async renameFile(bucketName: string, oldPath: string, newPath: string): Promise<boolean> {
        try {
            const result = await this.supabase.storage
                .from(bucketName)
                .move(oldPath, newPath);

            if (result.error) throw result.error;

            this.updateStructureAfterFileOperation(bucketName, oldPath, 'rename', '', newPath);
            this.debugger.logOperation('renameFile', { bucketName, oldPath, newPath }, { success: true });
            return true;
        } catch (error) {
            console.error('Error renaming file:', error);
            this.debugger.logOperation('renameFile', { bucketName, oldPath, newPath }, { error });
            return false;
        }
    }

    // Copy file
    async copyFile(bucketName: string, sourcePath: string, destinationPath: string): Promise<boolean> {
        try {
            // First download the file
            const fileData = await this.downloadFile(bucketName, sourcePath);
            if (!fileData) throw new Error('Failed to download source file');

            // Then upload it to the new location
            const result = await this.supabase.storage
                .from(bucketName)
                .upload(destinationPath, fileData);

            if (result.error) throw result.error;

            const fileType = destinationPath.split('.').pop() || 'file';
            this.updateStructureAfterFileOperation(bucketName, destinationPath, 'add', fileType);
            this.debugger.logOperation('copyFile', { bucketName, sourcePath, destinationPath }, { success: true });
            return true;
        } catch (error) {
            console.error('Error copying file:', error);
            this.debugger.logOperation('copyFile', { bucketName, sourcePath, destinationPath }, { error });
            return false;
        }
    }

    // Rename folder
    async renameFolder(bucketName: string, oldPath: string, newPath: string): Promise<boolean> {
        try {
            const structure = this.bucketStructures.get(bucketName);
            if (!structure) throw new Error('Bucket structure not found');

            // Get all items in the folder
            const itemsToMove = structure.contents.filter(item =>
                item.path.startsWith(oldPath + '/') || item.path === oldPath
            );

            // Move each item
            for (const item of itemsToMove) {
                const newItemPath = item.path.replace(oldPath, newPath);
                const result = await this.supabase.storage
                    .from(bucketName)
                    .move(item.path, newItemPath);

                if (result.error) throw result.error;
                this.updateStructureAfterFileOperation(bucketName, item.path, 'rename', item.type, newItemPath);
            }

            this.debugger.logOperation('renameFolder', { bucketName, oldPath, newPath }, { success: true });
            return true;
        } catch (error) {
            console.error('Error renaming folder:', error);
            this.debugger.logOperation('renameFolder', { bucketName, oldPath, newPath }, { error });
            return false;
        }
    }

    // Refresh folder contents
    async refreshFolderContents(bucketName: string, folderPath: string): Promise<boolean> {
        try {
            const { data, error } = await this.supabase.storage
                .from(bucketName)
                .list(folderPath);

            if (error) throw error;

            // Update structure for this folder
            const structure = this.bucketStructures.get(bucketName);
            if (structure) {
                // Remove existing folder contents
                structure.contents = structure.contents.filter(item =>
                    !item.path.startsWith(folderPath + '/') && item.path !== folderPath
                );

                // Add new contents
                data.forEach(item => {
                    const path = folderPath ? `${folderPath}/${item.name}` : item.name;
                    const type = item.metadata ? (path.split('.').pop() || 'file') : 'FOLDER';
                    structure.contents.push({ path, type });
                });
            }

            this.debugger.logOperation('refreshFolderContents', { bucketName, folderPath }, { success: true });
            return true;
        } catch (error) {
            console.error('Error refreshing folder contents:', error);
            this.debugger.logOperation('refreshFolderContents', { bucketName, folderPath }, { error });
            return false;
        }
    }

    // Get public URL
    getPublicUrl(bucketName: string, filePath: string): string {
        try {
            const { data } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            this.debugger.logOperation('getPublicUrl', { bucketName, filePath }, { success: true });
            return data.publicUrl;
        } catch (error) {
            console.error('Error getting public URL:', error);
            this.debugger.logOperation('getPublicUrl', { bucketName, filePath }, { error });
            return '';
        }
    }

    async getBuckets(): Promise<any[]> {
        try {
            const { data, error } = await this.supabase.storage.listBuckets();

            if (error) throw error;

            this.debugger.logOperation('getBuckets', {}, { success: true });
            return data;
        } catch (error) {
            console.error('Error getting buckets:', error);
            this.debugger.logOperation('getBuckets', {}, { error });
            return [];
        }
    }

}

export default FileSystemManager;
export type {Bucket, StorageItem, StorageMetadata, BucketStructure, BucketTreeStructure};
