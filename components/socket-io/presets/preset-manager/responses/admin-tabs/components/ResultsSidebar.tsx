"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux";
import {
    selectPrimaryResponseDataByTaskId,
    selectPrimaryResponseErrorsByTaskId,
    selectPrimaryResponseInfoByTaskId,
    selectPrimaryResponseTextByTaskId,
    selectPrimaryResponseEndedByTaskId,
    selectPrimaryCombinedTextByTaskId,
} from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, MessageSquare, Database, AlertCircle, Info, Copy, Loader2, Cog, Zap } from "lucide-react";
import { useRenderCount } from "@uidotdev/usehooks";

// Interfaces for response component types
export interface InfoResponseItemProps {
    info: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}

export interface ErrorResponseItemProps {
    error: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}

export interface TextResponseItemProps {
    hasValidText: boolean;
    isSelected: boolean;
    onClick: () => void;
}

export interface DataResponseItemProps {
    data: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}

export interface WorkflowSummaryItemProps {
    data: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}

export interface StepCompletionItemProps {
    data: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}

export interface LoadingWorkItemProps {
    // No props currently, but interface allows for future extension
}

// Component type definitions
export type InfoResponseItemComponent = React.FC<InfoResponseItemProps>;
export type ErrorResponseItemComponent = React.FC<ErrorResponseItemProps>;
export type TextResponseItemComponent = React.FC<TextResponseItemProps>;
export type DataResponseItemComponent = React.FC<DataResponseItemProps>;
export type WorkflowSummaryItemComponent = React.FC<WorkflowSummaryItemProps>;
export type StepCompletionItemComponent = React.FC<StepCompletionItemProps>;
export type LoadingWorkItemComponent = React.FC<LoadingWorkItemProps>;

interface ResultsSidebarProps {
    selectedTaskId: string | null;
    selectedDataType?: "text" | "data" | "info" | "error";
    selectedIndex?: number;
    onDataTypeChange?: (dataType: "text" | "data" | "info" | "error", index?: number) => void;
    hasValidText: boolean;
    // Override component props
    InfoResponseItemComponent?: InfoResponseItemComponent;
    ErrorResponseItemComponent?: ErrorResponseItemComponent;
    TextResponseItemComponent?: TextResponseItemComponent;
    DataResponseItemComponent?: DataResponseItemComponent;
    WorkflowSummaryItemComponent?: WorkflowSummaryItemComponent;
    StepCompletionItemComponent?: StepCompletionItemComponent;
    LoadingWorkItemComponent?: LoadingWorkItemComponent;
}

// Component for Info responses
const InfoResponseItem: React.FC<{
    info: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}> = ({ info, index, isSelected, onClick }) => (
    <div
        className={`p-2 rounded-md border-l-2 cursor-pointer transition-all duration-200 mb-1 ${
            isSelected
                ? "bg-primary text-primary-foreground border-l-primary-foreground ring-2 ring-primary/50 shadow-md"
                : "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20 hover:bg-muted/80 dark:hover:bg-muted/60 hover:shadow-sm hover:scale-[1.01] hover:border-l-4"
        }`}
        onClick={onClick}
    >
        <div className="space-y-1">
            <div className={`text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-blue-800 dark:text-blue-200"}`}>
                Status Update #{index + 1}
            </div>
            <div className="flex items-center gap-1">
                <Info className={`w-3 h-3 ${isSelected ? "text-primary-foreground" : "text-blue-500"}`} />
                <span className={`text-[10px] capitalize ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {info.status || "unknown"}
                </span>
            </div>
            {info.user_visible_message && (
                <div className={`text-xs leading-tight ${isSelected ? "text-primary-foreground/90" : "text-foreground"}`}>
                    {info.user_visible_message}
                </div>
            )}
        </div>
    </div>
);

// Component for Error responses
const ErrorResponseItem: React.FC<{
    error: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}> = ({ error, index, isSelected, onClick }) => (
    <div
        className={`p-2 rounded-md border-l-2 cursor-pointer transition-all duration-200 mb-1 ${
            isSelected
                ? "bg-primary text-primary-foreground border-l-primary-foreground ring-2 ring-primary/50 shadow-md"
                : "border-l-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-muted/80 dark:hover:bg-muted/60 hover:shadow-sm hover:scale-[1.01] hover:border-l-4"
        }`}
        onClick={onClick}
    >
        <div className="space-y-1">
            <div className={`text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-red-800 dark:text-red-200"}`}>
                Error #{index + 1}
            </div>
            <div className="flex items-center gap-1">
                <XCircle className={`w-3 h-3 ${isSelected ? "text-primary-foreground" : "text-red-500"}`} />
                <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {error.error_type || "error"}
                </span>
            </div>
            {error.user_visible_message && (
                <div className={`text-xs leading-tight ${isSelected ? "text-primary-foreground/90" : "text-foreground"}`}>
                    {error.user_visible_message}
                </div>
            )}
        </div>
    </div>
);

// Component for Text response (throttled character count)
const TextResponseItem: React.FC<{
    hasValidText: boolean;
    isSelected: boolean;
    onClick: () => void;
}> = ({ hasValidText, isSelected, onClick }) => {

    return (
        <div
            className={`p-2 rounded-md border-l-2 cursor-pointer transition-all duration-200 mb-1 ${
                isSelected
                    ? "bg-primary text-primary-foreground border-l-primary-foreground ring-2 ring-primary/50 shadow-md"
                    : "border-l-green-500 bg-green-50 dark:bg-green-950/20 hover:bg-muted/80 dark:hover:bg-muted/60 hover:shadow-sm hover:scale-[1.01] hover:border-l-4"
            }`}
            onClick={onClick}
        >
            <div className="space-y-1">
                <div className={`text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-green-800 dark:text-green-200"}`}>
                    Text
                </div>
                <div className="flex items-center gap-1">
                    <MessageSquare className={`w-3 h-3 ${isSelected ? "text-primary-foreground" : "text-green-500"}`} />
                    <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {hasValidText ? "Streaming Text Started" : "—"}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Component for Workflow Summary data
const WorkflowSummaryItem: React.FC<{
    data: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}> = ({ data, index, isSelected, onClick }) => {
    const summary = data.summary || {};

    return (
        <div
            className={`p-2 rounded-md border-l-2 cursor-pointer transition-all duration-200 mb-1 ${
                isSelected
                    ? "bg-primary text-primary-foreground border-l-primary-foreground ring-2 ring-primary/50 shadow-md"
                    : "border-l-green-500 bg-green-50 dark:bg-green-950/20 hover:bg-muted/80 dark:hover:bg-muted/60 hover:shadow-sm hover:scale-[1.01] hover:border-l-4"
            }`}
            onClick={onClick}
        >
            <div className="space-y-1">
                <div className={`text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-green-800 dark:text-green-200"}`}>
                    Summary
                </div>
                <div className="flex items-center gap-1">
                    <CheckCircle className={`w-3 h-3 ${isSelected ? "text-primary-foreground" : "text-green-500"}`} />
                    <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        Workflow Complete ({summary.progress_percentage || 0}%)
                    </span>
                </div>
                <div className={`text-[10px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <div>
                        Total: {summary.total_functions || 0} | Done: {summary.completed || 0}
                    </div>
                    <div>
                        Failed: {summary.failed || 0} | Time: {summary.total_execution_time_seconds?.toFixed(1) || 0}s
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component for Step Completion data
const StepCompletionItem: React.FC<{
    data: any;
    index: number;
    isSelected: boolean;
    onClick: () => void;
}> = ({ data, index, isSelected, onClick }) => {
    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case "completed":
            case "execution_complete":
                return <CheckCircle className="w-3 h-3 text-green-500" />;
            case "failed":
            case "error":
                return <XCircle className="w-3 h-3 text-red-500" />;
            default:
                return <Clock className="w-3 h-3 text-blue-500" />;
        }
    };

    const getStatusColors = (status: string) => {
        switch (status?.toLowerCase()) {
            case "completed":
            case "execution_complete":
                return {
                    border: "border-l-green-500",
                    bg: "bg-green-50 dark:bg-green-950/20",
                    text: "text-green-800 dark:text-green-200",
                };
            case "failed":
            case "error":
                return {
                    border: "border-l-red-500",
                    bg: "bg-red-50 dark:bg-red-950/20",
                    text: "text-red-800 dark:text-red-200",
                };
            default:
                return {
                    border: "border-l-blue-500",
                    bg: "bg-blue-50 dark:bg-blue-950/20",
                    text: "text-blue-800 dark:text-blue-200",
                };
        }
    };

    const colors = getStatusColors(data.status);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div
            className={`p-2 rounded-md border-l-2 cursor-pointer transition-all duration-200 mb-1 ${
                isSelected
                    ? "bg-primary text-primary-foreground border-l-primary-foreground ring-2 ring-primary/50 shadow-md"
                    : `${colors.border} ${colors.bg} hover:bg-muted/80 dark:hover:bg-muted/60 hover:shadow-sm hover:scale-[1.01] hover:border-l-4`
            }`}
            onClick={onClick}
        >
            <div className="space-y-1">
                <div className={`text-xs font-medium ${isSelected ? "text-primary-foreground" : colors.text}`}>
                    Step #{index + 1} Results
                </div>
                <div className="flex items-center gap-1">
                    {getStatusIcon(data.status)}
                    <span className={`text-[10px] capitalize ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {data.status || "unknown"}
                    </span>
                </div>
                <div className={`text-xs font-medium leading-tight ${isSelected ? "text-primary-foreground/90" : "text-foreground"}`}>
                    {data.step_name || "Unnamed Step"}
                </div>
                {data.return_broker_id && (
                    <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-mono ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {data.return_broker_id}
                        </span>
                        <Copy
                            className={`w-3 h-3 cursor-pointer ${
                                isSelected
                                    ? "text-primary-foreground/80 hover:text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(data.return_broker_id);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Component for generic Data responses
const DataResponseItem: React.FC<DataResponseItemProps> = ({ data, index, isSelected, onClick }) => {
    // Handle specific data types
    if (data.data_type === "workflow_summary") {
        return <WorkflowSummaryItem data={data} index={index} isSelected={isSelected} onClick={onClick} />;
    }

    if (data.data_type === "step_completion") {
        return <StepCompletionItem data={data} index={index} isSelected={isSelected} onClick={onClick} />;
    }

    // Generic data display
    return (
        <div
            className={`p-2 rounded-md border-l-2 cursor-pointer transition-all duration-200 mb-1 ${
                isSelected
                    ? "bg-primary text-primary-foreground border-l-primary-foreground ring-2 ring-primary/50 shadow-md"
                    : "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20 hover:bg-muted/80 dark:hover:bg-muted/60 hover:shadow-sm hover:scale-[1.01] hover:border-l-4"
            }`}
            onClick={onClick}
        >
            <div className="space-y-1">
                <div className={`text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-purple-800 dark:text-purple-200"}`}>
                    Data #{index + 1}
                </div>
                <div className="flex items-center gap-1">
                    <Database className={`w-3 h-3 ${isSelected ? "text-primary-foreground" : "text-purple-500"}`} />
                    <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {data.data_type || "generic"}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Component for active workflow indicator
const LoadingWorkItem: React.FC = () => {
    const [animationPhase, setAnimationPhase] = useState(0);

    // Rotate through different animation phases for visual interest
    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationPhase((prev) => (prev + 1) % 3);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const getIcon = () => {
        switch (animationPhase) {
            case 0:
                return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
            case 1:
                return <Cog className="w-4 h-4 text-blue-400 animate-spin" />;
            case 2:
                return <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />;
            default:
                return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
        }
    };

    const getMessage = () => {
        switch (animationPhase) {
            case 0:
                return "Processing workflow...";
            case 1:
                return "Executing functions...";
            case 2:
                return "Generating results...";
            default:
                return "Working...";
        }
    };

    return (
        <div className="p-4 rounded-lg border-l-4 border-l-cyan-400 bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-950/30 dark:to-indigo-950/30 mb-2 animate-pulse shadow-lg">
            <div className="space-y-2">
                <div className="text-sm font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                    {getIcon()}
                    Process Active
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{getMessage()}</span>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 font-bold">Processing...</div>
            </div>
        </div>
    );
};

export const ResultsSidebar: React.FC<ResultsSidebarProps> = ({
    selectedTaskId,
    selectedDataType = "text",
    selectedIndex = 0,
    onDataTypeChange,
    hasValidText,
    InfoResponseItemComponent = InfoResponseItem,
    ErrorResponseItemComponent = ErrorResponseItem,
    TextResponseItemComponent = TextResponseItem,
    DataResponseItemComponent = DataResponseItem,
    WorkflowSummaryItemComponent = WorkflowSummaryItem,
    StepCompletionItemComponent = StepCompletionItem,
    LoadingWorkItemComponent = LoadingWorkItem,
}) => {
    const renderCount = useRenderCount();
    const LOCAL_DEBUG = false;
    if (LOCAL_DEBUG) {
        console.log("[RESULTS SIDEBAR] renderCount", renderCount);
    }

    const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
    const [showLoadingOverride, setShowLoadingOverride] = useState(false);
    


    const dataResponse = useAppSelector((state) => (selectPrimaryResponseDataByTaskId(selectedTaskId)(state)));
    const infoResponse = useAppSelector((state) => (selectPrimaryResponseInfoByTaskId(selectedTaskId)(state)));
    const errorsResponse = useAppSelector((state) => (selectPrimaryResponseErrorsByTaskId(selectedTaskId)(state)));
    const taskEnded = useAppSelector((state) => (selectPrimaryResponseEndedByTaskId(selectedTaskId)(state)));
    const hasAnyData = hasValidText || dataResponse.length > 0 || infoResponse.length > 0 || errorsResponse.length > 0;
    const hasErrors = errorsResponse.length > 0;

    // Determine if task is actively running
    const isTaskRunning = selectedTaskId && hasAnyData && !taskEnded && !showLoadingOverride;

    // Handle error timeout logic
    useEffect(() => {
        if (hasErrors && !taskEnded && selectedTaskId) {
            // Clear any existing timeout
            if (errorTimeout) {
                clearTimeout(errorTimeout);
            }

            // Set a new 5-second timeout
            const timeout = setTimeout(() => {
                setShowLoadingOverride(true);
            }, 5000);

            setErrorTimeout(timeout);
        } else {
            // Clear timeout if conditions change
            if (errorTimeout) {
                clearTimeout(errorTimeout);
                setErrorTimeout(null);
            }
            setShowLoadingOverride(false);
        }

        // Cleanup function
        return () => {
            if (errorTimeout) {
                clearTimeout(errorTimeout);
            }
        };
    }, [hasErrors, taskEnded, selectedTaskId]);

    // Reset override when task changes
    useEffect(() => {
        setShowLoadingOverride(false);
        if (errorTimeout) {
            clearTimeout(errorTimeout);
            setErrorTimeout(null);
        }
    }, [selectedTaskId]);

    return (
        <div className="w-full border-r bg-muted/30 flex flex-col h-full">
            {/* Header */}
            <div className="p-2 border-b bg-card">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">Results</h3>
                    {isTaskRunning && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] px-1 py-0 animate-pulse bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        >
                            <Loader2 className="w-2 h-2 mr-1 animate-spin" />
                            Active
                        </Badge>
                    )}
                </div>
                <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Text</span>
                        <Badge variant={hasValidText ? "default" : "secondary"} className="text-[10px] px-1 py-0">
                            {hasValidText ? "✓" : "—"}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Data</span>
                        <Badge variant={dataResponse.length > 0 ? "default" : "secondary"} className="text-[10px] px-1 py-0">
                            {dataResponse.length || 0}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Info</span>
                        <Badge variant={infoResponse.length > 0 ? "default" : "secondary"} className="text-[10px] px-1 py-0">
                            {infoResponse.length || 0}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Errors</span>
                        <Badge variant={errorsResponse.length > 0 ? "destructive" : "secondary"} className="text-[10px] px-1 py-0">
                            {errorsResponse.length || 0}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Results List */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {!hasAnyData ? (
                        <div className="text-center py-4 text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No results yet</p>
                            {selectedTaskId && <p className="text-xs mt-1">Task is running...</p>}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {/* Text Response */}
                            {hasValidText && (
                                <TextResponseItemComponent
                                    hasValidText={hasValidText}
                                    isSelected={selectedDataType === "text"}
                                    onClick={() => onDataTypeChange?.("text")}
                                />
                            )}

                            {/* Info Responses */}
                            {infoResponse.map((info, index) => (
                                <InfoResponseItemComponent
                                    key={`info-${index}`}
                                    info={info}
                                    index={index}
                                    isSelected={selectedDataType === "info" && selectedIndex === index}
                                    onClick={() => onDataTypeChange?.("info", index)}
                                />
                            ))}

                            {/* Error Responses */}
                            {errorsResponse.map((error, index) => (
                                <ErrorResponseItemComponent
                                    key={`error-${index}`}
                                    error={error}
                                    index={index}
                                    isSelected={selectedDataType === "error" && selectedIndex === index}
                                    onClick={() => onDataTypeChange?.("error", index)}
                                />
                            ))}

                            {/* Data Responses */}
                            {dataResponse.map((data, index) => (
                                <DataResponseItemComponent
                                    key={`data-${index}`}
                                    data={data}
                                    index={index}
                                    isSelected={selectedDataType === "data" && selectedIndex === index}
                                    onClick={() => onDataTypeChange?.("data", index)}
                                />
                            ))}

                            {/* Loading Indicator (when task is running) */}
                            {isTaskRunning && <LoadingWorkItemComponent />}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default ResultsSidebar;
