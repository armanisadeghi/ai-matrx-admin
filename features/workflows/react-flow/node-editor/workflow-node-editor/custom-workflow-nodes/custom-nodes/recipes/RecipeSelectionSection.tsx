"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import { FunctionNode, TabComponentProps } from "@/features/workflows/types";

// Import our centralized utilities
import {
    updateArgOverride,
    updateMultipleArgOverrides,
    setArgValueAndReady,
    getFunctionData,
    getEffectiveArgValue,
    getAllReturnBrokers,
} from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils";

/**
 * RecipeSelectionSection - Recipe selection with version control and return brokers
 * Now uses centralized utilities directly instead of context
 */
const RecipeSelectionSection: React.FC<TabComponentProps> = ({ nodeData, onNodeUpdate }) => {
    const { quickReferenceKeyDisplayPairs } = useFetchQuickRef("recipe");

    const functionData = getFunctionData(nodeData.function_id);

    const getArgOverride = (argName: string) => {
        return nodeData.arg_overrides?.find((o) => o.name === argName);
    };

    const recipeIdOverride = getArgOverride("recipe_id");
    const latestVersionOverride = getArgOverride("latest_version");
    const versionOverride = getArgOverride("version");

    const selectedRecipeId = recipeIdOverride?.default_value || "";
    const useLatestVersion = latestVersionOverride?.default_value !== false;
    const specificVersion = versionOverride?.default_value?.toString() || "";

    // Handle recipe selection changes
    const handleRecipeChange = (recipeId: string) => {
        if (recipeId) {
            setArgValueAndReady(nodeData, onNodeUpdate, "recipe_id", recipeId, true);
        } else {
            setArgValueAndReady(nodeData, onNodeUpdate, "recipe_id", "", false);
        }
    };

    const handleLatestVersionChange = (checked: boolean) => {
        if (checked) {
            updateMultipleArgOverrides(nodeData, onNodeUpdate, [
                { argName: "latest_version", value: true, ready: true },
                { argName: "version", value: null, ready: false }
            ]);
        } else {
            setArgValueAndReady(nodeData, onNodeUpdate, "latest_version", false, true);
        }
    };

    const handleVersionChange = (version: string) => {
        if (version && !useLatestVersion) {
            const versionNumber = parseInt(version);
            if (!isNaN(versionNumber)) {
                setArgValueAndReady(nodeData, onNodeUpdate, "version", versionNumber, true);
            }
        }
    };

    const allReturnBrokers = getAllReturnBrokers(nodeData, functionData);

    return (
        <Card>
            <CardContent className="pt-0 space-y-4">
                {/* Recipe Selection Row */}
                <div className="grid grid-cols-4 gap-4">
                    {/* Recipe Selection */}
                    <div className="space-y-1">
                        <Label htmlFor="recipe-select" className="text-xs font-medium text-muted-foreground">
                            Select Recipe
                        </Label>
                        <Select value={selectedRecipeId} onValueChange={handleRecipeChange}>
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select a recipe" />
                            </SelectTrigger>
                            <SelectContent>
                                {quickReferenceKeyDisplayPairs?.map((record) => {
                                    const actualId = record.recordKey.replace(/^id:/, "");
                                    return (
                                        <SelectItem key={record.recordKey} value={actualId}>
                                            {record.displayValue}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Latest Version Checkbox */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Version Control</Label>
                        <div className="flex items-center space-x-2 h-8">
                            <Checkbox
                                id="latest-version"
                                checked={useLatestVersion}
                                onCheckedChange={(checked) => handleLatestVersionChange(!!checked)}
                            />
                            <Label htmlFor="latest-version" className="text-xs font-medium">
                                Latest Version
                            </Label>
                        </div>
                    </div>

                    {/* Version Number Input */}
                    <div className="space-y-1">
                        <Label htmlFor="version-input" className="text-xs font-medium text-muted-foreground">
                            {useLatestVersion ? "Version Number" : "Specific Version"}
                        </Label>
                        <Input
                            id="version-input"
                            value={specificVersion}
                            onChange={(e) => handleVersionChange(e.target.value)}
                            placeholder="e.g., 1.2.3"
                            className="h-8 text-sm"
                            disabled={useLatestVersion}
                        />
                    </div>

                    {/* Empty column for future use */}
                    <div className="space-y-1">{/* Reserved for additional controls */}</div>
                </div>

                {/* Return Brokers */}
                {allReturnBrokers.length > 0 && (
                    <div>
                        <Label className="text-xs text-muted-foreground font-medium">Return Brokers:</Label>
                        <div className="space-y-1 mt-1">
                            {allReturnBrokers.map((broker, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                    <span className="font-mono text-xs">{broker.id}</span>
                                    <Badge variant={broker.type === "default" ? "secondary" : "outline"} className="text-xs">
                                        {broker.type === "default" ? "Default" : "Additional Override"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RecipeSelectionSection;
