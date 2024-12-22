import {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from "@/utils/supabase/client";
import {Bucket, StorageItem, StorageMetadata} from '@/utils/file-operations/StorageBase';
import StorageDebugger from '@/utils/file-operations/StorageDebugger';

interface StorageResponse<T> {
    data: T | null;
    error: Error | null;
    duration: number;
    timestamp: string;
}

class StorageManager {
    private static instance: StorageManager;
    private supabase: SupabaseClient;
    private buckets: Map<string, Bucket>;
    private currentBucket: string;
    private loadingPaths: Set<string>;
    private currentPath: string[];
    private debugger: StorageDebugger;

    private constructor() {
        this.supabase = supabase;
        this.buckets = new Map();
        this.currentBucket = '';
        this.loadingPaths = new Set();
        this.currentPath = [];
        this.debugger = StorageDebugger.getInstance();
    }

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    private async loadFolderContents(bucket: Bucket, path: string[]): Promise<void> {
        const fullPath = path.join('/');
        if (this.loadingPaths.has(fullPath)) return;
        this.loadingPaths.add(fullPath);
        try {
            const { data, error } = await this.supabase.storage
                .from(bucket.name)
                .list(fullPath);
            if (error) throw error;
            if (!data) return;

            // Find the parent folder
            let parentFolder = bucket.rootItem;
            for (const segment of path) {
                const next = parentFolder.getChild(segment);
                if (next && next.isFolder) parentFolder = next;
            }

            // Clear existing children and load new contents
            parentFolder.children.clear();
            for (const item of data) {
                const newItem = new StorageItem({
                    ...item,
                    path: [...path],
                });
                parentFolder.addChild(newItem);
            }

            parentFolder.isLoaded = true;
        } finally {
            this.loadingPaths.delete(fullPath);
        }
    }

    async selectBucket(bucketName: string): Promise<void> {
        if (!this.buckets.has(bucketName)) {
            const {data: bucketData, error} = await this.supabase.storage.getBucket(bucketName);
            if (error) throw error;
            if (!bucketData) throw new Error(`Bucket ${bucketName} not found`);
            const bucket = new Bucket(bucketData);
            this.buckets.set(bucketName, bucket);
            await this.loadFolderContents(bucket, []);
        }
        this.currentBucket = bucketName;
        this.currentPath = [];
    }

    async listBuckets(): Promise<Bucket[]> {
        const {data, error} = await this.supabase.storage.listBuckets();
        if (error) throw error;
        this.buckets.clear();
        if (data) {
            data.forEach(bucketData => {
                const bucket = new Bucket(bucketData);
                this.buckets.set(bucket.name, bucket);
            });
        }
        return Array.from(this.buckets.values());
    }

    async navigateToFolder(folderPath: string[]): Promise<StorageItem[]> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');

        let currentFolder = bucket.rootItem;
        for (const segment of folderPath) {
            const nextFolder = currentFolder.getChild(segment);
            if (!nextFolder || !nextFolder.isFolder) {
                throw new Error(`Invalid path: ${folderPath.join('/')}`);
            }
            currentFolder = nextFolder;
        }

        if (!currentFolder.isLoaded) {
            await this.loadFolderContents(bucket, folderPath);
        }

        this.currentPath = folderPath;
        return Array.from(currentFolder.children.values());
    }

    async changeDirectory(folderPath: string[]): Promise<StorageItem[]> {
        return this.navigateToFolder(folderPath);
    }

    async createFolder(path: string[]): Promise<void> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');
        const folderName = path[path.length - 1];
        const parentPath = path.slice(0, -1);
        const fullPath = path.join('/');
        const emptyFile = new File([""], ".keep", {
            type: "application/x-directory"
        });
        const {error} = await this.supabase.storage
            .from(this.currentBucket)
            .upload(`${fullPath}/.keep`, emptyFile, {
                contentType: 'application/x-directory'
            });
        if (error) throw error;
        await this.loadFolderContents(bucket, parentPath);
    }

    async uploadFile(file: File, targetPath: string[], customFileName?: string): Promise<StorageItem> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');
        const fileName = customFileName || file.name;
        const fullPath = [...targetPath, fileName].join('/');
        const {data, error} = await this.supabase.storage
            .from(this.currentBucket)
            .upload(fullPath, file, {
                cacheControl: '3600',
                upsert: true
            });
        if (error) throw error;
        await this.loadFolderContents(bucket, targetPath);
        let parentFolder = bucket.rootItem;
        for (const segment of targetPath) {
            const nextFolder = parentFolder.getChild(segment);
            if (nextFolder && nextFolder.isFolder) parentFolder = nextFolder;
        }
        const newItem = parentFolder.getChild(fileName);
        if (!newItem) throw new Error('File upload succeeded but local state not updated');
        return newItem;
    }

    async moveItem(item: StorageItem, newPath: string[]): Promise<void> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');
        if (item.isFolder) {
            const allChildren = await this.getAllFolderContents(item);
            const oldPaths = allChildren.map(c => c.fullPath);
            oldPaths.push(item.fullPath);
            for (const oldFullPath of oldPaths) {
                const relative = oldFullPath.split('/').slice(item.path.length + 1);
                const newFullPath = [...newPath, item.name, ...relative].join('/');
                const {error} = await this.supabase.storage
                    .from(this.currentBucket)
                    .move(oldFullPath, newFullPath);
                if (error) throw error;
            }
        } else {
            const newFullPath = [...newPath, item.name].join('/');
            const {error} = await this.supabase.storage
                .from(this.currentBucket)
                .move(item.fullPath, newFullPath);
            if (error) throw error;
        }
        await this.loadFolderContents(bucket, item.path);
        await this.loadFolderContents(bucket, newPath);
    }

    private async getAllFolderContents(folder: StorageItem): Promise<StorageItem[]> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');
        const results: StorageItem[] = [];
        const queue: StorageItem[] = [folder];
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (!current.isLoaded) {
                await this.loadFolderContents(bucket, current.path.concat(current.name).filter(x => x));
            }
            for (const child of current.children.values()) {
                results.push(child);
                if (child.isFolder) {
                    queue.push(child);
                }
            }
        }
        return results;
    }

    private removeItemFromPath(bucket: Bucket, item: StorageItem): void {
        let parentFolder = bucket.rootItem;
        for (const segment of item.path) {
            const next = parentFolder.getChild(segment);
            if (next && next.isFolder) parentFolder = next;
        }
        parentFolder.children.delete(item.name);
    }

    async deleteItem(item: StorageItem): Promise<void> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');
        if (item.isFolder) {
            const contents = await this.getAllFolderContents(item);
            const paths = contents.map(child => child.fullPath);
            paths.push(item.fullPath);
            if (paths.length > 0) {
                const {error} = await this.supabase.storage
                    .from(this.currentBucket)
                    .remove(paths);
                if (error) throw error;
            }
        } else {
            const {error} = await this.supabase.storage
                .from(this.currentBucket)
                .remove([item.fullPath]);
            if (error) throw error;
        }
        await this.loadFolderContents(bucket, item.path.slice(0, -1));
    }

    async getPublicUrl(item: StorageItem): Promise<string> {
        if (!this.currentBucket) throw new Error('No bucket selected');
        const {data} = this.supabase.storage
            .from(this.currentBucket)
            .getPublicUrl(item.fullPath);
        return data.publicUrl;
    }

    async downloadItem(item: StorageItem): Promise<Blob> {
        if (!this.currentBucket) throw new Error('No bucket selected');
        if (item.isFolder) throw new Error('Cannot download a folder directly');
        const {data, error} = await this.supabase.storage
            .from(this.currentBucket)
            .download(item.fullPath);
        if (error) throw error;
        if (!data) throw new Error('Download failed - no data received');
        return data;
    }

    getCurrentPath(): string[] {
        return this.currentPath;
    }

    getCurrentBucket(): Bucket | undefined {
        return this.buckets.get(this.currentBucket);
    }

    getCurrentItems(): StorageItem[] {
        const bucket = this.getCurrentBucket();
        if (!bucket) return [];
        let currentFolder = bucket.rootItem;
        for (const segment of this.currentPath) {
            const nextFolder = currentFolder.getChild(segment);
            if (nextFolder && nextFolder.isFolder) currentFolder = nextFolder;
        }
        return Array.from(currentFolder.children.values());
    }

    async renameItem(item: StorageItem, newName: string): Promise<void> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');
        if (!newName || newName === item.name) return;
        const parentPath = item.path;
        const oldFullPath = item.fullPath;
        const newFullPath = [...parentPath, newName].join('/');
        const {error} = await this.supabase.storage
            .from(this.currentBucket)
            .move(oldFullPath, newFullPath);
        if (error) throw error;
        await this.loadFolderContents(bucket, parentPath);
    }

    async copyItem(item: StorageItem, destinationPath: string[]): Promise<void> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');
        if (item.isFolder) {
            const allChildren = await this.getAllFolderContents(item);
            allChildren.push(item);
            for (const child of allChildren) {
                const relative = child.fullPath.split('/').slice(item.path.length + 1);
                const newChildPath = [...destinationPath, item.name, ...relative].join('/');
                const {error} = await this.supabase.storage
                    .from(this.currentBucket)
                    .copy(child.fullPath, newChildPath);
                if (error) throw error;
            }
        } else {
            const newFullPath = [...destinationPath, item.name].join('/');
            const {error} = await this.supabase.storage
                .from(this.currentBucket)
                .copy(item.fullPath, newFullPath);
            if (error) throw error;
        }
        await this.loadFolderContents(bucket, destinationPath);
    }

    async refreshCurrentFolder(): Promise<void> {
        const bucket = this.buckets.get(this.currentBucket);
        if (!bucket) throw new Error('No bucket selected');
        await this.loadFolderContents(bucket, this.currentPath);
    }
}

export default StorageManager;
export type {Bucket, StorageItem, StorageMetadata};
