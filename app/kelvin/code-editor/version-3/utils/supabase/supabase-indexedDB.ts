import { IndexedDBStore } from "../local-indexedDB";
import {IRepoData} from "@/app/kelvin/code-editor/version-3/types";

class SupabaseIndexedDBStore extends IndexedDBStore {
    private syncManager: any | null = null;

    constructor() {
        super();
        this.initSyncManager();
    }

    private async initSyncManager() {
        // this.syncManager = await getSyncManager();
        // this.syncManager.startPeriodicSync(); // Start syncing when initialized
    }

    // Override methods to integrate sync operations if needed

    async addRepository(repo: IRepoData): Promise<void> {
        await super.addRepository(repo);
        await this.syncToSupabase();
    }

    async deleteRepository(name: string): Promise<void> {
        await super.deleteRepository(name);
        await this.syncToSupabase();
    }

    async saveFileContent(repoName: string, path: string, content: string): Promise<void> {
        await super.saveFileContent(repoName, path, content);
        await this.syncToSupabase();
    }

    // Custom method to sync to Supabase explicitly
    async syncToSupabase(): Promise<void> {
        if (this.syncManager) {
            await this.syncManager.syncToSupabase();
        }
    }

    // Add more methods if you need to handle other syncing scenarios
}

// Use a singleton pattern to export only one instance
export const supabaseIndexedDBStore = new SupabaseIndexedDBStore();
