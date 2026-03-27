"use client";

import React from "react";
import { AlertCircle, RotateCcw, Save, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const STORAGE_KEY = "matrx:prompt-builder:autosave";

interface AutoSaveData {
    promptId?: string;
    promptName: string;
    developerMessage: string;
    messages: Array<{ role: string; content: string }>;
    variableDefaults: Array<{ name: string; defaultValue: string }>;
    modelConfig: Record<string, unknown>;
    model: string;
    timestamp: number;
}

interface PromptBuilderErrorBoundaryProps {
    children: React.ReactNode;
    promptId?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    recoveredData: AutoSaveData | null;
}

export class PromptBuilderErrorBoundary extends React.Component<
    PromptBuilderErrorBoundaryProps,
    State
> {
    constructor(props: PromptBuilderErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, recoveredData: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        let recoveredData: AutoSaveData | null = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) recoveredData = JSON.parse(raw);
        } catch {
            // localStorage unavailable or corrupt — ignore
        }
        return { hasError: true, error, recoveredData };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[PromptBuilder] Crash caught by error boundary:", error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, recoveredData: null });
    };

    handleCopyRecoveredData = () => {
        const { recoveredData } = this.state;
        if (!recoveredData) return;
        navigator.clipboard.writeText(JSON.stringify(recoveredData, null, 2));
        toast.success("Recovery data copied to clipboard");
    };

    handleDownloadRecoveredData = () => {
        const { recoveredData } = this.state;
        if (!recoveredData) return;
        const blob = new Blob([JSON.stringify(recoveredData, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prompt-recovery-${recoveredData.promptName || "untitled"}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Recovery file downloaded");
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const { error, recoveredData } = this.state;
        const hasRecovery = !!recoveredData;
        const recoveryAge = hasRecovery
            ? Math.round((Date.now() - recoveredData!.timestamp) / 1000)
            : 0;

        const formatAge = (seconds: number) => {
            if (seconds < 60) return `${seconds}s ago`;
            if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
            return `${Math.round(seconds / 3600)}h ago`;
        };

        return (
            <div className="h-full w-full flex items-center justify-center p-8 bg-textured">
                <Card className="max-w-lg w-full p-6 space-y-4 border-destructive/30">
                    <div className="flex flex-col items-center text-center space-y-3">
                        <div className="p-3 bg-destructive/10 rounded-full">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground mb-1">
                                Prompt Builder Crashed
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                An unexpected error occurred. Your work has been
                                auto-saved and can be recovered.
                            </p>
                        </div>

                        {error && (
                            <pre className="w-full text-left text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded p-3 overflow-auto max-h-24">
                                {error.message}
                            </pre>
                        )}

                        {hasRecovery && (
                            <div className="w-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-left space-y-2">
                                <div className="flex items-center gap-2">
                                    <Save className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Auto-save available
                                    </span>
                                    <span className="text-xs text-green-600 dark:text-green-400 ml-auto">
                                        {formatAge(recoveryAge)}
                                    </span>
                                </div>
                                <div className="text-xs text-green-700 dark:text-green-300 space-y-0.5">
                                    <p>
                                        Prompt: <strong>{recoveredData!.promptName || "Untitled"}</strong>
                                    </p>
                                    <p>
                                        Messages: {recoveredData!.messages?.length ?? 0} |
                                        Variables: {recoveredData!.variableDefaults?.length ?? 0}
                                    </p>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={this.handleCopyRecoveredData}
                                    >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy JSON
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={this.handleDownloadRecoveredData}
                                    >
                                        <Save className="h-3 w-3 mr-1" />
                                        Download
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Button onClick={this.handleRetry} className="w-full">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }
}

export { STORAGE_KEY };
export type { AutoSaveData };
