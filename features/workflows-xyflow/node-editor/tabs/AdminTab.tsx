"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DefaultTabProps } from "./types";

export const AdminTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const dispatch = useAppDispatch();
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));

    const [jsonValue, setJsonValue] = useState("");
    const [isValidJson, setIsValidJson] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize JSON value when nodeData changes
    useEffect(() => {
        if (nodeData) {
            setJsonValue(JSON.stringify(nodeData, null, 2));
            setIsValidJson(true);
            setError(null);
        }
    }, [nodeData]);

    const handleJsonChange = (value: string) => {
        setJsonValue(value);

        try {
            JSON.parse(value);
            setIsValidJson(true);
            setError(null);
        } catch (err) {
            setIsValidJson(false);
            setError(err instanceof Error ? err.message : "Invalid JSON");
        }
    };

    const handleApplyChanges = () => {
        if (!isValidJson || !nodeData) return;

        try {
            const parsedData = JSON.parse(jsonValue);

            // Ensure the ID matches
            if (parsedData.id !== nodeId) {
                setError("Cannot change node ID");
                return;
            }

            // Dispatch action to update the node
            dispatch(workflowNodesActions.updateWorkflowNode({ id: nodeId, updates: parsedData }));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to apply changes");
        }
    };

    const handleReset = () => {
        if (nodeData) {
            setJsonValue(JSON.stringify(nodeData, null, 2));
            setIsValidJson(true);
            setError(null);
        }
    };

    if (!nodeData) {
        return <div className="text-muted-foreground">Node not found</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Direct JSON editing - Use with caution</div>
                <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        Reset
                    </Button>
                    <Button size="sm" onClick={handleApplyChanges} disabled={!isValidJson}>
                        Apply Changes
                    </Button>
                </div>
            </div>

            {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

            <Textarea
                value={jsonValue}
                onChange={(e) => handleJsonChange(e.target.value)}
                className={`font-mono text-sm ${!isValidJson ? "border-destructive" : ""}`}
                placeholder="Node JSON data..."
                rows={30}
            />
        </div>
    );
};

export default AdminTab;
