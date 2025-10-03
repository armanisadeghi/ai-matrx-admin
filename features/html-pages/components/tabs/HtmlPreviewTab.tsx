"use client";

import React from "react";
import { Copy, CheckCircle2, RotateCcw, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { HtmlPreviewTabProps } from "../types";

export function HtmlPreviewTab({ state, actions }: HtmlPreviewTabProps) {
    const previewUrl = actions.getCurrentPreviewUrl();
    const isDirty = state.isHtmlDirty;

    return (
        <div className="h-full flex flex-col">
            <div className="mb-3 flex justify-between items-center gap-2">
                {/* Left side: Content controls */}
                <div className="flex gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={actions.handleRefreshMarkdown}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Reset to original content</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={actions.handleRegenerateHtml}
                                    variant={isDirty ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 px-3"
                                    disabled={!isDirty}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Regenerate
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isDirty ? "Generate HTML from edited markdown" : "HTML is up to date"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Right side: Copy buttons */}
                <div className="flex gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={actions.handleCopyHtml}
                                    variant={state.copied ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 px-3"
                                >
                                    {state.copied ? (
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Copy className="h-4 w-4 mr-2" />
                                    )}
                                    {state.copied ? "Copied!" : "Copy HTML"}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy HTML with all styles</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={actions.handleCopyHtmlNoBullets}
                                    variant={state.copiedNoBullets ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 px-3"
                                >
                                    {state.copiedNoBullets ? (
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Copy className="h-4 w-4 mr-2" />
                                    )}
                                    {state.copiedNoBullets ? "Copied!" : "No Bullets"}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy HTML without bullet styles</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {previewUrl && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => window.open(previewUrl, '_blank')}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Open preview in new tab</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 overflow-hidden border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-950">
                {previewUrl ? (
                    <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title="HTML Preview"
                        sandbox="allow-same-origin"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                            <p>Generating preview...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

