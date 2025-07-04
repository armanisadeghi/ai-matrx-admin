"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { DefaultTabProps } from "./types";


export const InputsTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const inputs = useAppSelector((state) => workflowNodesSelectors.nodeInputs(state, nodeId));

    return (
        <div className="h-full">
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto h-full">{JSON.stringify(inputs, null, 2)}</pre>
        </div>
    );
};

export default InputsTab;
