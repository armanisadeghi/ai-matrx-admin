"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Zap, Copy } from "lucide-react";
import { DbFunctionNode } from "@/features/workflows/types";
import { NodeDefinitionType } from "../custom-nodes/custom-node-definitions";
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';
// Removed old broker system - using new enriched broker system

interface BrokersTabProps {
    nodeData: DbFunctionNode;
    onNodeUpdate: (nodeData: DbFunctionNode) => void;
    nodeDefinition: NodeDefinitionType;
    enrichedBrokers: EnrichedBroker[];
}

const BrokersTab: React.FC<BrokersTabProps> = ({ nodeData, onNodeUpdate, nodeDefinition, enrichedBrokers }) => {
    const returnBrokerOverrides = nodeData.return_broker_overrides || [];

    // Get predefined brokers from node definition if available
    const getPredefinedBrokers = () => {
        // Check if this is a recipe node with predefined brokers
        const nodeDefinition = nodeData.metadata?.nodeDefinition;
        if (!nodeDefinition?.predefined_brokers) return [];

        // Get the dynamic broker argument value (recipe_id)
        const dynamicBrokerArg = nodeDefinition.dynamic_broker_arg;
        const recipeIdArg = nodeData.arg_overrides?.find((arg) => arg.name === dynamicBrokerArg);
        const recipeId = recipeIdArg?.default_value as string;

        if (!recipeId) return [];

        // Process predefined brokers and replace dynamic IDs
        return nodeDefinition.predefined_brokers.map((broker: any) => ({
            id: broker.dynamic_id ? broker.id.replace(`{${dynamicBrokerArg}}`, recipeId) : broker.id,
            label: broker.label,
            description: broker.description,
            dataType: broker.dataType,
            guaranteed: broker.guaranteed,
        }));
    };

    const runtimeBrokers = getPredefinedBrokers();

    // Get predefined broker IDs for filtering
    const predefinedBrokerIds = new Set(runtimeBrokers.map((broker) => broker.id));

    // Filter out predefined brokers from the editable list (they show in Auto-Generated section)
    const editableReturnBrokerOverrides = returnBrokerOverrides.filter((brokerId) => !predefinedBrokerIds.has(brokerId));

    // Ensure predefined brokers are automatically added to return_broker_overrides
    React.useEffect(() => {
        if (runtimeBrokers.length > 0) {
            const predefinedBrokerIds = runtimeBrokers.map((broker) => broker.id);
            const currentOverrides = nodeData.return_broker_overrides || [];

            // Check if any predefined brokers are missing from overrides
            const missingBrokers = predefinedBrokerIds.filter((id) => !currentOverrides.includes(id));

            if (missingBrokers.length > 0) {
                const updatedOverrides = [...currentOverrides, ...missingBrokers];
                const updated = { ...nodeData, return_broker_overrides: updatedOverrides };

                onNodeUpdate(updated);
            }
        }
    }, [runtimeBrokers, nodeData, onNodeUpdate]);

    const addReturnBrokerOverride = () => {
        const updated = {
            ...nodeData,
            return_broker_overrides: [...returnBrokerOverrides, ""],
        };
        onNodeUpdate(updated);
    };

    const updateReturnBrokerOverride = (editableIndex: number, value: string) => {
        // Find the actual index in the full array
        const editableBrokers = returnBrokerOverrides.filter((brokerId) => !predefinedBrokerIds.has(brokerId));
        const brokerToUpdate = editableBrokers[editableIndex];
        const actualIndex = returnBrokerOverrides.indexOf(brokerToUpdate);

        const overrides = [...returnBrokerOverrides];
        overrides[actualIndex] = value;
        const updated = { ...nodeData, return_broker_overrides: overrides };
        onNodeUpdate(updated);
    };

    const removeReturnBrokerOverride = (editableIndex: number) => {
        // Find the actual index in the full array
        const editableBrokers = returnBrokerOverrides.filter((brokerId) => !predefinedBrokerIds.has(brokerId));
        const brokerToRemove = editableBrokers[editableIndex];
        const actualIndex = returnBrokerOverrides.indexOf(brokerToRemove);

        const overrides = returnBrokerOverrides.filter((_, i) => i !== actualIndex);
        const updated = { ...nodeData, return_broker_overrides: overrides };
        onNodeUpdate(updated);
    };

    return (
        <div className="mt-4 space-y-4">
            {/* Return Broker Overrides Section - FIRST */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg">Return Broker Overrides</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Custom broker IDs to return from this node in addition to auto-generated brokers.
                            </p>
                        </div>
                        <Button onClick={addReturnBrokerOverride} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Override
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {editableReturnBrokerOverrides.length > 0 ? (
                        <div className="space-y-3">
                            {editableReturnBrokerOverrides.map((brokerId, index) => (
                                <Card key={index} className="border-border">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 space-y-2">
                                                <Label>Broker ID</Label>
                                                <Input
                                                    value={brokerId}
                                                    onChange={(e) => updateReturnBrokerOverride(index, e.target.value)}
                                                    placeholder="Enter broker ID"
                                                />
                                            </div>
                                            <Button variant="outline" size="icon" onClick={() => removeReturnBrokerOverride(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No custom return broker overrides configured. Click "Add Override" to add custom brokers.
                            {runtimeBrokers.length > 0 && (
                                <div className="mt-2 text-sm">Auto-generated brokers are shown in the section below.</div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Auto-Generated Brokers Section - SECOND */}
            {runtimeBrokers.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-green-500" />
                            <CardTitle className="text-lg">Auto-Generated Brokers</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                                {runtimeBrokers.length} brokers
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            These brokers are automatically generated by this node when it executes.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left p-2 font-medium text-sm w-1/4">Label</th>
                                        <th className="text-left p-2 font-medium text-sm w-1/2">Broker ID</th>
                                        <th className="text-left p-2 font-medium text-sm w-1/8">Type</th>
                                        <th className="text-left p-2 font-medium text-sm w-1/8">Availability</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {runtimeBrokers.map((broker, index) => (
                                        <React.Fragment key={broker.id}>
                                            <tr className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                                <td className="p-2 w-1/4">
                                                    <div className="text-sm font-medium text-blue-500">{broker.label}</div>
                                                </td>
                                                <td className="p-2 w-1/2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono break-all">{broker.id}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 flex-shrink-0"
                                                            onClick={() => navigator.clipboard.writeText(broker.id)}
                                                            title="Copy to clipboard"
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className="p-2 w-1/8">
                                                    <Badge variant="outline" className="text-xs">
                                                        {broker.dataType}
                                                    </Badge>
                                                </td>
                                                <td className="p-2 w-1/8">
                                                    <Badge variant={broker.guaranteed ? "default" : "secondary"} className="text-xs">
                                                        {broker.guaranteed ? "Guaranteed" : "Conditional"}
                                                    </Badge>
                                                </td>
                                            </tr>
                                            {broker.description && (
                                                <tr className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                                    <td colSpan={4} className="px-2 pb-2 pt-0">
                                                        <div className="text-sm text-muted-foreground py-1">{broker.description}</div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default BrokersTab;
