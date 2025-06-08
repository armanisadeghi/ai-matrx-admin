"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Copy, Timer, Activity } from "lucide-react";

interface WorkflowSummaryDisplayProps {
    data: {
        executed_functions: Array<{
            instance_id: string;
            step_name: string;
            func_name: string;
            status: string;
            execution_required: boolean;
            return_brokers: string[];
            completion_time: number;
            is_successful: boolean;
            is_failed: boolean;
        }>;
        other_functions: any[];
        summary: {
            total_functions: number;
            executed_count: number;
            completed: number;
            failed: number;
            orchestrator_status: string;
            progress_percentage: number;
            total_execution_time_seconds: number;
        };
        data_type: string;
        instance_id: string;
        workflow_id: string;
    };
}

const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="flex items-center gap-1 group">
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]" title={text}>
                {label && <span className="font-normal">{label}: </span>}
                {text}
            </span>
            <Copy
                className={`w-3 h-3 cursor-pointer transition-colors ${
                    copied ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={copyToClipboard}
            />
        </div>
    );
};

const StatusIcon: React.FC<{ status: string; isSuccessful: boolean; isFailed: boolean }> = ({ status, isSuccessful, isFailed }) => {
    if (isFailed) {
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (isSuccessful && status === "execution_complete") {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Clock className="w-4 h-4 text-blue-500" />;
};

const formatTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString();
};

const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
};

export const WorkflowSummaryDisplay: React.FC<WorkflowSummaryDisplayProps> = ({ data }) => {
    const [openSteps, setOpenSteps] = useState<Set<string>>(new Set());

    const toggleStep = (instanceId: string) => {
        const newOpenSteps = new Set(openSteps);
        if (newOpenSteps.has(instanceId)) {
            newOpenSteps.delete(instanceId);
        } else {
            newOpenSteps.add(instanceId);
        }
        setOpenSteps(newOpenSteps);
    };

    const getStatusBadgeVariant = (status: string, isSuccessful: boolean, isFailed: boolean) => {
        if (isFailed) return "destructive";
        if (isSuccessful && status === "execution_complete") return "default";
        return "secondary";
    };

    const getStatusBadgeClass = (status: string, isSuccessful: boolean, isFailed: boolean) => {
        if (isFailed) return "";
        if (isSuccessful && status === "execution_complete") {
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        }
        return "";
    };

    return (
        <div className="space-y-4">
            {/* Summary Overview */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5" />
                        Workflow Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Progress and Status */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={data.summary.orchestrator_status === "completed" ? "default" : "secondary"}
                                className={
                                    data.summary.orchestrator_status === "completed"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : ""
                                }
                            >
                                {data.summary.orchestrator_status}
                            </Badge>
                            <Badge variant="outline">{data.summary.progress_percentage}% Complete</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Timer className="w-4 h-4" />
                            {formatDuration(data.summary.total_execution_time_seconds)}
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-blue-600">{data.summary.total_functions}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-green-600">{data.summary.completed}</div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-red-600">{data.summary.failed}</div>
                            <div className="text-xs text-muted-foreground">Failed</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-gray-600">{data.summary.executed_count}</div>
                            <div className="text-xs text-muted-foreground">Executed</div>
                        </div>
                    </div>

                    {/* Workflow IDs */}
                    <div className="space-y-2 pt-2 border-t">
                        <CopyButton text={data.workflow_id} label="Workflow ID" />
                        <CopyButton text={data.instance_id} label="Instance ID" />
                    </div>
                </CardContent>
            </Card>

            {/* Executed Functions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Executed Steps ({data.executed_functions.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {data.executed_functions.map((func, index) => (
                        <Collapsible
                            key={func.instance_id}
                            open={openSteps.has(func.instance_id)}
                            onOpenChange={() => toggleStep(func.instance_id)}
                        >
                            <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            {openSteps.has(func.instance_id) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                            <span className="text-sm font-medium">Step {index + 1}</span>
                                        </div>
                                        <StatusIcon status={func.status} isSuccessful={func.is_successful} isFailed={func.is_failed} />
                                        <span className="text-sm font-medium text-left truncate max-w-[300px]">{func.step_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={getStatusBadgeVariant(func.status, func.is_successful, func.is_failed)}
                                            className={getStatusBadgeClass(func.status, func.is_successful, func.is_failed)}
                                        >
                                            {func.status.replace("_", " ")}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{formatTime(func.completion_time)}</span>
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-2 p-4 rounded-lg bg-muted/30 space-y-3">
                                    {/* Function Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <div className="text-xs font-medium text-muted-foreground">Function</div>
                                            <div className="text-sm font-mono">{func.func_name}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-xs font-medium text-muted-foreground">Execution Required</div>
                                            <Badge variant={func.execution_required ? "default" : "secondary"}>
                                                {func.execution_required ? "Yes" : "No"}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Status Flags */}
                                    <div className="flex gap-2">
                                        <Badge
                                            variant={func.is_successful ? "default" : "secondary"}
                                            className={
                                                func.is_successful
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                    : ""
                                            }
                                        >
                                            {func.is_successful ? "✓ Successful" : "○ Not Successful"}
                                        </Badge>
                                        <Badge variant={func.is_failed ? "destructive" : "secondary"}>
                                            {func.is_failed ? "✗ Failed" : "○ Not Failed"}
                                        </Badge>
                                    </div>

                                    {/* IDs and Return Brokers */}
                                    <div className="space-y-2">
                                        <CopyButton text={func.instance_id} label="Instance ID" />
                                        {func.return_brokers.length > 0 && (
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">
                                                    Return Brokers ({func.return_brokers.length})
                                                </div>
                                                {func.return_brokers.map((broker, brokerIndex) => (
                                                    <CopyButton key={brokerIndex} text={broker} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                </CardContent>
            </Card>

            {/* Other Functions (if any) */}
            {data.other_functions.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Other Functions ({data.other_functions.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            {data.other_functions.length} additional function(s) not executed
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
