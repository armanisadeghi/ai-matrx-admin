import type { Note } from '../types';
import { DEFAULT_FOLDER_NAMES } from '../constants/defaultFolders';

/**
 * Get a complete list of all folders (default + custom)
 * Single source of truth for folder lists across the entire app
 * 
 * @param notes - All notes to extract custom folders from
 * @returns Array of folder names with defaults first, then custom alphabetically
 */
export function getAllFolders(notes: Note[]): string[] {
    // Start with default folders
    const allFolders = new Set<string>(DEFAULT_FOLDER_NAMES);
    
    // Add custom folders from notes
    notes.forEach(note => {
        if (note.folder_name) {
            allFolders.add(note.folder_name);
        }
    });
    
    // Convert to array and sort: defaults first (in order), then custom alphabetically
    const folderArray = Array.from(allFolders);
    
    folderArray.sort((a, b) => {
        const aIsDefault = DEFAULT_FOLDER_NAMES.includes(a);
        const bIsDefault = DEFAULT_FOLDER_NAMES.includes(b);
        
        if (aIsDefault && bIsDefault) {
            // Both default: maintain DEFAULT_FOLDER_NAMES order
            return DEFAULT_FOLDER_NAMES.indexOf(a) - DEFAULT_FOLDER_NAMES.indexOf(b);
        }
        if (aIsDefault) return -1; // Default folders first
        if (bIsDefault) return 1;
        
        // Both custom: alphabetical
        return a.localeCompare(b);
    });
    
    return folderArray;
}

/**
 * Check if a folder is a default folder
 */
export function isDefaultFolder(folderName: string): boolean {
    return DEFAULT_FOLDER_NAMES.includes(folderName);
}

/**
 * Get only custom folders (non-default)
 */
export function getCustomFolders(notes: Note[]): string[] {
    const allFolders = getAllFolders(notes);
    return allFolders.filter(folder => !isDefaultFolder(folder));
}

