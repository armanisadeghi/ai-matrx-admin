"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FunctionNode, TabComponentProps } from "@/features/workflows/types";
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';

/**
 * RecipeBasicInfoSection - Clean, simple basic info for recipe nodes
 */
const RecipeBasicInfoSection: React.FC<TabComponentProps> = ({ nodeData, onNodeUpdate, enrichedBrokers }) => {
    const handleStepNameChange = (stepName: string) => {
        onNodeUpdate({ ...nodeData, step_name: stepName });
    };

    const handleExecutionRequiredChange = (required: boolean) => {
        onNodeUpdate({ ...nodeData, execution_required: required });
    };

    return (
        <Card>
            <CardContent className="pt-0">
                <div className="grid grid-cols-4 gap-4 items-center">
                    {/* Step Name - Spans 2 columns for bigger input */}
                    <div className="col-span-2 space-y-1">
                        <Label htmlFor="step-name" className="text-xs font-medium text-muted-foreground">
                            Step Name
                        </Label>
                        <Input
                            id="step-name"
                            value={nodeData.step_name || ""}
                            onChange={(e) => handleStepNameChange(e.target.value)}
                            placeholder="Enter step name"
                            className="h-9 text-sm"
                        />
                    </div>

                    {/* Execution Required */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Execution</Label>
                        <div className="flex items-center space-x-2 h-9">
                            <Checkbox
                                id="execution-required"
                                checked={nodeData.execution_required || false}
                                onCheckedChange={handleExecutionRequiredChange}
                            />
                            <Label htmlFor="execution-required" className="text-xs font-medium">
                                Required
                            </Label>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                        <div className="flex items-center h-9">
                            <Badge variant={nodeData.status === "ready_to_execute" ? "default" : "secondary"} className="text-xs">
                                {nodeData.status || "pending"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default RecipeBasicInfoSection;
