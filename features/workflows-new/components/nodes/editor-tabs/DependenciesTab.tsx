"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowNodeSelectors } from "@/lib/redux/workflow-node/selectors";
import { DefaultTabProps } from "./types";

export const DependenciesTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const dependencies = useAppSelector((state) => workflowNodeSelectors.nodeDependencies(state, nodeId));

    return (
        <div className="h-full">
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto h-full">{JSON.stringify(dependencies, null, 2)}</pre>
        </div>
    );
};

export default DependenciesTab;
