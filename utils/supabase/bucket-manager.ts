import { supabase } from "@/utils/supabase/client";
import { StorageError, FileObject } from '@supabase/storage-js';

export type BucketOptions = {
    public: boolean;
    allowedMimeTypes?: string[] | null;
    fileSizeLimit?: string | number | null;
};

export type FileUploadOptions = {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
};

export type ListOptions = {
    limit?: number;
    offset?: number;
    sortBy?: {
        column: string;
        order: 'asc' | 'desc';
    };
    search?: string;
};

export class StorageClient {
    private bucketName: string;

    constructor(bucketName: string) {
        this.bucketName = bucketName;
    }

    async upload(path: string, file: File | ArrayBuffer, options?: FileUploadOptions) {
        return await supabase.storage
            .from(this.bucketName)
            .upload(path, file, options);
    }

    async download(path: string) {
        return await supabase.storage
            .from(this.bucketName)
            .download(path);
    }

    async delete(path: string) {
        return await supabase.storage
            .from(this.bucketName)
            .remove([path]);
    }

    async uploadMany(files: { path: string; file: File | ArrayBuffer; options?: FileUploadOptions }[]) {
        const promises = files.map(({ path, file, options }) =>
            this.upload(path, file, options)
        );
        return await Promise.all(promises);
    }

    async downloadMany(paths: string[]) {
        const promises = paths.map(path => this.download(path));
        return await Promise.all(promises);
    }

    async deleteMany(paths: string[]) {
        return await supabase.storage
            .from(this.bucketName)
            .remove(paths);
    }

    // List and search
    async list(path?: string, options?: ListOptions) {
        return await supabase.storage
            .from(this.bucketName)
            .list(path || '', options);
    }

    // File operations
    async move(fromPath: string, toPath: string) {
        return await supabase.storage
            .from(this.bucketName)
            .move(fromPath, toPath);
    }

    async copy(fromPath: string, toPath: string) {
        return await supabase.storage
            .from(this.bucketName)
            .copy(fromPath, toPath);
    }

    async update(path: string, file: File | ArrayBuffer, options?: FileUploadOptions) {
        return await supabase.storage
            .from(this.bucketName)
            .update(path, file, options);
    }

    // Utility functions
    getPublicUrl(path: string) {
        return supabase.storage
            .from(this.bucketName)
            .getPublicUrl(path);
    }

    async fileExists(path: string): Promise<boolean> {
        const { data } = await this.list(path);
        return data?.some(file => file.name === path.split('/').pop()) ?? false;
    }

    async getFileMetadata(path: string): Promise<FileObject | null> {
        const { data } = await this.list(path);
        return data?.find(file => file.name === path.split('/').pop()) ?? null;
    }

    // Static bucket operations
    static async createBucket(bucketName: string, options?: BucketOptions) {
        return await supabase.storage.createBucket(bucketName, options);
    }

    static async deleteBucket(bucketName: string) {
        return await supabase.storage.deleteBucket(bucketName);
    }

    static async listBuckets() {
        return await supabase.storage.listBuckets();
    }

    static async getBucket(bucketName: string) {
        return await supabase.storage.getBucket(bucketName);
    }
}