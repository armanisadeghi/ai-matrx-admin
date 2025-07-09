"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { SectionContainer, SectionTable } from "@/features/workflows-xyflow/common";
import { useRegisteredNodeResultsWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SampleResultsTabProps {
    nodeId: string;
}

const SampleResultsTab: React.FC<SampleResultsTabProps> = ({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));
    const nodeDefinitionId = nodeData?.metadata?.nodeDefinition.id;
    const [copiedPath, setCopiedPath] = useState<any>(null);

    const sampleResultsHook = useRegisteredNodeResultsWithFetch();

    const fetchSampleResults = useCallback(() => {
        sampleResultsHook.fetchRegisteredNodeResultsPaginated(1, 10, {
            filters: {
                conditions: [
                    { field: "registered_node_id", operator: "eq", value: nodeDefinitionId },
                ],
            },
        });
    }, [sampleResultsHook]);

    useEffect(() => {
        fetchSampleResults();
    }, []);

    useEffect(() => {
        console.log(sampleResultsHook.registeredNodeResultsRecords);
    }, [sampleResultsHook.registeredNodeResultsRecords]);

    const filteredRecords = useMemo(() => {
        return Object.values(sampleResultsHook.registeredNodeResultsRecords).filter((record) => record.registeredNodeId === nodeDefinitionId);
    }, [sampleResultsHook.registeredNodeResultsRecords, nodeDefinitionId]);

    if (!nodeData) {
        return <div className="text-muted-foreground">Node not found</div>;
    }

    if (filteredRecords.length === 0) {
        return (
            <div className="h-full overflow-auto pr-2">
                <SectionContainer title="No Results">
                    <div className="text-muted-foreground p-4">No sample results found for this node.</div>
                </SectionContainer>
            </div>
        );
    }


    const handlePathCopy = (path: any) => {
        console.log("copied path", path);
        setCopiedPath(path);
    };

    return (
        <div className="h-full overflow-auto pr-2 space-y-4">
            {copiedPath && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Copied Path:
                    </label>
                    <textarea
                        value={JSON.stringify(copiedPath, null, 2)}
                        readOnly
                        className="w-full h-20 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono resize-none"
                        placeholder="No path copied yet..."
                    />
                </div>
            )}
            <Tabs defaultValue={filteredRecords[0]?.id} className="flex-1">
                <TabsList className="mb-4">
                    {filteredRecords.map((record, index) => (
                        <TabsTrigger key={record.id} value={record.id}>
                            Result {index + 1}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {filteredRecords.map((record, index) => (
                    <TabsContent key={record.id} value={record.id} className="flex-1">
                        <SectionContainer title={`Result ${index + 1} - ${record.id}`}>
                            <RawJsonExplorer pageData={record.data} ignorePrefix="data" onPathCopy={handlePathCopy} />
                        </SectionContainer>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default SampleResultsTab;