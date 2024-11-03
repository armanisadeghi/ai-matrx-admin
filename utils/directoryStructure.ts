// utils/directoryStructure.ts
import path from 'path';
import { promises as fs } from 'fs';
import type { Dirent } from 'fs';

export interface TestDirectory {
    path: string;
    name: string;
    type?: string;
    description?: string;
}

export const TESTS_BASE_PATH = '/tests';

// Helper to find project root
async function findProjectRoot(startPath: string): Promise<string> {
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

// Helper function to get the correct tests path
async function findTestsDirectory(): Promise<string> {
    try {
        const projectRoot = await findProjectRoot(__dirname);
        const testsPath = path.join(projectRoot, 'app', '(authenticated)', 'tests');

        const stats = await fs.stat(testsPath);
        if (stats.isDirectory()) {
            return testsPath;
        }
        throw new Error('Tests directory not found');
    } catch (error) {
        console.error('Error finding tests directory:', error);
        throw error;
    }
}

/**
 * Format directory entry to ensure consistent path format
 */
function formatDirectoryEntry(dirent: Dirent): TestDirectory {
    const name = dirent.name;
    const formattedPath = path.posix.join(TESTS_BASE_PATH, name).replace(/\\/g, '/');

    return {
        path: formattedPath,
        name: name
    };
}

/**
 * Development environment directory fetching
 */
export async function getTestDirectoriesDev(): Promise<TestDirectory[]> {
    try {
        const testsPath = await findTestsDirectory();
        const entries = await fs.readdir(testsPath, { withFileTypes: true });
        return entries
            .filter(dirent => dirent.isDirectory())
            .map(formatDirectoryEntry);
    } catch (error) {
        console.error('Error reading test directories:', error);
        return [];
    }
}

/**
 * Production environment directory fetching
 */
export async function getTestDirectoriesProd(): Promise<TestDirectory[]> {
    try {
        const response = await fetch('/test-directories.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch manifest: ${response.status}`);
        }
        const directories = await response.json();
        // Ensure paths are properly formatted even when loading from JSON
        return directories.map(dir => ({
            ...dir,
            path: path.posix.join(TESTS_BASE_PATH, dir.name).replace(/\\/g, '/')
        }));
    } catch (error) {
        console.error('Error reading test directories manifest:', error);
        return [];
    }
}

/**
 * Production-ready manifest generation
 */
export async function generateDirectoryManifest() {
    try {
        console.log('📦 Generating test directories manifest...');
        const testsPath = await findTestsDirectory();

        const entries = await fs.readdir(testsPath, { withFileTypes: true });
        const directories = entries
            .filter(dirent => dirent.isDirectory())
            .map(formatDirectoryEntry);

        const publicDir = path.join(process.cwd(), 'public');
        await fs.mkdir(publicDir, { recursive: true });

        const manifestPath = path.join(publicDir, 'test-directories.json');
        await fs.writeFile(manifestPath, JSON.stringify(directories, null, 2));

        console.log(`✅ Generated manifest with ${directories.length} directories`);
        return directories;
    } catch (error) {
        console.error('Error generating manifest:', error);
        throw error;
    }
}

/**
 * Universal directory fetching function
 */
export async function getTestDirectories(): Promise<TestDirectory[]> {
    return process.env.NODE_ENV === 'development'
           ? getTestDirectoriesDev()
           : getTestDirectoriesProd();
}
