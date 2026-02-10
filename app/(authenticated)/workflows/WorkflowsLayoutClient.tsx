"use client";

import { ReactFlowProvider } from "reactflow";
import { useCombinedFunctionsWithArgs } from "@/lib/redux/entity/hooks/functions-and-args";
import { useEffect } from "react";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";

export default function WorkflowsLayoutClient({ children }: { children: React.ReactNode }) {
    const { combinedFunctions, isLoading, isError, fetchAll } = useCombinedFunctionsWithArgs();

    const { fetchDataBrokerAll } = useDataBrokerWithFetch();

    useEffect(() => {
        fetchAll();
        fetchDataBrokerAll();
    }, []);

    // Show loading while data is being fetched
    if (isLoading || combinedFunctions.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading workflows...</p>
                </div>
            </div>
        );
    }

    // Show error state if needed
    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">Failed to load workflows</p>
                    <button onClick={fetchAll} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
