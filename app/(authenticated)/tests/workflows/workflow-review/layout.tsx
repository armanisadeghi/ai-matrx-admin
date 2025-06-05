"use client";
import { useEffect } from "react";
import { useWorkflowWithFetch } from "@/features/old-deprecated-workflow-system-do-not-use/workflows/hooks/useWorkflowData";

interface WorkflowManagerLayoutProps {
    children: React.ReactNode;
}

export default function WorkflowManagerLayout({ children }: WorkflowManagerLayoutProps) {
    const {
        fetchWorkflowPaginated,
        setWorkflowShouldFetch,
        workflowIsLoading,
    } = useWorkflowWithFetch();

    useEffect(() => {
        // Set up fetching mode and fetch initial data
        setWorkflowShouldFetch(true);
        fetchWorkflowPaginated(1, 20); // Fetch first page with 20 items
    }, [setWorkflowShouldFetch, fetchWorkflowPaginated]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {workflowIsLoading && (
                <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
            )}
            
            {children}
        </div>
    );
}
