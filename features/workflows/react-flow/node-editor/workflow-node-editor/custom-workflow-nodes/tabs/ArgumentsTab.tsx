"use client";

import React from "react";
import { getRegisteredFunctions } from "@/features/workflows/constants";
import { Button } from "@/components/ui/button";
import { Input, DeleteInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { BaseNode } from '@/features/workflows/types';
import { 
    updateArgOverride,
    handleArgValueChange,
    getEffectiveArgValue,
    addBrokerMapping,
    updateBrokerMapping,
    removeBrokerMapping,
    getBrokerMappingsForArg
} from '@/features/workflows/react-flow/node-editor/workflow-node-editor/utils';

interface ArgumentsTabProps {
    node: BaseNode;
    onNodeUpdate: (updatedNode: BaseNode) => void;
    argsToHide?: string[]; // Optional array of argument names to hide from display
}

const ArgumentsTab: React.FC<ArgumentsTabProps> = ({ node, onNodeUpdate, argsToHide = [] }) => {
    const functionData = getRegisteredFunctions().find((f) => f.id === node.function_id);

    if (!functionData || functionData.args.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No arguments defined for this function.</div>;
    }

    // Filter out hidden arguments but keep the original functionality
    const visibleArgs = functionData.args.filter((arg) => !argsToHide.includes(arg.name));

    // Separate required and optional arguments from visible args only
    const requiredArgs = visibleArgs.filter((arg) => arg.required);
    const optionalArgs = visibleArgs.filter((arg) => !arg.required);

    const renderArgument = (arg: any) => {
        const effective = getEffectiveArgValue(arg, node.arg_overrides);
        const mappings = getBrokerMappingsForArg(node, arg.name);
        const isStringType = arg.data_type === "str";

        return (
            <Card key={arg.name} className="border-border">
                <CardContent className="p-4">
                    <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{arg.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                    {arg.data_type}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Option 1: Direct Value */}
                            <div className="space-y-3 p-3 bg-green-50 dark:bg-green-950/20 rounded border">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-green-700 dark:text-green-300">Option 1: Direct Value</span>
                                    <Checkbox
                                        checked={effective.ready}
                                        onCheckedChange={(checked) => updateArgOverride(node, onNodeUpdate, arg.name, "ready", !!checked)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Value:</Label>
                                    {isStringType ? (
                                        <Textarea
                                            value={String(effective.value)}
                                            onChange={(e) => handleArgValueChange(node, onNodeUpdate, arg, e.target.value)}
                                            placeholder={`Enter ${arg.data_type} value`}
                                            className="text-xs resize-y min-h-[60px]"
                                            rows={3}
                                        />
                                    ) : (
                                        <Input
                                            value={String(effective.value)}
                                            onChange={(e) => handleArgValueChange(node, onNodeUpdate, arg, e.target.value)}
                                            placeholder={`Enter ${arg.data_type} value`}
                                            className="text-xs h-8"
                                        />
                                    )}
                                </div>

                                {effective.ready && (
                                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        ✓ Ready - will use this value
                                    </div>
                                )}
                            </div>

                            {/* Option 2: Broker Mapping */}
                            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Option 2: Broker Mapping</span>
                                    <Button
                                        onClick={() => addBrokerMapping(node, onNodeUpdate, arg.name)}
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-xs"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Map
                                    </Button>
                                </div>

                                {mappings.length > 0 ? (
                                    <div className="space-y-2">
                                        {mappings.map((mapping, mappingIndex) => {
                                            // Find the global index for this mapping
                                            const allMappings = node.arg_mapping || [];
                                            const globalIndex = allMappings.findIndex(
                                                (m) => m.source_broker_id === mapping.source_broker_id && 
                                                       m.target_arg_name === mapping.target_arg_name
                                            );

                                            return (
                                                <DeleteInput
                                                    key={mappingIndex}
                                                    value={mapping.source_broker_id}
                                                    onChange={(e) => updateBrokerMapping(node, onNodeUpdate, globalIndex, e.target.value)}
                                                    placeholder="Broker ID"
                                                    className="font-mono text-xs"
                                                    onDelete={() => removeBrokerMapping(node, onNodeUpdate, globalIndex)}
                                                />
                                            );
                                        })}
                                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                            ✓ Mapped - will get value at runtime
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground">No brokers mapped. Click "Map" to add.</div>
                                )}
                            </div>
                        </div>

                        {/* Status indicator for required args */}
                        {arg.required && (
                            <div className="pt-2 border-t">
                                {effective.ready || mappings.length > 0 ? (
                                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        ✅ Required argument satisfied
                                    </div>
                                ) : effective.value && effective.value !== "" && !effective.ready && mappings.length === 0 ? (
                                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                        🛑 Arguments must be marked as 'ready' to be used in the workflow
                                    </div>
                                ) : (
                                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                        ⚠️ Required argument needs either a value OR broker mapping
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6 p-4">
            {/* Required Arguments */}
            {requiredArgs.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">Required Arguments</h3>
                        <Badge variant="destructive" className="text-xs">
                            Must be configured
                        </Badge>
                    </div>
                    <div className="space-y-3">{requiredArgs.map(renderArgument)}</div>
                </div>
            )}

            {/* Optional Arguments */}
            {optionalArgs.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">Optional Arguments</h3>
                        <Badge variant="secondary" className="text-xs">
                            Configure as needed
                        </Badge>
                    </div>
                    <div className="space-y-3">{optionalArgs.map(renderArgument)}</div>
                </div>
            )}
        </div>
    );
};

export default ArgumentsTab; 