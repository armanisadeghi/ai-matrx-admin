"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { getWorkflowActionsWithThunks } from "@/lib/redux/entity/custom-actions/custom-workflow-actions";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";

interface WorkflowManagerLayoutProps {
    children: React.ReactNode;
}

export default function WorkflowManagerLayout({ children }: WorkflowManagerLayoutProps) {
    const dispatch = useAppDispatch();
    const initializeRef = useRef(false);
    
    // Use Redux selectors instead of hooks that trigger fetches
    const workflowSelectors = createWorkflowSelectors();
    const workflowActions = getWorkflowActionsWithThunks();
    
    // Get loading state from Redux
    const workflowEntityState = useAppSelector(workflowSelectors.selectWorkflowEntity);
    const isLoading = workflowEntityState?.fetchState?.isLoading || false;

    useEffect(() => {
        // Initialize only once per session
        if (!initializeRef.current) {
            console.log('Layout: Initializing workflow data...');
            dispatch(workflowActions.initialize());
            initializeRef.current = true;
        }
    }, [dispatch]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {isLoading && (
                <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading workflows...</span>
                </div>
            )}
            
            {children}
        </div>
    );
}
