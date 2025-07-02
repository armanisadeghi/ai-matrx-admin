"use client";

import React, { useState } from "react";
import FullScreenOverlay, { TabDefinition } from '@/components/official/FullScreenOverlay';
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowSelectors } from "@/lib/redux/workflow/selectors";
import { workflowNodeSelectors } from "@/lib/redux/workflow-node/selectors";

interface WorkflowAdminOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    workflowId: string;
}

export const WorkflowAdminOverlay: React.FC<WorkflowAdminOverlayProps> = ({
    isOpen,
    onClose,
    workflowId
}) => {
    // Get workflow data without nodes
    const workflow = useAppSelector((state) => workflowSelectors.workflowById(state, workflowId));
    
    // Get nodes for this workflow
    const workflowNodes = useAppSelector((state) => workflowNodeSelectors.nodesByWorkflowId(state, workflowId));
    
    // Get workflow with nodes
    const workflowWithNodes = useAppSelector((state) => workflowSelectors.workflowWithNodesById(state, workflowId));

    // Define tab content
    const tabs: TabDefinition[] = [
        {
            id: 'workflow',
            label: 'Workflow Data',
            content: (
                <div className="p-6">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-full">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(workflow, null, 2)}
                        </pre>
                    </div>
                </div>
            )
        },
        {
            id: 'nodes',
            label: 'Workflow Nodes',
            content: (
                <div className="p-6">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-full">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(workflowNodes, null, 2)}
                        </pre>
                    </div>
                </div>
            )
        },
        {
            id: 'complete',
            label: 'Workflow + Nodes',
            content: (
                <div className="p-6">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-full">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(workflowWithNodes, null, 2)}
                        </pre>
                    </div>
                </div>
            )
        }
    ];

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title="Workflow Admin Panel"
            description={`Administration panel for workflow: ${workflow?.name || workflowId}`}
            tabs={tabs}
            initialTab="workflow"
            onTabChange={(tab) => console.log('Admin tab changed:', tab)}
            showCancelButton={true}
            onCancel={onClose}
            cancelButtonLabel="Close"
            width="95vw"
            height="95vh"
        />
    );
}; 