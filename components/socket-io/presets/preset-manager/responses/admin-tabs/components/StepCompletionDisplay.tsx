"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Copy, Timer, Play, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";

interface StepCompletionDisplayProps {
    data: {
        data_type: string;
        instance_id: string;
        step_name: string;
        function_name: string;
        status: string;
        completion_time: number;
        return_broker_id: string;
        result: any;
        error_details?: any;
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

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
    switch (status?.toLowerCase()) {
        case "completed":
        case "execution_complete":
        case "success":
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case "failed":
        case "error":
            return <XCircle className="w-5 h-5 text-red-500" />;
        case "running":
        case "executing":
        case "in_progress":
            return <Play className="w-5 h-5 text-blue-500" />;
        default:
            return <Clock className="w-5 h-5 text-gray-500" />;
    }
};

const formatTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
};

const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
        case "completed":
        case "execution_complete":
        case "success":
            return "default";
        case "failed":
        case "error":
            return "destructive";
        default:
            return "secondary";
    }
};

const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
        case "completed":
        case "execution_complete":
        case "success":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case "failed":
        case "error":
            return "";
        default:
            return "";
    }
};

// Future: This is where custom result renderers would be registered
const ResultRenderer: React.FC<{ result: any; functionName: string }> = ({ result, functionName }) => {
    // Future implementation would check functionName or result structure
    // and render custom components for specific result types
    
    // For now, always render as JSON
    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Result Data</div>
            <div className="border rounded-lg p-2 bg-muted/30">
                <RawJsonExplorer pageData={result} />
            </div>
        </div>
    );
};

export const StepCompletionDisplay: React.FC<StepCompletionDisplayProps> = ({ data }) => {
    const [isResultsExpanded, setIsResultsExpanded] = useState(false);
    
    const hasResult = data.result && (
        typeof data.result === 'object' ? Object.keys(data.result).length > 0 : data.result
    );
    const hasError = data.error_details && (
        typeof data.error_details === 'object' ? Object.keys(data.error_details).length > 0 : data.error_details
    );

    const isSuccessful = ["completed", "execution_complete", "success"].includes(data.status?.toLowerCase());
    const isFailed = ["failed", "error"].includes(data.status?.toLowerCase());

    // Calculate result size (lines in JSON)
    const resultSize = hasResult ? JSON.stringify(data.result, null, 2).split('\n').length : 0;

    // Extract common result fields if they exist
    const resultSuccess = data.result?.success;
    const resultError = data.result?.error || data.result?.errors;
    const executionTimeMs = data.result?.execution_time_ms;

    return (
        <div className="space-y-4">
            {/* Step Header */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                        <StatusIcon status={data.status} />
                        <div className="flex-1">
                            <div className="text-lg font-semibold">{data.step_name}</div>
                            <div className="text-sm text-muted-foreground font-mono">{data.function_name}</div>
                        </div>
                        <Badge 
                            variant={getStatusBadgeVariant(data.status)}
                            className={getStatusBadgeClass(data.status)}
                        >
                            {data.status.replace("_", " ")}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Completion Time */}
                    <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Completed:</span>
                        <span className="text-sm font-medium">{formatTime(data.completion_time)}</span>
                    </div>

                    {/* IDs Section */}
                    <div className="space-y-2 pt-2 border-t">
                        <CopyButton text={data.instance_id} label="Instance ID" />
                        <CopyButton text={data.return_broker_id} label="Return Broker ID" />
                    </div>

                    {/* Result Metadata (if available) */}
                    {(resultSuccess !== undefined || resultError || executionTimeMs !== undefined) && (
                        <div className="flex items-center gap-4 pt-2 border-t">
                            {resultSuccess !== undefined && (
                                <div className="flex items-center gap-1">
                                    {resultSuccess ? (
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <XCircle className="w-3 h-3 text-red-500" />
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        Success: <span className={resultSuccess ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{resultSuccess ? "Yes" : "No"}</span>
                                    </span>
                                </div>
                            )}
                            {executionTimeMs !== undefined && (
                                <div className="flex items-center gap-1">
                                    <Timer className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        Execution: <span className="font-medium">{executionTimeMs}ms</span>
                                    </span>
                                </div>
                            )}
                            {resultError && (
                                <div className="flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                                    <span className="text-xs text-red-600 dark:text-red-400">Has Errors</span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Error Details (if present) */}
            {hasError && (
                <Card className="border-red-200 dark:border-red-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                            <AlertTriangle className="w-5 h-5" />
                            Error Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20">
                            <RawJsonExplorer pageData={data.error_details} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Results Section */}
            {hasResult && (
                <Card className={isSuccessful ? "border-green-200 dark:border-green-800" : ""}>
                    <CardHeader 
                        className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setIsResultsExpanded(!isResultsExpanded)}
                    >
                        <CardTitle className={`flex items-center justify-between ${isSuccessful ? "text-green-700 dark:text-green-300" : ""}`}>
                            <div className="flex items-center gap-2">
                                <CheckCircle className={`w-5 h-5 ${isSuccessful ? "text-green-500" : "text-muted-foreground"}`} />
                                Step Results
                                <Badge variant="outline" className="text-xs">
                                    {resultSize} lines
                                </Badge>
                                {resultSuccess !== undefined && (
                                    <Badge variant={resultSuccess ? "default" : "destructive"} className="text-xs">
                                        {resultSuccess ? "Success" : "Failed"}
                                    </Badge>
                                )}
                                {executionTimeMs !== undefined && (
                                    <Badge variant="secondary" className="text-xs">
                                        {executionTimeMs}ms
                                    </Badge>
                                )}
                            </div>
                            <div className="h-8 w-8 flex items-center justify-center">
                                {isResultsExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                            </div>
                        </CardTitle>
                    </CardHeader>
                    {isResultsExpanded && (
                        <CardContent>
                            <ResultRenderer result={data.result} functionName={data.function_name} />
                        </CardContent>
                    )}
                </Card>
            )}

            {/* No Results Message */}
            {!hasResult && !hasError && (
                <Card>
                    <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                        <div className="text-center space-y-2">
                            <Clock className="w-8 h-8 mx-auto opacity-50" />
                            <p className="text-sm">No result data available</p>
                            <p className="text-xs">Step completed without returning data</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}; 