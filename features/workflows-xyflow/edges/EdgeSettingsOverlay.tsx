"use client";

import React from "react";
import FullScreenOverlay, { TabDefinition } from '@/components/official/FullScreenOverlay';
import { Edge } from '@xyflow/react';
import { SectionContainer, SectionTable, TableRowData } from '@/features/workflows-xyflow/common';
import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';

interface WorkflowEdgeData {
    connectionType?: string;
    sourceNode?: {
        id: string;
        step_name?: string;
        node_type?: string;
    };
    targetNode?: {
        id: string;
        step_name?: string;
        node_type?: string;
    };
    sourceOutput?: {
        broker_id?: string;
        name?: string;
        type?: string;
        format?: string;
        description?: string;
    };
    targetInput?: {
        arg_name?: string;
        type?: string;
        source_broker_id?: string;
        ready?: boolean;
        metadata?: any;
    };
    relay?: {
        type?: string;
        id?: string;
    };
    isTemporary?: boolean;
    createdAt?: string;
}

interface EdgeSettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    edge: Edge | null;
}

export const EdgeSettingsOverlay: React.FC<EdgeSettingsOverlayProps> = ({
    isOpen,
    onClose,
    edge
}) => {
    if (!edge) return null;

    // Cast edge data to our typed interface
    const edgeData = edge.data as WorkflowEdgeData;

    // Core edge information rows
    const coreInfoRows: TableRowData[] = [
        {
            key: "id",
            label: "Edge ID",
            content: <code className="px-2 py-1 rounded text-xs font-mono break-all">{edge.id}</code>,
        },
        {
            key: "type",
            label: "Edge Type",
            content: <Badge variant="secondary" className="text-xs">{edge.type || 'default'}</Badge>,
        },
        {
            key: "source",
            label: "Source Node",
            content: <code className="px-2 py-1 rounded text-xs font-mono break-all">{edge.source}</code>,
        },
        {
            key: "target",
            label: "Target Node",
            content: <code className="px-2 py-1 rounded text-xs font-mono break-all">{edge.target}</code>,
        },
        {
            key: "sourceHandle",
            label: "Source Handle",
            content: edge.sourceHandle ? (
                <code className="px-2 py-1 rounded text-xs font-mono break-all">{edge.sourceHandle}</code>
            ) : (
                <span className="text-xs text-muted-foreground">None</span>
            ),
        },
        {
            key: "targetHandle",
            label: "Target Handle",
            content: edge.targetHandle ? (
                <code className="px-2 py-1 rounded text-xs font-mono break-all">{edge.targetHandle}</code>
            ) : (
                <span className="text-xs text-muted-foreground">None</span>
            ),
        },
    ];

    // Workflow connection information rows
    const workflowInfoRows: TableRowData[] = [
        {
            key: "connectionType",
            label: "Connection Type",
            content: edgeData?.connectionType ? (
                <Badge variant="outline" className="text-xs">{edgeData.connectionType.replace('_', ' ')}</Badge>
            ) : (
                <span className="text-xs text-muted-foreground">Not specified</span>
            ),
        },
        {
            key: "isTemporary",
            label: "Temporary",
            content: (
                <Badge variant={edgeData?.isTemporary ? "destructive" : "secondary"} className="text-xs">
                    {edgeData?.isTemporary ? 'Temporary' : 'Permanent'}
                </Badge>
            ),
        },
        {
            key: "createdAt",
            label: "Created",
            content: edgeData?.createdAt ? (
                <span className="text-xs">{new Date(edgeData.createdAt).toLocaleString()}</span>
            ) : (
                <span className="text-xs text-muted-foreground">Unknown</span>
            ),
        },
    ];

    // Status information rows
    const statusRows: TableRowData[] = [
        {
            key: "selected",
            label: "Selected",
            content: (
                <Badge variant={edge.selected ? "default" : "secondary"} className="text-xs">
                    {edge.selected ? 'Selected' : 'Not Selected'}
                </Badge>
            ),
        },
        {
            key: "animated",
            label: "Animation",
            content: (
                <Badge variant={edge.animated ? "default" : "secondary"} className="text-xs">
                    {edge.animated ? 'Animated' : 'Static'}
                </Badge>
            ),
        },
        {
            key: "hidden",
            label: "Visibility",
            content: (
                <Badge variant={edge.hidden ? "destructive" : "default"} className="text-xs">
                    {edge.hidden ? 'Hidden' : 'Visible'}
                </Badge>
            ),
        },
        {
            key: "selectable",
            label: "Selectable",
            content: (
                <Badge variant={edge.selectable !== false ? "default" : "secondary"} className="text-xs">
                    {edge.selectable !== false ? 'Selectable' : 'Not Selectable'}
                </Badge>
            ),
        },
    ];

    // Styling rows
    const stylingRows: TableRowData[] = [
        {
            key: "className",
            label: "CSS Classes",
            content: edge.className ? (
                <code className="px-2 py-1 rounded text-xs font-mono break-all">{edge.className}</code>
            ) : (
                <span className="text-xs text-muted-foreground">No classes</span>
            ),
        },
        {
            key: "markerStart",
            label: "Start Marker",
            content: edge.markerStart ? (
                <code className="px-2 py-1 rounded text-xs font-mono">
                    {typeof edge.markerStart === 'string' ? edge.markerStart : JSON.stringify(edge.markerStart)}
                </code>
            ) : (
                <span className="text-xs text-muted-foreground">None</span>
            ),
        },
        {
            key: "markerEnd",
            label: "End Marker",
            content: edge.markerEnd ? (
                <code className="px-2 py-1 rounded text-xs font-mono">
                    {typeof edge.markerEnd === 'string' ? edge.markerEnd : JSON.stringify(edge.markerEnd)}
                </code>
            ) : (
                <span className="text-xs text-muted-foreground">None</span>
            ),
        },
    ];

    // Label configuration rows
    const labelRows: TableRowData[] = [
        {
            key: "label",
            label: "Label Content",
            content: edge.label ? (
                <code className="px-2 py-1 rounded text-xs font-mono">
                    {typeof edge.label === 'string' ? edge.label : 'React Component'}
                </code>
            ) : (
                <span className="text-xs text-muted-foreground">No label</span>
            ),
        },
        {
            key: "labelShowBg",
            label: "Show Background",
            content: (
                <Badge variant={edge.labelShowBg ? "default" : "secondary"} className="text-xs">
                    {edge.labelShowBg ? 'Enabled' : 'Disabled'}
                </Badge>
            ),
        },
        {
            key: "labelBgBorderRadius",
            label: "Border Radius",
            content: edge.labelBgBorderRadius ? (
                <code className="px-2 py-1 rounded text-xs font-mono">{edge.labelBgBorderRadius}px</code>
            ) : (
                <span className="text-xs text-muted-foreground">Default</span>
            ),
        },
        {
            key: "labelBgPadding",
            label: "Background Padding",
            content: edge.labelBgPadding ? (
                <code className="px-2 py-1 rounded text-xs font-mono">[{edge.labelBgPadding.join(', ')}]</code>
            ) : (
                <span className="text-xs text-muted-foreground">Default</span>
            ),
        },
    ];

    // Get arrays for workflow data tables
    const sourceOutputs = edgeData?.sourceOutput ? [edgeData.sourceOutput] : [];
    const targetInputs = edgeData?.targetInput ? [edgeData.targetInput] : [];
    const relays = edgeData?.relay ? [edgeData.relay] : [];

    // Define tab content
    const tabs: TabDefinition[] = [
        {
            id: 'basic-info',
            label: 'Basic Info',
            content: (
                <div className="h-full overflow-auto pr-2 space-y-6">
                    {/* Core Information */}
                    <SectionTable title="Core Information" rows={coreInfoRows} />

                    {/* Workflow Connection Information */}
                    <SectionTable title="Workflow Connection" rows={workflowInfoRows} />

                    {/* Status Information */}
                    <SectionTable title="Status" rows={statusRows} />
                </div>
            )
        },
        {
            id: 'workflow-connection',
            label: 'Workflow Connection',
            content: (
                <div className="h-full overflow-auto pr-2 space-y-6">
                    {/* Source Outputs */}
                    <SectionTable
                        title="Source Outputs"
                        headers={["Broker ID", "Name", "Type", "Format", "Description"]}
                        data={sourceOutputs}
                        renderRow={(output, index) => (
                            <>
                                <TableCell className="font-medium text-[10px] w-64 border-r border-border dark:border-border">
                                    <code className="px-2 py-1 rounded text-xs font-mono break-all">{output.broker_id || 'N/A'}</code>
                                </TableCell>
                                <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">
                                    {output.name || 'N/A'}
                                </TableCell>
                                <TableCell className="font-medium text-center text-xs w-24 border-r border-border dark:border-border">
                                    <Badge variant="secondary" className="text-xs">
                                        {output.type || 'N/A'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-center text-xs w-24 border-r border-border dark:border-border">
                                    <Badge variant="outline" className="text-xs">
                                        {output.format || 'N/A'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                    {output.description || 'No description'}
                                </TableCell>
                            </>
                        )}
                        emptyMessage="No source outputs defined"
                    />

                    {/* Target Inputs */}
                    <SectionTable
                        title="Target Inputs"
                        headers={["Argument Name", "Type", "Source Broker ID", "Ready", "Metadata"]}
                        data={targetInputs}
                        renderRow={(input, index) => (
                            <>
                                <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">
                                    {input.arg_name || 'N/A'}
                                </TableCell>
                                <TableCell className="font-medium text-center text-xs w-24 border-r border-border dark:border-border">
                                    <Badge variant="secondary" className="text-xs">
                                        {input.type || 'N/A'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-[10px] w-64 border-r border-border dark:border-border">
                                    <code className="px-2 py-1 rounded text-xs font-mono break-all">{input.source_broker_id || 'N/A'}</code>
                                </TableCell>
                                <TableCell className="font-medium text-center text-xs w-24 border-r border-border dark:border-border">
                                    <Badge variant={input.ready ? "default" : "destructive"} className="text-xs">
                                        {input.ready ? 'Ready' : 'Not Ready'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-xs">
                                    {input.metadata ? (
                                        <code className="px-2 py-1 rounded text-xs font-mono bg-muted">
                                            {JSON.stringify(input.metadata).substring(0, 50)}...
                                        </code>
                                    ) : (
                                        'None'
                                    )}
                                </TableCell>
                            </>
                        )}
                        emptyMessage="No target inputs defined"
                    />

                    {/* Relays */}
                    <SectionTable
                        title="Relays"
                        headers={["Type", "ID"]}
                        data={relays}
                        renderRow={(relay, index) => (
                            <>
                                <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">
                                    <Badge variant="outline" className="text-xs">
                                        {relay.type || 'N/A'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-xs">
                                    <code className="px-2 py-1 rounded text-xs font-mono break-all">{relay.id || 'N/A'}</code>
                                </TableCell>
                            </>
                        )}
                        emptyMessage="No relays defined"
                    />
                </div>
            )
        },
        {
            id: 'styling',
            label: 'Styling',
            content: (
                <div className="h-full overflow-auto pr-2 space-y-6">
                    {/* Styling Properties */}
                    <SectionTable title="Styling Properties" rows={stylingRows} />

                    {/* Inline Styles */}
                    {edge.style && (
                        <SectionContainer title="Inline Styles">
                            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap font-mono">{JSON.stringify(edge.style, null, 2)}</pre>
                        </SectionContainer>
                    )}
                </div>
            )
        },
        {
            id: 'labels',
            label: 'Labels',
            content: (
                <div className="h-full overflow-auto pr-2 space-y-6">
                    {/* Label Configuration */}
                    <SectionTable title="Label Configuration" rows={labelRows} />

                    {/* Label Style */}
                    {edge.labelStyle && (
                        <SectionContainer title="Label Style">
                            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap font-mono">{JSON.stringify(edge.labelStyle, null, 2)}</pre>
                        </SectionContainer>
                    )}

                    {/* Label Background Style */}
                    {edge.labelBgStyle && (
                        <SectionContainer title="Label Background Style">
                            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap font-mono">{JSON.stringify(edge.labelBgStyle, null, 2)}</pre>
                        </SectionContainer>
                    )}
                </div>
            )
        },
        {
            id: 'raw-data',
            label: 'Raw Data',
            content: (
                <div className="h-full overflow-auto pr-2 space-y-6">
                    {/* Custom Edge Data */}
                    <SectionContainer title="Custom Edge Data">
                        <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap font-mono">
                            {edge.data ? JSON.stringify(edge.data, null, 2) : 'No custom data'}
                        </pre>
                    </SectionContainer>

                    {/* Complete Edge Object */}
                    <SectionContainer title="Complete Edge Object">
                        <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap font-mono">
                            {JSON.stringify(edge, null, 2)}
                        </pre>
                    </SectionContainer>
                </div>
            )
        }
    ];

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title="Edge Settings"
            description={`Settings and data for edge: ${edge.id}`}
            tabs={tabs}
            initialTab="basic-info"
            onTabChange={(tab) => console.log('Edge settings tab changed:', tab)}
            showCancelButton={true}
            onCancel={onClose}
            cancelButtonLabel="Close"
            width="90vw"
            height="90vh"
        />
    );
}; 