"use client";

import React, { useMemo } from "react";
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";
import { getRegisteredComponent } from "./stepDataRegistry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, MessageSquare } from "lucide-react";

interface ToolUpdatesOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    toolUpdates: ToolCallObject[];
}

const renderToolUpdateContent = (update: ToolCallObject, index: number): React.ReactNode => {
    // Handle step_data with registered components
    if (update.type === "step_data" && update.step_data) {
        const stepType = update.step_data.type;
        const RegisteredComponent = getRegisteredComponent(stepType);

        if (RegisteredComponent) {
            return <RegisteredComponent data={update.step_data} />;
        }

        // Fallback for unregistered step types
        return (
            <div className="p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Badge variant="outline">{stepType}</Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                (No custom component registered)
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-[70vh]">
                            {JSON.stringify(update.step_data.content, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Handle mcp_input - Smart display of tool parameters
    if (update.type === "mcp_input" && update.mcp_input) {
        const args = update.mcp_input.arguments;
        const argEntries = Object.entries(args);

        return (
            <div className="p-4 space-y-4">
                {/* Tool Name Header */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-3">
                            <Badge className="bg-blue-500 dark:bg-blue-600 text-base px-3 py-1">Tool Input</Badge>
                            <span className="font-mono text-lg">{update.mcp_input.name}</span>
                        </CardTitle>
                    </CardHeader>
                </Card>

                {update.user_visible_message && (
                    <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <MessageSquare className="w-5 h-5 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <p className="text-sm text-blue-900 dark:text-blue-100">{update.user_visible_message}</p>
                    </div>
                )}

                {/* Pretty Parameter Display */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base text-gray-700 dark:text-gray-300">Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {argEntries.length > 0 ? (
                            argEntries.map(([key, value]) => (
                                <div key={key} className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 py-2">
                                    <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1 font-mono">
                                        {key}
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        {typeof value === "string" ? (
                                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                                                {value}
                                            </div>
                                        ) : typeof value === "number" || typeof value === "boolean" ? (
                                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 font-mono">
                                                {String(value)}
                                            </div>
                                        ) : (
                                            <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto max-h-40 border border-gray-200 dark:border-gray-700">
                                                {JSON.stringify(value, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No parameters</p>
                        )}
                    </CardContent>
                </Card>

                {/* Raw Object (for reference/debugging) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <span>Raw Object</span>
                            <Badge variant="outline" className="text-xs">Reference</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-60 border border-gray-200 dark:border-gray-700">
                            {JSON.stringify(update.mcp_input, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Handle mcp_output - Smart display based on content type
    if (update.type === "mcp_output" && update.mcp_output) {
        // Check if the output is a simple string or has a result/text/content field that's a string
        const isSimpleString = typeof update.mcp_output === "string";
        const hasTextContent = 
            typeof update.mcp_output === "object" && 
            update.mcp_output !== null && 
            ("result" in update.mcp_output || "text" in update.mcp_output || "content" in update.mcp_output);
        
        let textContent: string | null = null;
        if (isSimpleString) {
            textContent = update.mcp_output as unknown as string;
        } else if (hasTextContent) {
            const output = update.mcp_output as any;
            // Check for result first (most common), then text, then content
            textContent = output.result || output.text || output.content;
            if (typeof textContent !== "string") {
                textContent = null;
            }
        }

        return (
            <div className="p-4 space-y-4">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-3">
                            <Badge className="bg-green-500 dark:bg-green-600 text-base px-3 py-1">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Tool Output
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                </Card>

                {update.user_visible_message && (
                    <div className="flex items-start gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <MessageSquare className="w-5 h-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <p className="text-sm text-green-900 dark:text-green-100">{update.user_visible_message}</p>
                    </div>
                )}

                {/* Main Content Display */}
                {textContent ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <span>Result Content</span>
                                <Badge variant="outline" className="text-xs">As Model Sees It</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto max-h-[65vh]">
                                <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                                    {textContent}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base text-gray-700 dark:text-gray-300">
                                Result Data
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-[60vh] border border-gray-200 dark:border-gray-700">
                                {JSON.stringify(update.mcp_output, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {/* Raw Object (only if we displayed text content) */}
                {textContent && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span>Raw Object</span>
                                <Badge variant="outline" className="text-xs">Reference</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-60 border border-gray-200 dark:border-gray-700">
                                {JSON.stringify(update.mcp_output, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    // Handle mcp_error
    if (update.type === "mcp_error" && update.mcp_error) {
        return (
            <div className="p-4">
                <Card className="border-red-300 dark:border-red-800">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Badge className="bg-red-500 dark:bg-red-600">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                MCP Error
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {update.user_visible_message && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                                <MessageSquare className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-900 dark:text-red-100">{update.user_visible_message}</p>
                            </div>
                        )}
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-900 dark:text-red-100 font-mono">{update.mcp_error}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Handle user_visible_message
    if (update.type === "user_visible_message" && update.user_visible_message) {
        return (
            <div className="p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Badge className="bg-purple-500 dark:bg-purple-600">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Message
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-purple-900 dark:text-purple-100">{update.user_visible_message}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Fallback for unknown types
    return (
        <div className="p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Unknown Update Type</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-[70vh]">
                        {JSON.stringify(update, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
};

export const ToolUpdatesOverlay: React.FC<ToolUpdatesOverlayProps> = ({
    isOpen,
    onClose,
    toolUpdates,
}) => {
    // Generate tabs dynamically from toolUpdates
    const tabs: TabDefinition[] = useMemo(() => {
        return toolUpdates.map((update, index) => {
            // Create a descriptive label based on the type
            let label = "";
            switch (update.type) {
                case "mcp_input":
                    label = `Input: ${update.mcp_input?.name || "Unknown"}`;
                    break;
                case "mcp_output":
                    label = `Output ${index + 1}`;
                    break;
                case "mcp_error":
                    label = `Error ${index + 1}`;
                    break;
                case "step_data":
                    label = update.step_data?.type || `Step ${index + 1}`;
                    break;
                case "user_visible_message":
                    label = `Message ${index + 1}`;
                    break;
                default:
                    label = `Update ${index + 1}`;
            }

            return {
                id: `tool-update-${index}`,
                label,
                content: renderToolUpdateContent(update, index),
            };
        });
    }, [toolUpdates]);

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title="Tool Updates"
            description="View MCP tool calls and step data"
            tabs={tabs}
            width="95vw"
            height="95vh"
        />
    );
};

