"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { DefaultTabProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
    Table, 
    TableHeader, 
    TableBody, 
    TableHead, 
    TableRow, 
    TableCell 
} from "@/components/ui/table";

export const RegisteredFunctionTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId || ""));

    const registeredFunction = nodeData?.metadata?.registered_function;

    if (!registeredFunction) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                No registered function data available
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-4 space-y-4">
            {/* Header - Name, Category, Node Description */}
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-foreground dark:text-foreground">
                        {registeredFunction.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                        {registeredFunction.category}
                    </Badge>
                </div>
                {registeredFunction.node_description && (
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        {registeredFunction.node_description}
                    </p>
                )}
            </div>

            {/* Arguments */}
            {registeredFunction.args && registeredFunction.args.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground dark:text-foreground">Arguments</h4>
                    <div className="border-2 border-blue-500 rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 dark:bg-muted/50">
                                    <TableHead className="font-semibold">Name</TableHead>
                                    <TableHead className="font-semibold">Type</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold">Description</TableHead>
                                    <TableHead className="font-semibold">Default/Examples</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registeredFunction.args.map((arg, index) => (
                                    <TableRow 
                                        key={index} 
                                        className={index % 2 === 0 
                                            ? "bg-background dark:bg-background" 
                                            : "bg-muted/30 dark:bg-muted/30"
                                        }
                                    >
                                        <TableCell className="font-medium text-xs">
                                            {arg.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={arg.required ? "destructive" : "secondary"} className="text-xs">
                                                    {arg.data_type}
                                                </Badge>
                                                {arg.required && (
                                                    <Badge variant="outline" className="text-xs">
                                                        required
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={arg.ready ? "default" : "secondary"} className="text-xs">
                                                {arg.ready ? "ready" : "not ready"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            {arg.description && (
                                                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                                    {arg.description}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            <div className="space-y-1">
                                                {arg.default_value !== null && (
                                                    <div className="text-xs">
                                                        <span className="text-muted-foreground dark:text-muted-foreground">Default: </span>
                                                        <code className="bg-muted dark:bg-muted px-1 rounded text-foreground dark:text-foreground">
                                                            {JSON.stringify(arg.default_value)}
                                                        </code>
                                                    </div>
                                                )}
                                                {arg.examples && (
                                                    <div className="text-xs">
                                                        <span className="text-muted-foreground dark:text-muted-foreground">Examples: </span>
                                                        <code className="bg-muted dark:bg-muted px-1 rounded text-foreground dark:text-foreground">
                                                            {JSON.stringify(arg.examples)}
                                                        </code>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
            {/* Return Broker */}
            {registeredFunction.return_broker && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground dark:text-foreground">Return Value</h4>
                    <div className="border border-border dark:border-border rounded-lg overflow-hidden">
                        <Table>
                            <TableBody>
                                <TableRow className="bg-background dark:bg-background">
                                    <TableCell className="font-medium text-xs w-48">ID</TableCell>
                                    <TableCell>
                                        <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">
                                            {registeredFunction.return_broker.id}
                                        </code>
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/30 dark:bg-muted/30">
                                    <TableCell className="font-medium text-xs w-48">Name</TableCell>
                                    <TableCell className="font-medium">
                                        {registeredFunction.return_broker.name}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-background dark:bg-background">
                                    <TableCell className="font-medium text-xs w-48">Data Type</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-xs">
                                            {registeredFunction.return_broker.dataType}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/30 dark:bg-muted/30">
                                    <TableCell className="font-medium text-xs w-48">Color</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {registeredFunction.return_broker.color ? (
                                                <>
                                                    <div 
                                                        className="w-4 h-4 rounded-full border border-border dark:border-border"
                                                        style={{ backgroundColor: registeredFunction.return_broker.color }}
                                                    />
                                                    <span className="text-sm">{registeredFunction.return_broker.color}</span>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">None</span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-background dark:bg-background">
                                    <TableCell className="font-medium text-xs w-48">Default Scope</TableCell>
                                    <TableCell>
                                        {registeredFunction.return_broker.defaultScope !== null ? (
                                            <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">
                                                {JSON.stringify(registeredFunction.return_broker.defaultScope)}
                                            </code>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">null</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/30 dark:bg-muted/30">
                                    <TableCell className="font-medium text-xs w-48">Default Value</TableCell>
                                    <TableCell>
                                        {registeredFunction.return_broker.defaultValue !== null ? (
                                            <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">
                                                {JSON.stringify(registeredFunction.return_broker.defaultValue)}
                                            </code>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">null</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-background dark:bg-background">
                                    <TableCell className="font-medium text-xs w-48">Input Component</TableCell>
                                    <TableCell>
                                        {registeredFunction.return_broker.inputComponent !== null ? (
                                            <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">
                                                {JSON.stringify(registeredFunction.return_broker.inputComponent)}
                                            </code>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">null</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/30 dark:bg-muted/30">
                                    <TableCell className="font-medium text-xs w-48">Output Component</TableCell>
                                    <TableCell>
                                        {registeredFunction.return_broker.outputComponent !== null ? (
                                            <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">
                                                {JSON.stringify(registeredFunction.return_broker.outputComponent)}
                                            </code>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">null</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-background dark:bg-background">
                                    <TableCell className="font-medium text-xs w-48">Field Component ID</TableCell>
                                    <TableCell>
                                        {registeredFunction.return_broker.fieldComponentId !== null ? (
                                            <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">
                                                {registeredFunction.return_broker.fieldComponentId}
                                            </code>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">null</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Function ID */}
            <div className="pt-2 border-t border-border dark:border-border">
                <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                    ID: <code className="bg-muted dark:bg-muted px-1 rounded">{registeredFunction.id}</code>
                </div>
            </div>


            {/* Description */}
            {registeredFunction.description && (
                <Card className="p-3 bg-background">
                    <pre className="text-xs text-foreground dark:text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                        {registeredFunction.description.trim()}
                    </pre>
                </Card>
            )}


            <div className="h-full">
                Raw Function Data: <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto h-full">{JSON.stringify(registeredFunction, null, 2)}</pre>
            </div>

        </div>
    );
};

export default RegisteredFunctionTab;
