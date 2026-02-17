"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle, Clock, Play, AlertCircle, Copy, User, Settings } from "lucide-react";

interface InfoMessageDisplayProps {
    data: {
        status: string;
        system_message: string;
        metadata?: {
            instance_id?: string;
            workflow_id?: string;
            workflow_loaded?: boolean;
            status?: string;
            [key: string]: any;
        } | null;
        user_message?: string;
        /** @deprecated Use user_message. Kept for backward compatibility. */
        user_visible_message?: string;
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
        case "success":
        case "confirm":
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case "processing":
        case "running":
        case "starting":
            return <Play className="w-5 h-5 text-blue-500" />;
        case "waiting":
        case "pending":
            return <Clock className="w-5 h-5 text-yellow-500" />;
        case "error":
        case "failed":
            return <AlertCircle className="w-5 h-5 text-red-500" />;
        default:
            return <Info className="w-5 h-5 text-gray-500" />;
    }
};

const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
        case "completed":
        case "success":
        case "confirm":
            return "default";
        case "error":
        case "failed":
            return "destructive";
        case "processing":
        case "running":
        case "starting":
            return "secondary";
        default:
            return "outline";
    }
};

const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
        case "completed":
        case "success":
        case "confirm":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case "processing":
        case "running":
        case "starting":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        case "waiting":
        case "pending":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
        default:
            return "";
    }
};

export const InfoMessageDisplay: React.FC<InfoMessageDisplayProps> = ({ data }) => {
    return (
        <div className="space-y-4">
            {/* Main Info Card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                        <StatusIcon status={data.status} />
                        <div className="flex-1">
                            <div className="text-lg font-semibold">Status Update</div>
                            <div className="text-sm text-muted-foreground">System Information</div>
                        </div>
                        <Badge 
                            variant={getStatusBadgeVariant(data.status)}
                            className={getStatusBadgeClass(data.status)}
                        >
                            {data.status}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* User Message */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">User Message</span>
                        </div>
                        <div className="pl-6 text-sm font-medium text-foreground">
                            {data.user_message ?? data.user_visible_message}
                        </div>
                    </div>

                    {/* System Message */}
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System Message</span>
                        </div>
                        <div className="pl-6 text-xs font-mono text-muted-foreground leading-relaxed">
                            {data.system_message}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Metadata Card */}
            {data.metadata && Object.keys(data.metadata).length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Info className="w-4 h-4 text-purple-500" />
                            Metadata
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Special handling for common IDs */}
                        {data.metadata.instance_id && (
                            <CopyButton text={data.metadata.instance_id} label="Instance ID" />
                        )}
                        {data.metadata.workflow_id && (
                            <CopyButton text={data.metadata.workflow_id} label="Workflow ID" />
                        )}

                        {/* Other metadata fields */}
                        <div className="space-y-2">
                            {Object.entries(data.metadata)
                                .filter(([key]) => !['instance_id', 'workflow_id'].includes(key))
                                .map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground capitalize">
                                            {key.replace(/_/g, ' ')}:
                                        </span>
                                        <div className="text-xs">
                                            {typeof value === 'boolean' ? (
                                                <Badge variant={value ? "default" : "secondary"} className="text-[10px]">
                                                    {value ? "✓ True" : "✗ False"}
                                                </Badge>
                                            ) : typeof value === 'string' && value.length > 20 ? (
                                                <CopyButton text={String(value)} />
                                            ) : (
                                                <span className="font-mono text-muted-foreground">
                                                    {String(value)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}; 