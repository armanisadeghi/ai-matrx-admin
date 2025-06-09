"use client";
import React, { useState } from "react";
import { X, ArrowRight, Database, GitBranch, Link, Zap, Trash2, Copy, Download, Settings, AlertTriangle, Info, Edit2, Check } from "lucide-react";
import { Edge } from "reactflow";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteWorkflowEdge, saveWorkflowEdge } from "@/features/workflows/service/workflowService";

interface EdgeDetailOverlayProps {
    edge: Edge | null;
    isOpen: boolean;
    onClose: () => void;
    onEdgeDeleted?: () => void;
    onEdgeUpdated?: () => void;
    workflowId?: string;
}

/**
 * Get connection type details for styling and display
 */
function getConnectionTypeInfo(connectionType: string) {
    switch (connectionType) {
        case "to_argument":
            return {
                icon: Link,
                label: "Argument Mapping",
                description: "Node consumes data from broker for function argument",
                businessLogic:
                    "This edge exists because a workflow node needs specific data from a broker to execute its function. The broker acts as a data source, and this connection ensures the node receives the required input parameter.",
                color: "emerald",
                bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
                borderColor: "border-emerald-200 dark:border-emerald-700",
                textColor: "text-emerald-700 dark:text-emerald-300",
                iconColor: "text-emerald-500",
            };
        case "to_relay":
            return {
                icon: ArrowRight,
                label: "Relay Connection",
                description: "Broker data is relayed to multiple targets",
                businessLogic:
                    "This edge exists to distribute data from one broker to multiple downstream consumers. It's part of the event-driven architecture where a single data source needs to notify or feed multiple dependent processes.",
                color: "blue",
                bgColor: "bg-blue-50 dark:bg-blue-950/50",
                borderColor: "border-blue-200 dark:border-blue-700",
                textColor: "text-blue-700 dark:text-blue-300",
                iconColor: "text-blue-500",
            };
        case "to_dependency":
            return {
                icon: GitBranch,
                label: "Dependency Connection",
                description: "Node waits for dependency before execution",
                businessLogic:
                    "This edge exists to enforce execution order in the workflow. The target node cannot execute until the source broker signals completion or provides required data. This prevents race conditions and ensures proper workflow sequencing.",
                color: "red",
                bgColor: "bg-red-50 dark:bg-red-950/50",
                borderColor: "border-red-200 dark:border-red-700",
                textColor: "text-red-700 dark:text-red-300",
                iconColor: "text-red-500",
            };
        default:
            return {
                icon: Database,
                label: "Unknown Connection",
                description: "Unknown connection type",
                businessLogic:
                    "This edge exists for an unknown reason. It may be a manually created connection or an edge type that hasn't been properly categorized. Review the edge data to understand its purpose.",
                color: "gray",
                bgColor: "bg-gray-50 dark:bg-gray-800",
                borderColor: "border-gray-200 dark:border-gray-700",
                textColor: "text-gray-700 dark:text-gray-300",
                iconColor: "text-gray-500",
            };
    }
}

export function EdgeDetailOverlay({ edge, isOpen, onClose, onEdgeDeleted, onEdgeUpdated, workflowId }: EdgeDetailOverlayProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [labelValue, setLabelValue] = useState("");
    const [isSavingLabel, setIsSavingLabel] = useState(false);

    if (!isOpen || !edge) return null;

    const connectionType = edge.data?.connectionType || "unknown";
    const sourceBrokerId = edge.data?.sourceBrokerId;
    const label = edge.data?.label || "Unlabeled Connection";
    const metadata = edge.data?.metadata || {};

    const typeInfo = getConnectionTypeInfo(connectionType);
    const IconComponent = typeInfo.icon;

    // Initialize label value when edge changes
    React.useEffect(() => {
        if (edge) {
            setLabelValue(edge.data?.label || "");
        }
    }, [edge]);

    const saveLabel = async () => {
        if (!edge.id || !edge.data || !workflowId) return;
        
        setIsSavingLabel(true);
        try {
            const updatedEdgeData = {
                id: edge.id,
                source_node_id: edge.source,
                target_node_id: edge.target,
                source_handle: edge.sourceHandle,
                target_handle: edge.targetHandle,
                edge_type: edge.type || 'default',
                animated: edge.animated || false,
                style: edge.style || null,
                metadata: {
                    ...metadata,
                    label: labelValue
                }
            };

            await saveWorkflowEdge(workflowId, updatedEdgeData);
            
            // Update the edge data locally
            edge.data.label = labelValue;
            
            onEdgeUpdated?.();
        } catch (error) {
            console.error("Error saving edge label:", error);
        } finally {
            setIsSavingLabel(false);
        }
    };

    const handleDeleteEdge = async () => {
        if (!edge?.id) return;

        setIsDeleting(true);
        try {
            await deleteWorkflowEdge(edge.id);
            onEdgeDeleted?.();
            onClose();
        } catch (error) {
            console.error("Error deleting edge:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const copyToClipboard = (data: any) => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    };

    const downloadJson = (data: any, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />

            {/* Overlay Content */}
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <IconComponent className={`w-6 h-6 ${typeInfo.iconColor}`} />
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{typeInfo.label}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{typeInfo.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleDeleteEdge} disabled={isDeleting} variant="destructive" size="sm" className="gap-2">
                            <Trash2 className="w-4 h-4" />
                            {isDeleting ? "Deleting..." : "Delete Edge"}
                        </Button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Content with Tabs */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                        <TabsList className="mt-4">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="why">Why This Edge Exists</TabsTrigger>
                            <TabsTrigger value="admin">Admin</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 min-h-0 overflow-y-auto p-6">
                            {/* Overview Tab */}
                            <TabsContent value="overview" className="mt-0 space-y-6">
                                {/* Editable Label Section */}
                                <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                                    <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                                        <Edit2 className="w-4 h-4 text-blue-500" />
                                        Connection Label
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={labelValue}
                                            onChange={(e) => setLabelValue(e.target.value)}
                                            className="flex-1 bg-white dark:bg-gray-800"
                                            placeholder="Enter connection label..."
                                        />
                                        <Button
                                            onClick={saveLabel}
                                            disabled={isSavingLabel || labelValue === label}
                                            size="sm"
                                            className="gap-1"
                                        >
                                            <Check className="w-3 h-3" />
                                            {isSavingLabel ? "Saving..." : "Save"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Primary Focus: The Broker */}
                                <div className={`${typeInfo.bgColor} ${typeInfo.borderColor} border rounded-lg p-4`}>
                                    <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                                        <Database className={`w-4 h-4 ${typeInfo.iconColor}`} />
                                        Broker ID
                                    </h3>
                                    <div className="font-mono text-lg bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-300 dark:border-gray-600">
                                        {sourceBrokerId || "Unknown Broker"}
                                    </div>
                                </div>

                                {/* Connection Flow */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                    {/* Source Node */}
                                    <div className="md:col-span-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Node</h4>
                                        <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">{edge.source}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            Handle: {edge.sourceHandle || "default"}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="md:col-span-2 flex justify-center">
                                        <ArrowRight className={`w-8 h-8 ${typeInfo.iconColor}`} />
                                    </div>

                                    {/* Target Node */}
                                    <div className="md:col-span-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Node</h4>
                                        <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">{edge.target}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            Handle: {edge.targetHandle || "default"}
                                        </div>
                                    </div>
                                </div>

                                {/* Connection Details */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Connection Details</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Basic Properties */}
                                        <div className="space-y-3">
                                            <div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Type:</span>
                                                <div className="text-sm font-mono">{edge.type || "default"}</div>
                                                {/* Edge ID moved here with full width and small text */}
                                                <div className="mt-1">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Edge ID:</span>
                                                    <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                                                        {edge.id}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Metadata */}
                                        <div className="space-y-3">
                                            {metadata.targetArgName && (
                                                <div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Target Argument:</span>
                                                    <div className={`text-sm font-mono ${typeInfo.textColor}`}>
                                                        {metadata.targetArgName}
                                                    </div>
                                                </div>
                                            )}
                                            {metadata.relayLabel && (
                                                <div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Relay Label:</span>
                                                    <div className={`text-sm ${typeInfo.textColor}`}>{metadata.relayLabel}</div>
                                                </div>
                                            )}
                                            {metadata.dependencyHasTarget !== undefined && (
                                                <div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Has Target Broker:</span>
                                                    <div className="text-sm">{metadata.dependencyHasTarget ? "✅ Yes" : "❌ No"}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Style Info */}
                                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Visual Style</h4>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Stroke:</span>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                                                    style={{ backgroundColor: edge.style?.stroke || "#000" }}
                                                />
                                                <span className="font-mono text-xs">{edge.style?.stroke || "default"}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Width:</span>
                                            <div className="font-mono">{edge.style?.strokeWidth || 1}px</div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Dash:</span>
                                            <div className="font-mono text-xs">{edge.style?.strokeDasharray || "solid"}</div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Why This Edge Exists Tab */}
                            <TabsContent value="why" className="mt-0 h-full">
                                <div className="h-full overflow-y-auto space-y-6 pr-2">
                                    <Card className={`${typeInfo.bgColor} ${typeInfo.borderColor} border`}>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Info className={`w-5 h-5 ${typeInfo.iconColor}`} />
                                                Business Logic Explanation
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className={`${typeInfo.textColor} text-sm leading-relaxed`}>{typeInfo.businessLogic}</p>

                                            {/* NEW: Show known broker information if available */}
                                            {edge.data?.metadata?.isKnownBroker && (
                                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                                                    <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">
                                                        Known Broker Details
                                                    </h4>
                                                    <div className="space-y-1 text-sm">
                                                        {edge.data.metadata.knownBrokerLabel && (
                                                            <div>
                                                                <span className="text-blue-600 dark:text-blue-400 font-medium">Label:</span>{" "}
                                                                {edge.data.metadata.knownBrokerLabel}
                                                            </div>
                                                        )}
                                                        {edge.data.metadata.knownBrokerDescription && (
                                                            <div>
                                                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                                    Description:
                                                                </span>{" "}
                                                                {edge.data.metadata.knownBrokerDescription}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                                                            ℹ️ This edge uses a broker that was automatically identified by the Known
                                                            Brokers Registry
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Event-Driven Context */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Zap className="w-5 h-5 text-yellow-500" />
                                                Event-Driven System Context
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                                                        Auto-Generation
                                                    </h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        This edge was automatically created based on broker relationships and workflow
                                                        requirements. It represents a data flow or dependency in your event-driven
                                                        architecture.
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Purpose</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Edges are visual representations of actual data flows and dependencies. They help
                                                        you understand how information moves through your workflow system.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Broker Connection Details */}
                                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                                                <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">
                                                    Broker Connection Analysis
                                                </h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">Source Broker:</span>
                                                        <span className="font-mono text-blue-600 dark:text-blue-400">
                                                            {sourceBrokerId || "Unknown"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">Connection Type:</span>
                                                        <Badge variant="outline" className={`${typeInfo.textColor}`}>
                                                            {connectionType}
                                                        </Badge>
                                                    </div>
                                                    {metadata.targetArgName && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600 dark:text-gray-400">Target Parameter:</span>
                                                            <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                                                {metadata.targetArgName}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {/* NEW: Show if this is a known broker */}
                                                    {edge.data?.metadata?.isKnownBroker && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600 dark:text-gray-400">Broker Source:</span>
                                                            <Badge variant="secondary" className="text-xs">
                                                                Known Broker Registry
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Data Flow Visualization */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <ArrowRight className="w-5 h-5 text-blue-500" />
                                                Data Flow Path
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-lg border">
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source</div>
                                                    <div className="font-mono text-sm font-medium">{edge.source}</div>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <Database className="w-6 h-6 text-blue-500" />
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">Broker</div>
                                                    <div className="font-mono text-xs">{sourceBrokerId}</div>
                                                    {/* NEW: Indicate if this is a known broker */}
                                                    {edge.data?.metadata?.isKnownBroker && (
                                                        <Badge variant="secondary" className="text-xs mt-1">
                                                            Known
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target</div>
                                                    <div className="font-mono text-sm font-medium">{edge.target}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* NEW: Additional Known Broker Details */}
                                    {edge.data?.metadata?.isKnownBroker && (
                                        <Card className="border-green-200 dark:border-green-800">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                    <Database className="w-5 h-5" />
                                                    Known Broker Registry Information
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                                    <h4 className="font-medium text-sm text-green-700 dark:text-green-300 mb-2">
                                                        Automatic Detection
                                                    </h4>
                                                    <p className="text-sm text-green-600 dark:text-green-400">
                                                        This broker was automatically identified by the Known Brokers Registry. The system
                                                        understands that this broker will be available at runtime, even though it's not
                                                        explicitly declared in the node's return_broker_overrides.
                                                    </p>
                                                </div>

                                                {edge.data.metadata.knownBrokerDescription && (
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                                                            Runtime Broker Details
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {edge.data.metadata.knownBrokerDescription}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                                                    💡 Tip: Known brokers enable the system to understand complex runtime relationships and
                                                    provide better edge analysis.
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Admin Tab */}
                            <TabsContent value="admin" className="mt-0 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                                Edge Raw Data
                                            </CardTitle>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(edge)}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy JSON
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => downloadJson(edge, `edge-${edge.id}.json`)}
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm font-mono max-h-96 border border-gray-200 dark:border-gray-700">
                                            {JSON.stringify(edge, null, 2)}
                                        </pre>
                                    </CardContent>
                                </Card>

                                {/* Danger Zone */}
                                <Card className="border-red-200 dark:border-red-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                            <AlertTriangle className="w-5 h-5" />
                                            Danger Zone
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                                            <h4 className="font-medium text-sm text-red-700 dark:text-red-300 mb-2">Delete Edge</h4>
                                            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                                                This will permanently remove the edge from the database. This action cannot be undone and
                                                may affect workflow execution if the edge is critical.
                                            </p>
                                            <Button
                                                onClick={handleDeleteEdge}
                                                disabled={isDeleting}
                                                variant="destructive"
                                                size="sm"
                                                className="gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {isDeleting ? "Deleting Edge..." : "Delete This Edge"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
