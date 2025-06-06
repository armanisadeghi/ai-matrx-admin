'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BaseNode } from '@/features/workflows/types';
import {
    getFunctionData,
    getArgumentsWithData,
    getEffectiveArgValue,
    getBrokerMappingsForArg
} from '@/features/workflows/react-flow/node-editor/workflow-node-editor/utils';

interface ArgumentsMappingsSectionProps {
    node: BaseNode;
    onNodeUpdate: (updatedNode: BaseNode) => void;
}

/**
 * ArgumentsMappingsSection - Displays the arguments and mappings table
 */
const ArgumentsMappingsSection: React.FC<ArgumentsMappingsSectionProps> = ({ node, onNodeUpdate }) => {
    const functionData = getFunctionData(node.function_id);
    const argumentsWithData = getArgumentsWithData(node, functionData);

    // Don't render if no arguments
    if (argumentsWithData.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Arguments & Mappings</h3>
                <Table>
                    <TableHeader>
                        <TableRow className="text-xs">
                            <TableHead className="h-8">Name</TableHead>
                            <TableHead className="h-8">Type</TableHead>
                            <TableHead className="h-8">Required</TableHead>
                            <TableHead className="h-8">Default Value</TableHead>
                            <TableHead className="h-8">Ready</TableHead>
                            <TableHead className="h-8">Mapped Source</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {argumentsWithData.map((arg, index) => {
                            const effectiveValue = getEffectiveArgValue(arg, node.arg_overrides);
                            const mappings = getBrokerMappingsForArg(node, arg.name);
                            const override = node.arg_overrides?.find(o => o.name === arg.name);

                            return (
                                <TableRow key={index} className="text-xs">
                                    <TableCell className="py-2 font-medium">{arg.name}</TableCell>
                                    <TableCell className="py-2">
                                        <Badge variant="outline" className="text-xs">{arg.data_type}</Badge>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        {arg.required ? (
                                            <Badge variant="destructive" className="text-xs">Required</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">Optional</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        {override?.default_value !== undefined ? (
                                            <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
                                                {JSON.stringify(override.default_value)}
                                            </span>
                                        ) : arg.default_value !== null ? (
                                            <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
                                                {JSON.stringify(arg.default_value)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        {effectiveValue.ready ? (
                                            <Badge variant="default" className="text-xs">Ready</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">Not Ready</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        {mappings.length > 0 ? (
                                            <span className="font-mono bg-blue-50 dark:bg-blue-950 px-1 py-0.5 rounded text-xs">
                                                {mappings[0].source_broker_id}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default ArgumentsMappingsSection; 