"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { DefaultTabProps } from "./types";


export const MetadataTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));

    return (
        <div className="h-full">
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto h-full">{JSON.stringify(nodeData?.metadata, null, 2)}</pre>
        </div>
    );
};

export default MetadataTab;
