"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useCombinedFunctionsWithArgs } from "@/lib/redux/entity/hooks/functions-and-args";
import { useEffect } from "react";
import { useDataBrokerWithFetch, useNodeCategoryWithFetch, useRegisteredNodeWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { fetchFieldsThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { useAppDispatch } from "@/lib/redux";
import WorkflowLoading from "@/features/workflows-xyflow/common/workflow-loading";

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { combinedFunctions, isLoading, isError, fetchAll } = useCombinedFunctionsWithArgs();

    const { fetchDataBrokerAll } = useDataBrokerWithFetch();
    const categoryHook = useNodeCategoryWithFetch();
    const registeredNodeHook = useRegisteredNodeWithFetch();


    useEffect(() => {
        fetchAll();
        fetchDataBrokerAll();
        dispatch(fetchFieldsThunk());
        categoryHook.fetchNodeCategoryAll();
        registeredNodeHook.fetchRegisteredNodeAll();
    }, []);

    // Show loading while data is being fetched
    if (isLoading || combinedFunctions.length === 0 || Object.keys(categoryHook.nodeCategoryRecordsById).length === 0 || Object.keys(registeredNodeHook.registeredNodeRecordsById).length === 0) {
        return (
            <WorkflowLoading 
                title="Loading Workflow System"
                subtitle="Initializing functions, data brokers, and workflow components..."
                step1="Functions"
                step2="Data Brokers"
                step3="Ready"
            />
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
