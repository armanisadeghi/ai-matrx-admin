"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { SectionContainer, SectionTable } from "@/features/workflows-xyflow/common";

interface RawDataTabProps {
    nodeId: string;
}

const RawDataTab: React.FC<RawDataTabProps> = ({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));

    if (!nodeData) {
        return <div className="text-muted-foreground">Node not found</div>;
    }

    return (
        <div className="h-full overflow-auto pr-2 space-y-6">
            <SectionContainer title="Raw Node Data">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto h-full">{JSON.stringify(nodeData, null, 2)}</pre>
            </SectionContainer>
        </div>
    );
};

export default RawDataTab; 