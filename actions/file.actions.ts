// actions/file.actions.ts
'use server';

import { fileHelpers } from '@/utils/fileSystemUtil';
import type { DirectoryType } from '@/utils/fileSystemTypes';

interface FileParams {
    filename: string;
    content: string | Buffer;
    directoryType: DirectoryType;
    path: string[];
    environment?: 'development' | 'production' | 'auto';
}

interface FileResult {
    success: boolean;
    filePath?: string;
    clickableLink?: string;
    error?: string;
}

/**
 * Saves text file to public directory
 */
export async function savePublicText({
    filename,
    content,
    path = ['text-files']
}: Omit<FileParams, 'directoryType' | 'environment'>): Promise<FileResult> {
    try {
        if (content instanceof Buffer) {
            return { success: false, error: 'Text content must be a string' };
        }

        const result = await fileHelpers.text.save(filename, content as string, {
            type: 'public',
            path,
            environment: 'development'
        });

        return result;
    } catch (error) {
        console.error('Error in savePublicText:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error saving text file'
        };
    }
}

/**
 * Saves image to public directory
 */
export async function savePublicImage({
    filename,
    content,
    path = ['images']
}: Omit<FileParams, 'directoryType' | 'environment'>): Promise<FileResult> {
    try {
        if (!(content instanceof Buffer)) {
            return { success: false, error: 'Image content must be a Buffer' };
        }

        const result = await fileHelpers.image.save(filename, content, {
            type: 'public',
            path,
            environment: 'development'
        });

        return result;
    } catch (error) {
        console.error('Error in savePublicImage:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error saving image'
        };
    }
}

/**
 * Generic file save with environment awareness
 */
export async function saveFile({
    filename,
    content,
    directoryType,
    path,
    environment = 'auto'
}: FileParams): Promise<FileResult> {
    try {
        const env = environment === 'auto'
            ? process.env.NODE_ENV as 'development' | 'production'
            : environment;

        const helper = content instanceof Buffer
            ? fileHelpers.image
            : fileHelpers.text;

        const result = await helper.save(filename, content as any, {
            type: directoryType,
            path,
            environment: env
        });

        return result;
    } catch (error) {
        console.error('Error in saveFile:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error saving file'
        };
    }
}

/**
 * Reads text file from public directory
 */
export async function readPublicText({
    filename,
    path = ['text-files']
}: Omit<FileParams, 'directoryType' | 'environment' | 'content'>): Promise<{
    content: string | null;
    error?: string;
}> {
    try {
        return await fileHelpers.text.read(filename, {
            type: 'public',
            path
        });
    } catch (error) {
        console.error('Error in readPublicText:', error);
        return {
            content: null,
            error: error instanceof Error ? error.message : 'Unknown error reading text file'
        };
    }
}

/**
 * Saves file to app directory
 */
export async function saveAppFile({
    filename,
    content,
    path,
    environment = 'auto'
}: Omit<FileParams, 'directoryType'>): Promise<FileResult> {
    return saveFile({
        filename,
        content,
        directoryType: 'app',
        path,
        environment
    });
}

/**
 * Reads file from app directory
 */
export async function readAppFile({
    filename,
    path,
    environment = 'auto'
}: Omit<FileParams, 'directoryType' | 'content'>): Promise<{
    content: string | null;
    error?: string;
}> {
    try {
        return await fileHelpers.text.read(filename, {
            type: 'app',
            path,
            environment
        });
    } catch (error) {
        console.error('Error in readAppFile:', error);
        return {
            content: null,
            error: error instanceof Error ? error.message : 'Unknown error reading file'
        };
    }
}

/**
 * Reads binary file from public directory
 */
export async function readPublicBinary({
    filename,
    path = ['binary']
}: Omit<FileParams, 'directoryType' | 'environment' | 'content'>): Promise<{
    content: Buffer | null;
    error?: string;
}> {
    try {
        const result = await fileHelpers.generic.read(filename, '', {
            type: 'public',
            path
        });

        if (result.error || !result.content) {
            return { content: null, error: result.error };
        }

        return {
            content: Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content)
        };
    } catch (error) {
        console.error('Error in readPublicBinary:', error);
        return {
            content: null,
            error: error instanceof Error ? error.message : 'Unknown error reading binary file'
        };
    }
}

/**
 * Get file stats (size, modified time, etc.)
 */
export async function getFileStats(
    filename: string,
    options: {
        type: DirectoryType;
        path: string[];
    }
): Promise<{
    size: number;
    mtime: Date;
    error?: string;
}> {
    try {
        const stats = await fileHelpers.stats.get(filename, options);
        return {
            size: stats.size,
            mtime: stats.mtime
        };
    } catch (error) {
        console.error('Error getting file stats:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error getting file stats');
    }
}
