// actions/json.actions.ts
'use server';

import { DirectoryType, fileHelpers } from '@/utils/fileSystemUtil';
import { printLink } from '@/utils/printLink';

interface JsonFileParams {
    filename: string;
    jsonData: any;
    directoryType: DirectoryType;
    path: string[];
    environment?: 'development' | 'production' | 'auto';
}

interface JsonFileResult {
    success: boolean;
    filePath?: string;
    clickableLink?: string;
    error?: string;
}

/**
 * Save JSON to a public directory
 */
export async function savePublicJson({
    filename,
    jsonData,
    path = ['json-exports']
}: Omit<JsonFileParams, 'directoryType' | 'environment'>): Promise<JsonFileResult> {
    try {
        const result = await fileHelpers.json.save(filename, jsonData, {
            type: 'public',
            path,
            environment: 'development'
        });

        if (!result.success) {
            return result;
        }

        return {
            success: true,
            filePath: result.filePath,
            clickableLink: result.clickableLink
        };
    } catch (error) {
        console.error('Error in savePublicJson:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error saving JSON'
        };
    }
}

/**
 * Save JSON to any directory with environment awareness
 */
export async function saveJson({
    filename,
    jsonData,
    directoryType,
    path,
    environment = 'auto'
}: JsonFileParams): Promise<JsonFileResult> {
    try {
        const env = environment === 'auto'
            ? process.env.NODE_ENVIRON as 'development' | 'production'
            : environment;

        const result = await fileHelpers.json.save(filename, jsonData, {
            type: directoryType,
            path,
            environment: env
        });

        if (!result.success) {
            return result;
        }

        return {
            success: true,
            filePath: result.filePath,
            clickableLink: result.clickableLink
        };
    } catch (error) {
        console.error('Error in saveJson:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error saving JSON'
        };
    }
}

/**
 * Save JSON specifically to the app directory
 */
export async function saveAppJson({
    filename,
    jsonData,
    path,
    environment = 'auto'
}: Omit<JsonFileParams, 'directoryType'>): Promise<JsonFileResult> {
    return saveJson({
        filename,
        jsonData,
        directoryType: 'app',
        path,
        environment
    });
}

/**
 * Read JSON from any directory
 */
export async function readJson<T>({
    filename,
    directoryType,
    path,
    environment = 'auto'
}: Omit<JsonFileParams, 'jsonData'>): Promise<{ data: T | null, error?: string }> {
    try {
        return await fileHelpers.json.read<T>(filename, {
            type: directoryType,
            path,
            environment
        });
    } catch (error) {
        console.error('Error in readJson:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error reading JSON'
        };
    }
}

/**
 * Read JSON from public directory
 */
export async function readPublicJson<T>({
    filename,
    path = ['json-exports']
}: Pick<JsonFileParams, 'filename' | 'path'>): Promise<{ data: T | null, error?: string }> {
    return readJson<T>({
        filename,
        directoryType: 'public',
        path,
        environment: 'development'
    });
}

/**
 * Read JSON from app directory
 */
export async function readAppJson<T>({
    filename,
    path,
    environment = 'auto'
}: Omit<JsonFileParams, 'directoryType' | 'jsonData'>): Promise<{ data: T | null, error?: string }> {
    return readJson<T>({
        filename,
        directoryType: 'app',
        path,
        environment
    });
}
