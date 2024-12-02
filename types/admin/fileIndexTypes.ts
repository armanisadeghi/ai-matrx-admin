
export type ExportInfo = {
    default: string | null;
    named: string[];
};

export type ImportDetail = {
    source?: string;          // For package imports
    resolved_path?: string;   // For resolved paths
    default: string | null;
    named: string[];
};

export type ImportsInfo = {
    packages: ImportDetail[];
    aliased_imports: ImportDetail[];
    relative_imports: ImportDetail[];
    duplicates: string[];
};

// Define the primary structure for each file or directory
export interface DirectoryStructure {
    _files: string[];         // List of file names
    full_paths?: string[];    // Full paths for files
    exports?: ExportInfo;     // Export details
    imports?: ImportsInfo;    // Import details
    [subdirectory: string]: DirectoryStructure | string[] | ExportInfo | ImportsInfo;
}

// Define the top-level structure containing directories
export interface CombinedStructure {
    [directoryName: string]: DirectoryStructure;
}
