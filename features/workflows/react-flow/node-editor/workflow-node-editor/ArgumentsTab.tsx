"use client";

import React from "react";
import { cloneDeep } from "lodash";
import { TabComponentProps, ArgumentOverride } from "@/features/workflows/types";
import { Button } from "@/components/ui/button";
import { Input, DeleteInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { getRegisteredFunctions } from "@/features/workflows/constants";

// Helper function to get the effective value for an argument
const getEffectiveArgValue = (arg: any, argOverrides?: ArgumentOverride[]): { value: any; ready: boolean } => {
    const override = argOverrides?.find((o) => o.name === arg.name);
    return {
        value: override?.default_value ?? arg.default_value ?? "",
        ready: override?.ready ?? arg.ready ?? false,
    };
};

const ArgumentsTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
    const functionData = getRegisteredFunctions().find((f) => f.id === node.function_id);

    const updateArgOverride = (argName: string, field: keyof ArgumentOverride, value: any) => {
        const updated = cloneDeep(node);
        if (!updated.arg_overrides) updated.arg_overrides = [];

        const existingIndex = updated.arg_overrides.findIndex((override) => override.name === argName);

        if (existingIndex >= 0) {
            updated.arg_overrides[existingIndex] = {
                ...updated.arg_overrides[existingIndex],
                [field]: value,
            };
        } else {
            const functionArg = functionData?.args.find((arg) => arg.name === argName);
            updated.arg_overrides.push({
                name: argName,
                default_value: functionArg?.default_value,
                ready: functionArg?.ready || false,
                [field]: value,
            });
        }

        onNodeUpdate(updated);
    };

    const handleArgValueChange = (arg: any, inputValue: string) => {
        let value: any = inputValue;

        // Convert value based on data type
        if (arg.data_type === "int") {
            value = inputValue ? parseInt(inputValue) || 0 : null;
        } else if (arg.data_type === "bool") {
            value = inputValue.toLowerCase() === "true";
        } else if (arg.data_type === "float") {
            value = inputValue ? parseFloat(inputValue) || 0 : null;
        }

        updateArgOverride(arg.name, "default_value", value);
    };

    const addBrokerMapping = (argName: string) => {
        const updated = cloneDeep(node);
        if (!updated.arg_mapping) updated.arg_mapping = [];
        updated.arg_mapping.push({
            source_broker_id: "",
            target_arg_name: argName,
        });
        onNodeUpdate(updated);
    };

    const updateBrokerMapping = (index: number, value: string) => {
        const updated = cloneDeep(node);
        if (!updated.arg_mapping) return;
        updated.arg_mapping[index] = {
            ...updated.arg_mapping[index],
            source_broker_id: value,
        };
        onNodeUpdate(updated);
    };

    const removeBrokerMapping = (index: number) => {
        const updated = cloneDeep(node);
        if (!updated.arg_mapping) return;
        updated.arg_mapping.splice(index, 1);
        onNodeUpdate(updated);
    };

    if (!functionData || functionData.args.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No arguments defined for this function.</div>;
    }

    // Separate required and optional arguments
    const requiredArgs = functionData.args.filter((arg) => arg.required);
    const optionalArgs = functionData.args.filter((arg) => !arg.required);

    const renderArgument = (arg: any) => {
        const effective = getEffectiveArgValue(arg, node.arg_overrides);
        const mappings = node.arg_mapping?.filter((m) => m.target_arg_name === arg.name) || [];
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
                                        onCheckedChange={(checked) => updateArgOverride(arg.name, "ready", !!checked)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Value:</Label>
                                    {isStringType ? (
                                        <Textarea
                                            value={String(effective.value)}
                                            onChange={(e) => handleArgValueChange(arg, e.target.value)}
                                            placeholder={`Enter ${arg.data_type} value`}
                                            className="text-xs resize-y min-h-[60px]"
                                            rows={3}
                                        />
                                    ) : (
                                        <Input
                                            value={String(effective.value)}
                                            onChange={(e) => handleArgValueChange(arg, e.target.value)}
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
                                        onClick={() => addBrokerMapping(arg.name)}
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
                                            const globalIndex =
                                                node.arg_mapping?.findIndex(
                                                    (m) =>
                                                        m.source_broker_id === mapping.source_broker_id &&
                                                        m.target_arg_name === mapping.target_arg_name
                                                ) || 0;

                                            return (
                                                <DeleteInput
                                                    key={mappingIndex}
                                                    value={mapping.source_broker_id}
                                                    onChange={(e) => updateBrokerMapping(globalIndex, e.target.value)}
                                                    placeholder="Broker ID"
                                                    className="font-mono text-xs"
                                                    onDelete={() => removeBrokerMapping(globalIndex)}
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
                            Can be left empty
                        </Badge>
                    </div>
                    <div className="space-y-3">{optionalArgs.map(renderArgument)}</div>
                </div>
            )}
        </div>
    );
};

export default ArgumentsTab;
