const potentialStructure = {
    sources: {
        "bucket1": {
            type: "supabase_bucket",
            name: "Main Storage",
            lastSync: "2023-...",
            syncStatus: "in_sync", // in_sync | syncing | error
            isActive: true
        }
    },

    trees: {
        "bucket1": {
            id: "root_bucket1",
            type: "folder",
            name: "Root Folder",
            lastModified: "2023-...", // Single source of truth
            children: [
                {
                    id: "folder1",
                    type: "folder",
                    name: "Folder 1",
                    lastModified: "2023-...",
                    children: [],
                    contentsFetched: true
                }
            ]
        }
    },

    storage: {
        "bucket1": {
            "file1": {
                lastModified: "2023-...", // Single source of truth
                inCloud: true,
                inMemory: true,
                inIDB: true,
                cloudPath: "path/in/bucket",
                idbKey: "idb_storage_key",
                size: 1024,
                type: "text/plain",
                archived: false,
                archiveKey?: "archive_123" // Reference to archived version if exists
            }
        }
    },

    // Simplified fetch status
    fetchStatus: {
        "bucket1": {
            "file1": {
                status: "fetched", // fetched | pending | error | not_fetched
                lastFetch: "2023-...",
                contentFetched: boolean
            }
        }
    },

    // Simplified file contents
    fileContents: {
        "bucket1": {
            "file1": {
                content: "Current content",
                lastModified: "2023-...",
                archived: false
            }
        }
    },

    // Archive reference (optional, could be in separate storage)
    archives: {
        "bucket1": {
            "archive_123": {
                originalId: "file1",
                content: "Old content",
                timestamp: "2023-...",
                metadata: {/*...*/}
            }
        }
    },

    operations: {
        "bucket1": {
            pending: [
                {
                    id: "op1",
                    type: "add_file",
                    status: "pending",
                    timestamp: "2023-...",
                    path: "folder1/file2",
                    data: {/*...*/}
                }
            ],
            failed: []
        }
    },

    ui: {
        "bucket1": {
            selectedItems: ["file1"],
            expandedFolders: ["root"],
            activeFile: "file1"
        }
    }
}

