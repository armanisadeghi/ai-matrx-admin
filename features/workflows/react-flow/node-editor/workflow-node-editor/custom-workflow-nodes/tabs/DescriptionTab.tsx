'use client';

import React from 'react';
import { DbFunctionNode } from '@/features/workflows/types';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle } from "lucide-react";
import { getRegisteredFunctions } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/arg-utils";
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';

interface DescriptionTabProps {
  nodeData: DbFunctionNode;
  onNodeUpdate: (nodeData: DbFunctionNode) => void;
  enrichedBrokers: EnrichedBroker[];
}

const DescriptionTab: React.FC<DescriptionTabProps> = ({ nodeData, enrichedBrokers }) => {
    const functionData = getRegisteredFunctions().find(f => f.id === nodeData.function_id);

    return (
        <div className="h-full p-4">
            <Card className="h-full">
                <CardContent className="p-4 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                        <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            Function Description
                        </h3>
                        {functionData && (
                            <Badge variant="outline" className="text-xs">
                                {functionData.name}
                            </Badge>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-0">
                        {!functionData ? (
                            <div className="flex items-center justify-center h-full text-center">
                                <div className="space-y-2">
                                    <AlertCircle className="h-8 w-8 text-gray-400 dark:text-gray-600 mx-auto" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        No function selected or function data not found
                                    </p>
                                </div>
                            </div>
                        ) : !functionData.description ? (
                            <div className="flex items-center justify-center h-full text-center">
                                <div className="space-y-2">
                                    <FileText className="h-8 w-8 text-gray-400 dark:text-gray-600 mx-auto" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        No description available for this function
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ScrollArea className="h-full">
                                <div className="pr-4">
                                    <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                        <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200 leading-relaxed">
                                            {functionData.description.trim()}
                                        </pre>
                                    </div>
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    {/* Footer info */}
                    {functionData && functionData.description && (
                        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Function ID: {functionData.id}</span>
                                <span>{functionData.description.length} characters</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DescriptionTab; 