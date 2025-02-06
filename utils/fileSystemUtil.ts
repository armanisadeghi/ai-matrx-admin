// utils/fileSystemUtil.ts
import path from 'path';
import {promises as fs} from 'fs';
import type {Dirent} from 'fs';
import {printLink} from './printLink';

// Default paths that can be overridden
export const BASE_PATH = '/api';
const DEFAULT_PUBLIC_DIR = 'public';
const DEFAULT_MANIFEST_FILENAME = 'directory-manifest.json';

interface DirectoryEntry {
    path: string;
    name: string;
}

interface FileOperationResult {
    success: boolean;
    filePath?: string;
    clickableLink?: string;
    error?: string;
}

const debug = false as boolean;

interface FileTypeConfig {
    extension: string;
    contentType?: string;
}

const FILE_TYPES: Record<string, FileTypeConfig> = {
    json: { extension: '.json', contentType: 'application/json' },
    text: { extension: '.txt', contentType: 'text/plain' },
    md: { extension: '.md', contentType: 'text/markdown' },
    html: { extension: '.html', contentType: 'text/html' },
    css: { extension: '.css', contentType: 'text/css' },
    js: { extension: '.js', contentType: 'application/javascript' },
    // Add more as needed
};

function ensureExtension(filename: string, ext: string): string {
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
    return filename.toLowerCase().endsWith(normalizedExt.toLowerCase())
           ? filename
           : `${filename}${normalizedExt}`;
}


/**
 * Finds the project root by looking for package.json
 * Handles Next.js specific directory structures
 */
export async function findProjectRoot(startPath: string): Promise<string> {
    let currentPath = startPath;
    const root = path.parse(currentPath).root;

    while (currentPath !== root) {
        try {
            const packagePath = path.join(currentPath, 'package.json');
            await fs.access(packagePath);

            // Check if we're in .next directory
            if (currentPath.endsWith('.next')) {
                return path.dirname(currentPath);
            }
            return currentPath;
        } catch {
            currentPath = path.dirname(currentPath);
        }
    }

    throw new Error('Could not find project root (no package.json found)');
}


/**
 * Finds a target directory relative to project root
 */
export async function findTargetDirectory(targetPath: string[]): Promise<string> {
    try {
        const projectRoot = await findProjectRoot(__dirname);
        const fullTargetPath = path.join(projectRoot, ...targetPath);

        const stats = await fs.stat(fullTargetPath);
        if (stats.isDirectory()) {
            return fullTargetPath;
        }
        throw new Error('Directory not found');
    } catch (error) {
        console.error('Error finding directory:', error);
        throw error;
    }
}

/**
 * Formats a directory entry with consistent path formatting
 */
function formatDirectoryEntry(dirent: Dirent, basePath: string = BASE_PATH): DirectoryEntry {
    const name = dirent.name;
    const formattedPath = path.posix.join(basePath, name).replace(/\\/g, '/');

    return {
        path: formattedPath,
        name: name
    };
}

/**
 * Development environment directory listing
 */
export async function listDirectoriesDev(targetPath: string[]): Promise<DirectoryEntry[]> {
    try {
        const fullTargetPath = await findTargetDirectory(targetPath);
        const entries = await fs.readdir(fullTargetPath, {withFileTypes: true});
        return entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => formatDirectoryEntry(dirent));
    } catch (error) {
        console.error('Error reading directories:', error);
        return [];
    }
}

/**
 * Production environment directory listing
 */
export async function listDirectoriesProd(manifestPath: string = DEFAULT_MANIFEST_FILENAME): Promise<DirectoryEntry[]> {
    try {
        const response = await fetch(manifestPath);
        if (!response.ok) {
            throw new Error(`Failed to fetch manifest: ${response.status}`);
        }
        const directories = await response.json();
        return directories.map((dir: DirectoryEntry) => ({
            ...dir,
            path: path.posix.join(BASE_PATH, dir.name).replace(/\\/g, '/')
        }));
    } catch (error) {
        console.error('Error reading directory manifest:', error);
        return [];
    }
}

/**
 * Universal directory listing function
 */
export async function listDirectories(targetPath: string[]): Promise<DirectoryEntry[]> {
    return process.env.NODE_ENV === 'development'
           ? listDirectoriesDev(targetPath)
           : listDirectoriesProd();
}

/**
 * Generates a manifest of directories for production use
 */
export async function generateDirectoryManifest(targetPath: string[], outputFilename: string = DEFAULT_MANIFEST_FILENAME): Promise<DirectoryEntry[]> {
    try {
        const fullTargetPath = await findTargetDirectory(targetPath);

        const entries = await fs.readdir(fullTargetPath, {withFileTypes: true});
        const directories = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => formatDirectoryEntry(dirent));

        const publicDir = await getOrCreatePublicDirectory();
        const manifestPath = path.join(publicDir, outputFilename);
        await fs.writeFile(manifestPath, JSON.stringify(directories, null, 2));

        console.log(`✅ Generated manifest with ${directories.length} directories`);
        return directories;
    } catch (error) {
        console.error('Error generating manifest:', error);
        throw error;
    }
}

/**
 * Generic file save function for any file type
 */
export async function saveFile(
    filename: string,
    content: string | Buffer,
    options: {
        subDir?: string,
        fullPath?: string,
        encoding?: BufferEncoding,
        environment?: 'development' | 'production' | 'auto'
    } = {}
): Promise<FileOperationResult> {
    const {
        subDir = 'uploads',
        fullPath,
        encoding = 'utf-8',
        environment = process.env.NODE_ENV as 'development' | 'production'
    } = options;

    if (!filename || !content) {
        return {success: false, error: 'Missing filename or content'};
    }

    try {
        if (environment === 'development' || environment === 'auto') {
            let directory: string;

            if (fullPath) {
                directory = path.normalize(fullPath);
            } else {
                directory = await getOrCreatePublicDirectory(subDir);
            }
            if (debug) {
                console.log('Using directory:', directory)
            }
            const filePath = path.join(directory, filename);

            if (debug) {
                console.log('Final file path:', filePath)
            }

            // Create directory if it doesn't exist
            await fs.mkdir(path.dirname(filePath), {recursive: true});

            if (typeof content === 'string') {
                await fs.writeFile(filePath, content, encoding);
            } else {
                await fs.writeFile(filePath, content);
            }

            // For web display, we want paths relative to project root and using forward slashes
            const projectRoot = await findProjectRoot(__dirname);
            const relativePath = path.relative(projectRoot, filePath);
            const webPath = relativePath.replace(/\\/g, '/');

            // Create clickable link - for files in public, remove 'public' from the path
            let linkPath = webPath;
            if (webPath.startsWith('public/')) {
                linkPath = webPath.replace('public/', '');
            }


            if (debug) {
                console.log('Web path:', webPath);
                console.log('Link path:', linkPath);
            }

            return {
                success: true,
                filePath: webPath,
                clickableLink: printLink(filePath)
            };
        } else {
            throw new Error('Production storage method not implemented');
        }
    } catch (error) {
        console.error("Error saving file:", error);
        return {
            success: false,
            error: error.message
        };
    }
}


/**
 * Generic file read function for any file type
 */
export async function readFile(
    filename: string,
    options: {
        subDir?: string,
        fullPath?: string,
        encoding?: BufferEncoding,
        environment?: 'development' | 'production' | 'auto'
    } = {}
): Promise<{ content: string | Buffer | null, error?: string }> {
    const {
        subDir = 'uploads',
        fullPath,
        encoding = 'utf-8',
        environment = process.env.NODE_ENV as 'development' | 'production'
    } = options;

    try {
        if (environment === 'development' || environment === 'auto') {
            const directory = fullPath || await getOrCreatePublicDirectory(subDir);
            const filePath = path.join(directory, filename);
            const content = await fs.readFile(filePath, encoding);
            return {content};
        } else {
            // Production read logic would go here
            throw new Error('Production read method not implemented');
        }
    } catch (error) {
        console.error('Error reading file:', error);
        return {content: null, error: error.message};
    }
}

export type DirectoryType = 'public' | 'app' | 'custom';

interface DirectoryOptions {
    type: DirectoryType;
    path: string[];
    environment?: 'development' | 'production' | 'auto';
}

export const fileHelpers = {
    json: {
        save: async (
            filename: string,
            data: any,
            directoryOptions: DirectoryOptions
        ): Promise<FileOperationResult> => {
            const jsonString = JSON.stringify(data, null, 2);
            const fullPath = await resolveDirectoryPath(directoryOptions);

            return saveFile(
                ensureExtension(filename, FILE_TYPES.json.extension),
                jsonString,
                {
                    fullPath,
                    environment: directoryOptions.environment || 'auto'
                }
            );
        },
        read: async <T>(
            filename: string,
            directoryOptions: DirectoryOptions
        ): Promise<{ data: T | null, error?: string }> => {
            const fullPath = await resolveDirectoryPath(directoryOptions);
            const result = await readFile(
                ensureExtension(filename, FILE_TYPES.json.extension),
                {
                    fullPath,
                    environment: directoryOptions.environment || 'auto'
                }
            );

            if (result.error || !result.content) {
                return { data: null, error: result.error };
            }
            try {
                return { data: JSON.parse(result.content.toString()) as T };
            } catch (error) {
                return { data: null, error: 'Invalid JSON' };
            }
        }
    },
    text: {
        save: async (
            filename: string,
            content: string,
            directoryOptions: DirectoryOptions
        ): Promise<FileOperationResult> => {
            const fullPath = await resolveDirectoryPath(directoryOptions);
            return saveFile(
                ensureExtension(filename, FILE_TYPES.text.extension),
                content,
                {
                    fullPath,
                    environment: directoryOptions.environment || 'auto'
                }
            );
        },
        read: async (
            filename: string,
            directoryOptions: DirectoryOptions
        ): Promise<{ content: string | null, error?: string }> => {
            const fullPath = await resolveDirectoryPath(directoryOptions);
            const result = await readFile(
                ensureExtension(filename, FILE_TYPES.text.extension),
                {
                    fullPath,
                    environment: directoryOptions.environment || 'auto'
                }
            );

            if (result.error) {
                return { content: null, error: result.error };
            }
            return {
                content: result.content instanceof Buffer ? result.content.toString() : result.content
            };
        }
    },
    image: {
        save: async (
            filename: string,
            buffer: Buffer,
            directoryOptions: DirectoryOptions
        ): Promise<FileOperationResult> => {
            const fullPath = await resolveDirectoryPath(directoryOptions);
            // Images should keep their original extension
            return saveFile(
                filename,
                buffer,
                {
                    fullPath,
                    environment: directoryOptions.environment || 'auto'
                }
            );
        }
    },
    // Add a generic helper for other file types
    generic: {
        save: async (
            filename: string,
            content: string | Buffer,
            extension: string,
            directoryOptions: DirectoryOptions
        ): Promise<FileOperationResult> => {
            const fullPath = await resolveDirectoryPath(directoryOptions);
            return saveFile(
                ensureExtension(filename, extension),
                content,
                {
                    fullPath,
                    environment: directoryOptions.environment || 'auto'
                }
            );
        },
        read: async (
            filename: string,
            extension: string,
            directoryOptions: DirectoryOptions
        ): Promise<{ content: string | Buffer | null, error?: string }> => {
            const fullPath = await resolveDirectoryPath(directoryOptions);
            return readFile(
                ensureExtension(filename, extension),
                {
                    fullPath,
                    environment: directoryOptions.environment || 'auto'
                }
            );
        }
    },
    stats: {
        get: async (
            filename: string,
            directoryOptions: DirectoryOptions
        ): Promise<FileStats> => {
            const fullPath = await resolveDirectoryPath(directoryOptions);
            const filePath = path.join(fullPath, filename);
            const stats = await fs.stat(filePath);

            return {
                size: stats.size,
                mtime: stats.mtime,
                ctime: stats.ctime,
                isDirectory: stats.isDirectory()
            };
        }
    }

};

async function resolveDirectoryPath(options: DirectoryOptions): Promise<string> {
    const projectRoot = await findProjectRoot(__dirname);
    let fullPath: string;

    switch (options.type) {
        case 'public':
            fullPath = path.join(projectRoot, 'public', ...options.path);
            break;
        case 'app':
            fullPath = path.join(projectRoot, 'app', ...options.path);
            break;
        case 'custom':
            fullPath = path.join(projectRoot, ...options.path);
            break;
        default:
            throw new Error('Invalid directory type');
    }

    if (debug) {
        console.log('Resolving directory path:', fullPath);
    }

    // Normalize but preserve the drive letter
    fullPath = path.normalize(fullPath);

    if (debug) {
        console.log('Normalized path:', fullPath);
    }
    // Create directory
    await fs.mkdir(fullPath, {recursive: true});

    if (debug) {
        console.log('Directory created:', fullPath);
    }
    return fullPath;
}

/**
 * Creates a directory if it doesn't exist and returns its path
 */
export async function getOrCreatePublicDirectory(subDir?: string): Promise<string> {
    const projectRoot = await findProjectRoot(__dirname);
    const publicDir = path.join(projectRoot, DEFAULT_PUBLIC_DIR);
    await fs.mkdir(publicDir, {recursive: true});

    if (subDir) {
        const fullPath = path.join(publicDir, subDir);
        await fs.mkdir(fullPath, {recursive: true});
        return fullPath;
    }

    return publicDir;
}

/**
 * Creates a directory if it doesn't exist and returns its path
 */
export async function getOrCreateDirectory(dirPath: string | string[]): Promise<string> {
    const projectRoot = await findProjectRoot(__dirname);
    const fullPath = Array.isArray(dirPath)
                     ? path.join(projectRoot, ...dirPath)
                     : path.join(projectRoot, dirPath);

    const normalizedPath = path.normalize(fullPath);
    await fs.mkdir(normalizedPath, {recursive: true});
    return normalizedPath;
}

interface FileStats {
    size: number;
    mtime: Date;
    ctime: Date;
    isDirectory: boolean;
}



