'use client';

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DbFunctionNode } from '@/features/workflows/types';
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';

interface BasicInfoSectionProps {
    nodeData: DbFunctionNode;
    onNodeUpdate: (nodeData: DbFunctionNode) => void;
    enrichedBrokers: EnrichedBroker[];
}

/**
 * BasicInfoSection - Handles step name, function type, execution required, and node/workflow IDs
 */
const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({ nodeData, onNodeUpdate, enrichedBrokers }) => {
    const updateNodeField = (field: keyof DbFunctionNode, value: any) => {
        onNodeUpdate({ ...nodeData, [field]: value });
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-6">
                    {/* Left column - editable fields */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="step-name" className="text-xs font-medium text-muted-foreground">Step Name</Label>
                                <Input
                                    id="step-name"
                                    value={nodeData.step_name || ''}
                                    onChange={(e) => updateNodeField('step_name', e.target.value)}
                                    placeholder="Enter step name"
                                    className={`h-8 text-sm placeholder:text-muted-foreground ${
                                        (nodeData.step_name || '') === 'Unnamed Step' 
                                            ? 'text-muted-foreground dark:text-muted-foreground' 
                                            : ''
                                    }`}
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <Label htmlFor="function-type" className="text-xs font-medium text-muted-foreground">Function Type</Label>
                                <Select
                                    value={nodeData.function_type || 'registered_function'}
                                    onValueChange={(value) => updateNodeField('function_type', value)}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Select function type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="registered_function">Registered Function</SelectItem>
                                        <SelectItem value="custom_function">Custom Function</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="execution-required"
                                    checked={nodeData.execution_required || false}
                                    onCheckedChange={(checked) => updateNodeField('execution_required', !!checked)}
                                />
                                <Label htmlFor="execution-required" className="text-xs font-medium">Execution Required</Label>
                            </div>
                            
                            <Badge variant={nodeData.status === 'ready_to_execute' ? 'default' : 'secondary'} className="text-xs">
                                {nodeData.status || 'pending'}
                            </Badge>
                        </div>
                    </div>

                    {/* Right column - read-only info */}
                    <div className="space-y-3 text-xs">
                        <div>
                            <span className="text-muted-foreground font-medium">Node ID:</span>
                            <div className="font-mono bg-muted px-2 py-1 rounded mt-1 break-all text-xs">{nodeData.id}</div>
                        </div>
                        <div>
                            <span className="text-muted-foreground font-medium">Workflow ID:</span>
                            <div className="font-mono bg-muted px-2 py-1 rounded mt-1 break-all text-xs">
                                {nodeData.workflow_id || <span className="text-muted-foreground italic">Not assigned</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default BasicInfoSection; 