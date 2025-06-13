"use client";

import React from "react";
import { TabComponentProps } from "@/features/workflows/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import {
    getFunctionDataForMappings,
    addArgumentMapping,
    updateArgumentMapping,
    removeArgumentMapping,
    hasArgumentMappings,
} from "./utils/mapping-utils";

const MappingsTab: React.FC<TabComponentProps> = ({ nodeData, onNodeUpdate }) => {
    const functionData = getFunctionDataForMappings(nodeData.function_id);

    return (
        <div className="mt-4 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Argument Mappings</CardTitle>
                        <Button onClick={() => addArgumentMapping(nodeData, onNodeUpdate)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Mapping
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {hasArgumentMappings(nodeData) ? (
                        <div className="space-y-3">
                            {nodeData.arg_mapping.map((mapping: any, index: number) => (
                                <Card key={index} className="border-border">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 space-y-2">
                                                <Label>Source Broker ID</Label>
                                                <Input
                                                    value={mapping.source_broker_id}
                                                    onChange={(e) =>
                                                        updateArgumentMapping(
                                                            nodeData,
                                                            onNodeUpdate,
                                                            index,
                                                            "source_broker_id",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Enter broker ID"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label>Target Argument</Label>
                                                <Select
                                                    value={mapping.target_arg_name}
                                                    onValueChange={(value) =>
                                                        updateArgumentMapping(nodeData, onNodeUpdate, index, "target_arg_name", value)
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select argument" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {functionData?.args.map((arg: any) => (
                                                            <SelectItem key={arg.name} value={arg.name}>
                                                                {arg.name} ({arg.data_type})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => removeArgumentMapping(nodeData, onNodeUpdate, index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No argument mappings configured. Click "Add Mapping" to get started.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MappingsTab;
