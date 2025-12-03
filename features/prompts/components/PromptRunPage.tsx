"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { PromptMessage, PromptVariable } from "@/features/prompts/types/core";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout/AdaptiveLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelRightOpen, PanelRightClose, RotateCcw, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { PageSpecificHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { PromptRunsSidebar } from "@/features/ai-runs/components/PromptRunsSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { PromptRunnerModalSidebarTester } from "./runner-tester/PromptRunnerModalSidebarTester";
import { PromptModeNavigation } from "./PromptModeNavigation";
import { loadRun } from "@/lib/redux/prompt-execution/thunks/loadRunThunk";
import { startPromptInstance } from "@/lib/redux/prompt-execution/thunks/startInstanceThunk";
import { PromptRunner } from "./results-display/PromptRunner";
import { selectRequiresVariableReplacement } from "@/lib/redux/prompt-execution/selectors";
import { cachePrompt } from "@/lib/redux/slices/promptCacheSlice";

// Dynamically import CanvasRenderer to avoid SSR issues
const CanvasRenderer = dynamic(
    () => import("@/features/canvas/core/CanvasRenderer").then(mod => ({ default: mod.CanvasRenderer })),
    { ssr: false }
);

interface PromptRunnerProps {
    promptData: {
        id: string;
        name: string;
        description?: string | null;
        messages: PromptMessage[];
        variableDefaults: PromptVariable[];
        settings: Record<string, any>;
        userId?: string | null;
    };
}

export function PromptRunPage({ promptData }: PromptRunnerProps) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isOpen: isCanvasOpen, close: closeCanvas, open: openCanvas, content: canvasContent } = useCanvas();

    // Pre-populate Redux cache with server-fetched prompt data to avoid duplicate fetches
    useEffect(() => {
        dispatch(cachePrompt({
            id: promptData.id,
            name: promptData.name,
            description: promptData.description,
            messages: promptData.messages,
            variableDefaults: promptData.variableDefaults,
            settings: promptData.settings,
            userId: promptData.userId,
            source: 'prompts',
            fetchedAt: Date.now(),
            status: 'cached',
        }));
    }, [dispatch, promptData]);

    // Get runId from URL query parameter
    const urlRunId = searchParams.get('runId');

    // Mobile detection using consistent hook
    const isMobile = useIsMobile();
    const [showCanvasOnMobile, setShowCanvasOnMobile] = useState(false);
    const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(false);

    // Local state for runId to handle "ghost" runs (not yet persisted/in URL)
    const [activeRunId, setActiveRunId] = useState<string | null>(urlRunId);

    // Sync activeRunId with urlRunId if urlRunId changes (e.g. navigation)
    useEffect(() => {
        if (urlRunId) setActiveRunId(urlRunId);
    }, [urlRunId]);

    // Selectors
    const requiresVariableReplacement = useAppSelector(state =>
        activeRunId ? selectRequiresVariableReplacement(state, activeRunId) : false
    );

    // Auto-close mobile views when resizing to desktop
    useEffect(() => {
        if (!isMobile) {
            if (showCanvasOnMobile) setShowCanvasOnMobile(false);
            if (showSidebarOnMobile) setShowSidebarOnMobile(false);
        }
    }, [isMobile, showCanvasOnMobile, showSidebarOnMobile]);

    // Handle canvas toggle for mobile
    const handleCanvasToggle = () => {
        if (isMobile) {
            if (isCanvasOpen) {
                setShowCanvasOnMobile(!showCanvasOnMobile);
            } else {
                openCanvas({
                    type: 'html',
                    data: '<div class="p-6"><p class="text-muted-foreground">Canvas panel - content will appear here</p></div>',
                    metadata: { title: 'Canvas' }
                });
                setShowCanvasOnMobile(true);
            }
        } else {
            if (isCanvasOpen) {
                closeCanvas();
            } else {
                openCanvas({
                    type: 'html',
                    data: '<div class="p-6"><p class="text-muted-foreground">Canvas panel - content will appear here</p></div>',
                    metadata: { title: 'Canvas' }
                });
            }
        }
    };

    // Initialize Run
    useEffect(() => {
        if (urlRunId) {
            // Load existing run
            dispatch(loadRun({ runId: urlRunId }));
        } else if (!activeRunId) {
            // Start new run
            // We dispatch startPromptInstance which will generate a runId and return it
            dispatch(startPromptInstance({
                promptId: promptData.id,
                promptSource: 'prompts',
                executionConfig: {
                    auto_run: false,
                    allow_chat: true,
                    show_variables: true,
                    apply_variables: true,
                    track_in_runs: true
                },
                variables: {} // Defaults will be used
            })).unwrap().then((newRunId) => {
                // Set local runId but DO NOT update URL yet
                setActiveRunId(newRunId);
            }).catch(err => console.error("Failed to start new run:", err));
        }
    }, [urlRunId, activeRunId, dispatch, promptData.id]);

    // Update URL only when execution has started (variables applied)
    useEffect(() => {
        if (activeRunId && !urlRunId && !requiresVariableReplacement) {
            const url = new URL(window.location.href);
            url.searchParams.set('runId', activeRunId);
            router.replace(url.pathname + url.search);
        }
    }, [activeRunId, urlRunId, requiresVariableReplacement, router]);

    const handleClearConversation = () => {
        // Clear the runId from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('runId');

        // Use native browser reload to force complete remount (Next.js best practice)
        window.location.href = url.pathname + url.search;
    };

    // Handle run selection from sidebar
    const handleRunSelect = useCallback((runId: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set('runId', runId);
        router.push(url.pathname + url.search);
    }, [router]);

    return (
        <>
            {/* Minimal Header in the top nav area */}
            <PageSpecificHeader>
                <div className="flex items-center justify-between w-full h-full px-2 sm:px-4">
                    {/* Left: Unified 3-icon navigation + name */}
                    <PromptModeNavigation
                        promptId={promptData.id}
                        promptName={promptData.name}
                        currentMode="run"
                    />

                    {/* Right: Action buttons */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        {/* Mobile sidebar toggle */}
                        {isMobile && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSidebarOnMobile(!showSidebarOnMobile)}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 w-9 p-0"
                                title={showSidebarOnMobile ? "Close runs" : "Show runs"}
                            >
                                {showSidebarOnMobile ? (
                                    <PanelLeftClose className="w-4 h-4" />
                                ) : (
                                    <PanelLeftOpen className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                        {/* Reset conversation button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearConversation}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 w-9 p-0"
                            title="Reset conversation"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCanvasToggle}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 w-9 p-0"
                            title={isMobile && showCanvasOnMobile ? "Back to conversation" : isCanvasOpen ? "Close canvas" : "Open canvas"}
                        >
                            {isMobile && showCanvasOnMobile ? (
                                <ArrowLeft className="w-4 h-4" />
                            ) : isCanvasOpen ? (
                                <PanelRightClose className="w-4 h-4" />
                            ) : (
                                <PanelRightOpen className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </PageSpecificHeader>

            {/* Mobile Canvas Full Screen View */}
            {isMobile && showCanvasOnMobile && isCanvasOpen ? (
                <div className="h-page bg-textured overflow-hidden">
                    <CanvasRenderer content={canvasContent} />
                </div>
            ) : isMobile && showSidebarOnMobile ? (
                /* Mobile Sidebar Full Screen View */
                <div className="h-page bg-card overflow-hidden">
                    <PromptRunsSidebar
                        promptId={promptData.id}
                        promptName={promptData.name}
                        currentRunId={urlRunId || undefined}
                        onRunSelect={(runId) => {
                            handleRunSelect(runId);
                            setShowSidebarOnMobile(false);
                        }}
                        onNewRun={() => {
                            handleClearConversation();
                            setShowSidebarOnMobile(false);
                        }}
                    />
                </div>
            ) : (
                /* Main Layout with AdaptiveLayout */
                <AdaptiveLayout
                    className="h-page bg-textured"
                    disableAutoCanvas={isMobile} // Disable auto canvas on mobile
                    leftPanelMaxWidth={280} // Compact sidebar for runs list
                    leftPanel={
                        !isMobile ? (
                            <PromptRunsSidebar
                                promptId={promptData.id}
                                promptName={promptData.name}
                                currentRunId={urlRunId || undefined}
                                onRunSelect={handleRunSelect}
                                onNewRun={handleClearConversation}
                                footer={
                                    <PromptRunnerModalSidebarTester
                                        runId={activeRunId || undefined}
                                    />
                                }
                            />
                        ) : undefined
                    }
                    rightPanel={
                        <div className="h-full flex flex-col overflow-hidden">
                            {activeRunId ? (
                                <PromptRunner
                                    runId={activeRunId}
                                    className="h-full"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            )}
                        </div>
                    }
                />
            )}
        </>
    );
}
