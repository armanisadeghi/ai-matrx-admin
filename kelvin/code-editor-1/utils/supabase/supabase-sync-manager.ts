"use server";

import { indexedDBStore } from "@/app/dashboard/code-editor/utils/local-indexedDB";
import { createClient } from "@/utils/supabase/server";

const supabase = createClient();

class SyncManager {
    private syncInterval: number = 5 * 60 * 1000; // 5 minutes
    private intervalId: NodeJS.Timeout | null = null;

    constructor() {
        this.setupRealtimeListener();
    }

    async syncToSupabase() {
        const repositories = await indexedDBStore.getRepositories();
        for (const repo of repositories) {
            await supabase.from("repositories").upsert(repo, { onConflict: "name" });

            for (const [path, content] of Object.entries(repo.files)) {
                await supabase.from("files").upsert(
                    {
                        repo_name: repo.name,
                        path,
                        content,
                    },
                    { onConflict: "repo_name,path" },
                );
            }
        }
    }

    async syncFromSupabase() {
        const { data: repos, error: repoError } = await supabase.from("repositories").select("*");

        if (repoError) throw repoError;

        for (const repo of repos) {
            const { data: files, error: fileError } = await supabase
                .from("files")
                .select("*")
                .eq("repo_name", repo.name);

            if (fileError) throw fileError;

            repo.files = files.reduce((acc, file) => {
                acc[file.path] = file.content;
                return acc;
            }, {});

            await indexedDBStore.addRepository(repo);
        }
    }

    setupRealtimeListener() {
        supabase
            .channel("db-changes")
            .on("postgres_changes", { event: "*", schema: "public" }, this.handleRealtimeChange)
            .subscribe();
    }

    handleRealtimeChange = async (payload: any) => {
        if (payload.table === "repositories") {
            const repo = payload.new;
            const { data: files } = await supabase.from("files").select("*").eq("repo_name", repo.name);

            repo.files = files.reduce((acc, file) => {
                acc[file.path] = file.content;
                return acc;
            }, {});

            await indexedDBStore.addRepository(repo);
        } else if (payload.table === "files") {
            const file = payload.new;
            const repoName = file.repo_name;
            await indexedDBStore.saveFileContent(repoName, file.path, file.content);
        }
    };

    startPeriodicSync() {
        this.syncFromSupabase(); // Initial sync
        this.intervalId = setInterval(() => {
            this.syncToSupabase();
            this.syncFromSupabase();
        }, this.syncInterval);
    }

    stopPeriodicSync() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

let syncManagerInstance: SyncManager | null = null;

export async function getSyncManager() {
    if (!syncManagerInstance) {
        syncManagerInstance = new SyncManager();
    }
    return syncManagerInstance;
}

export async function setupSyncManager() {
    if (!syncManagerInstance) {
        syncManagerInstance = new SyncManager();
        syncManagerInstance.startPeriodicSync();
    }
}
