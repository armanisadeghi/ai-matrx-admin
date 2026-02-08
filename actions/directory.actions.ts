// actions/directory.actions.ts
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import {
    findTargetDirectory,
    fileHelpers,
    type DirectoryType
} from '@/utils/fileSystemUtil';

interface DirectoryStructure {
    [key: string]: DirectoryStructure | null;
}

interface DirectoryResponse {
    success: boolean;
    structure?: DirectoryStructure;
    error?: string;
    timestamp?: number;
}

const CACHE_FILE = 'directory-structure.json';
const IGNORED_PATTERNS = [
    // Development directories
    '.git',
    'node_modules',
    '.next',
    'out',
    'build',
    'dist',

    // System directories
    '$RECYCLE.BIN',
    'System Volume Information',
    'Recovery',

    // Hidden directories
    '.*',  // Any directory starting with .

    // Package manager directories
    'bower_components',

    // IDE directories
    '.idea',
    '.vscode',
    '.env',
    '.env.local',
    '.env.development',
    '.gitignore',
    '.npmrc',
    'ai-matrx-admin.code-workspace',
    '.eslintrc.json',
    'build-and-push.ps1',
    '.history',

    // Build output
    'coverage',
    '.nyc_output'
];

async function buildDirectoryStructure(
    targetPath: string[],
    depth: number = 0,
    maxDepth: number = 5
): Promise<DirectoryStructure> {
    if (depth > maxDepth) return {};

    try {
        // Use our existing utility to get the correct directory path
        const fullTargetPath = await findTargetDirectory(targetPath);
        const entries = await fs.readdir(fullTargetPath, { withFileTypes: true });
        const structure: DirectoryStructure = {};

        for (const entry of entries) {
            // Skip ignored directories
            if (IGNORED_PATTERNS.includes(entry.name)) continue;

            try {
                const newPath = [...targetPath, entry.name];

                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    structure[entry.name] = await buildDirectoryStructure(
                        newPath,
                        depth + 1,
                        maxDepth
                    );
                } else {
                    structure[entry.name] = null;
                }
            } catch (error) {
                console.log(`Skipping ${entry.name}:`, error);
                continue;
            }
        }

        return structure;
    } catch (error) {
        console.error(`Error scanning directory:`, error);
        return {};
    }
}

const CACHE_DIR = ['public', 'cache']; // Relative path from project root

async function ensureCacheExists(): Promise<void> {
    try {
        // Use fileHelpers to ensure the cache directory exists by doing a test save
        await fileHelpers.json.save(
            'cache-init',
            { initialized: true },
            {
                type: 'public',
                path: ['cache']
            }
        );
    } catch (error) {
        console.error('Failed to initialize cache directory:', error);
        throw error;
    }
}

async function readCachedStructure(): Promise<{
    structure: DirectoryStructure;
    timestamp: number;
} | null> {
    try {
        // Ensure cache directory exists before trying to read
        await ensureCacheExists();

        const result = await fileHelpers.json.read<{
            structure: DirectoryStructure;
            timestamp: number;
        }>(CACHE_FILE, {
            type: 'public',
            path: ['cache']
        });

        if (!result.data) {
            console.log('No cached structure found');
            return null;
        }

        const age = Date.now() - result.data.timestamp;
        if (age >= 3600000) { // 1 hour
            console.log('Cache expired');
            return null;
        }

        return result.data;
    } catch (error) {
        console.log('Error reading cache:', error);
        return null;
    }
}

async function writeCachedStructure(
    structure: DirectoryStructure,
    timestamp: number
): Promise<void> {
    try {
        await ensureCacheExists();

        await fileHelpers.json.save(
            CACHE_FILE,
            { structure, timestamp },
            {
                type: 'public',
                path: ['cache']
            }
        );
        console.log('Cache written successfully');
    } catch (error) {
        console.error('Error writing cache:', error);
        // Continue even if cache write fails
    }
}

export async function generateDirectoryStructure(
    type: 'project' | 'current',
    forceRefresh: boolean = false
): Promise<DirectoryResponse> {
    try {
        // Try to read cached structure if not forcing refresh
        if (!forceRefresh) {
            const cachedData = await readCachedStructure();
            if (cachedData) {
                console.log('Using cached directory structure');
                return {
                    success: true,
                    structure: cachedData.structure,
                    timestamp: cachedData.timestamp
                };
            }
        }

        // Generate new structure using the appropriate base path
        const basePath = type === 'project'
                         ? [] // Project root
                         : ['app']; // App directory

        console.log('Scanning directory structure from:', basePath);
        const structure = await buildDirectoryStructure(basePath);
        const timestamp = Date.now();

        // Try to cache the result, but don't fail if caching fails
        try {
            await writeCachedStructure(structure, timestamp);
        } catch (error) {
            console.warn('Failed to cache directory structure:', error);
        }

        return {
            success: true,
            structure,
            timestamp
        };
    } catch (error) {
        console.error('Error generating directory structure:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
