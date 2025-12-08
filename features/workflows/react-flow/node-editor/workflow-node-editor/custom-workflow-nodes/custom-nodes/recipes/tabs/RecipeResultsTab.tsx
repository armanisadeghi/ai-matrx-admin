"use client";

import React from "react";
import { DbFunctionNode } from "@/features/workflows/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Database, Clock, AlertCircle } from "lucide-react";
import { EnrichedBroker } from "@/features/workflows/utils/data-flow-manager";
import { NeededBroker, RecipeConfig } from "@/features/workflows/service/recipe-service";
import { coreSelectors as brokerSelectors } from "@/lib/redux/brokerSlice/selectors/core";
import { useAppSelector } from "@/lib/redux/hooks";
import { localMessage } from "@/features/chat/components/response/MessageItem";
import AssistantMessage from "@/features/chat/components/response/assistant-message/AssistantMessage";

interface RecipeResultsTabProps {
    nodeData: DbFunctionNode;
    onNodeUpdate: (nodeData: DbFunctionNode) => void;
    recipeDetails: RecipeConfig | null;
    loading: boolean;
    error: string | null;
    neededBrokers?: NeededBroker[];
    enrichedBrokers: EnrichedBroker[];
}

const RecipeResultsTab: React.FC<RecipeResultsTabProps> = ({ nodeData, enrichedBrokers, recipeDetails, loading, error, neededBrokers }) => {
    const recipeId = recipeDetails?.id;
    const postResultOptions = recipeDetails?.postResultOptions;
    const contentBrokerId = `${recipeId}_content`;

    const stringContent = useAppSelector((state) => brokerSelectors.selectValue(state, contentBrokerId));
    const hasContent = stringContent !== null && stringContent !== undefined && stringContent !== "";

    const message: localMessage = {
        id: contentBrokerId,
        conversationId: recipeId,
        content: stringContent,
        role: "assistant",
        type: "text",
        displayOrder: 1,
        systemOrder: 1,
    };

    const handleRunNode = () => {
        // TODO: Dispatch action to run individual node
        console.log("Running node:", nodeData.id);
    };

    const handleRunWorkflow = () => {
        // TODO: Dispatch action to run entire workflow
        console.log("Running workflow:", nodeData.workflow_id);
    };

    return (
        <div className="h-full p-4">
            <div className="h-full flex flex-col space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Execution Results</h3>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleRunNode} className="flex items-center gap-2">
                            <PlayCircle className="h-4 w-4" />
                            Test Node
                        </Button>
                        <Button variant="default" size="sm" onClick={handleRunWorkflow} className="flex items-center gap-2">
                            <PlayCircle className="h-4 w-4" />
                            Run Workflow
                        </Button>
                    </div>
                </div>

                {hasContent && (
                    <div className="flex-1 min-h-0">
                        <Card className="h-full">
                            <CardContent className="p-6 h-full flex flex-col">
                                <AssistantMessage
                                    message={message}
                                    isStreamActive={false}
                                    onScrollToBottom={() => {}}
                                    onContentUpdate={() => {}}
                                    metadata={null}
                                    isOverlay={false}
                                    audioControls={null}
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {!hasContent && (
                    <div className="flex-1 min-h-0">
                        <Card className="h-full">
                            <CardContent className="p-6 h-full flex flex-col">
                                {/* Placeholder Content */}
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center space-y-4 max-w-md">
                                        <div className="flex justify-center space-x-2">
                                            <Database className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                                            <Clock className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                                Results Dashboard (Recipe)
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                This tab will display execution results for this node and the entire workflow.
                                            </p>
                                        </div>

                                        <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-4 text-left space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                                <AlertCircle className="h-4 w-4" />
                                                Planned Features:
                                            </div>
                                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-6">
                                                <li>• Individual node test execution</li>
                                                <li>• Full workflow execution results</li>
                                                <li>• Execution history and logs</li>
                                                <li>• Performance metrics</li>
                                                <li>• Error tracking and debugging</li>
                                                <li>• Result data visualization</li>
                                            </ul>
                                        </div>

                                        <div className="pt-2">
                                            <Badge variant="outline" className="text-xs">
                                                Redux Integration Pending
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Info */}
                                <div className="pt-3 mt-3 border-t border-border flex-shrink-0">
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>Node ID: {nodeData.id}</span>
                                        <span>Status: {nodeData.status || "pending"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeResultsTab;
