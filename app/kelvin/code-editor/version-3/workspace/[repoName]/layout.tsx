"use client";

import { useEffect } from "react";
import { getSyncManager } from "@/app/dashboard/code-editor/utils";

// export const metadata: Metadata = {
//     title: "Code Editor",
//     description: "A Next.js 14 Code Editor Application",
// };

export default function CodeEditorLayout({ children }: { children: React.ReactNode }) {
    // useEffect(() => {
    //     // Define an async function to handle async operations
    //     const setupSyncManager = async () => {
    //         const syncManager = await getSyncManager(); // Await the instantiation of SyncManager
    //         syncManager.startPeriodicSync(); // Start the periodic sync
    //
    //         return syncManager; // Return the instance for cleaning up
    //     };
    //
    //     let syncManagerInstance;
    //
    //     setupSyncManager().then((instance) => {
    //         syncManagerInstance = instance; // Store the instance for cleanup
    //     });
    //
    //     // Cleanup logic
    //     return () => {
    //         if (syncManagerInstance) {
    //             syncManagerInstance.stopPeriodicSync(); // Stop the periodic sync
    //         }
    //     };
    // }, []);

    return <>{children}</>;
}
