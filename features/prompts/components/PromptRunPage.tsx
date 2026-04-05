"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout/AdaptiveLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  PanelRightOpen,
  PanelRightClose,
  RotateCcw,
  PanelLeftOpen,
  PanelLeftClose,
  Copy,
  ChevronLeft,
  Edit3,
  Play,
  MoreHorizontal,
} from "lucide-react";
import { PageSpecificHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { PromptRunsSidebar } from "@/features/ai-runs/components/PromptRunsSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { PromptRunnerModalSidebarTester } from "./runner-tester/PromptRunnerModalSidebarTester";
import { PromptModeNavigation } from "./PromptModeNavigation";
import { usePromptsBasePath } from "../hooks/usePromptsBasePath";
import { loadRun } from "@/lib/redux/prompt-execution/thunks/loadRunThunk";
import { startPromptInstance } from "@/lib/redux/prompt-execution/thunks/startInstanceThunk";
import { PromptRunner } from "./results-display/PromptRunner";
import { selectRequiresVariableReplacement } from "@/lib/redux/prompt-execution/selectors";
import { cachePrompt } from "@/lib/redux/slices/promptCacheSlice";
import { SharedPromptBanner } from "./builder/SharedPromptWarningModal";
import type { PromptAccessInfo } from "@/features/prompts/types/shared";
import { toast } from "sonner";
import type { Json } from "@/types/database.types";
import {
  normalizePromptMessagesFromDb,
  normalizePromptSettingsFromDb,
  normalizePromptVariablesFromDb,
} from "../utils/normalize-prompt-db-json";

// Dynamically import CanvasRenderer to avoid SSR issues
const CanvasRenderer = dynamic(
  () =>
    import("@/features/canvas/core/CanvasRenderer").then((mod) => ({
      default: mod.CanvasRenderer,
    })),
  { ssr: false },
);

interface PromptRunnerProps {
  promptData: {
    id: string;
    name: string;
    description?: string | null;
    messages: Json | null;
    variableDefaults: Json | null;
    settings: Json | null;
    userId?: string | null;
    tags?: string[] | null;
    category?: string | null;
    isFavorite?: boolean;
    isArchived?: boolean;
    modelId?: string | null;
    outputFormat?: string | null;
    outputSchema?: Json | null;
  };
  accessInfo?: PromptAccessInfo;
}

export function PromptRunPage({ promptData, accessInfo }: PromptRunnerProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isOpen: isCanvasOpen,
    close: closeCanvas,
    open: openCanvas,
    content: canvasContent,
  } = useCanvas();

  // Pre-populate Redux cache with server-fetched prompt data to avoid duplicate fetches
  useEffect(() => {
    dispatch(
      cachePrompt({
        id: promptData.id,
        name: promptData.name,
        description: promptData.description,
        messages: normalizePromptMessagesFromDb(promptData.messages),
        variableDefaults: normalizePromptVariablesFromDb(
          promptData.variableDefaults,
        ),
        settings: normalizePromptSettingsFromDb(promptData.settings),
        userId: promptData.userId,
        source: "prompts",
        fetchedAt: Date.now(),
        status: "cached",
        tags: promptData.tags ?? undefined,
        category: promptData.category ?? undefined,
        isFavorite: promptData.isFavorite,
        isArchived: promptData.isArchived,
        modelId: promptData.modelId ?? undefined,
        outputFormat: promptData.outputFormat ?? undefined,
        outputSchema: promptData.outputSchema,
      }),
    );
  }, [dispatch, promptData]);

  // Get runId from URL query parameter
  const urlRunId = searchParams.get("runId");

  const basePath = usePromptsBasePath();
  const isMobile = useIsMobile();
  const [showCanvasOnMobile, setShowCanvasOnMobile] = useState(false);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(false);
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Determine if this is a shared prompt
  const isSharedPrompt =
    accessInfo && !accessInfo.isOwner && accessInfo.permissionLevel !== null;

  // Handle copying shared prompt to user's own prompts
  const handleCopyToMyPrompts = async () => {
    setIsCopyingPrompt(true);
    try {
      const response = await fetch(`/api/prompts/${promptData.id}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to copy prompt");
      }

      const data = await response.json();
      toast.success("Prompt copied to your prompts!", {
        description: "You can now find it in your prompts list.",
      });
    } catch (error) {
      console.error("Error copying prompt:", error);
      toast.error("Failed to copy prompt. Please try again.");
    } finally {
      setIsCopyingPrompt(false);
    }
  };

  // Local state for runId to handle "ghost" runs (not yet persisted/in URL)
  const [activeRunId, setActiveRunId] = useState<string | null>(urlRunId);

  // Sync activeRunId with urlRunId if urlRunId changes (e.g. navigation)
  useEffect(() => {
    if (urlRunId) setActiveRunId(urlRunId);
  }, [urlRunId]);

  // Selectors
  const requiresVariableReplacement = useAppSelector((state) =>
    activeRunId ? selectRequiresVariableReplacement(state, activeRunId) : false,
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
          type: "html",
          data: '<div class="p-6"><p class="text-muted-foreground">Canvas panel - content will appear here</p></div>',
          metadata: { title: "Canvas" },
        });
        setShowCanvasOnMobile(true);
      }
    } else {
      if (isCanvasOpen) {
        closeCanvas();
      } else {
        openCanvas({
          type: "html",
          data: '<div class="p-6"><p class="text-muted-foreground">Canvas panel - content will appear here</p></div>',
          metadata: { title: "Canvas" },
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
      dispatch(
        startPromptInstance({
          promptId: promptData.id,
          promptSource: "prompts",
          executionConfig: {
            auto_run: false,
            allow_chat: true,
            show_variables: true,
            apply_variables: true,
            track_in_runs: true,
            use_pre_execution_input: false,
          },
          variables: {}, // Defaults will be used
        }),
      )
        .unwrap()
        .then((newRunId) => {
          // Set local runId but DO NOT update URL yet
          setActiveRunId(newRunId);
        })
        .catch((err) => console.error("Failed to start new run:", err));
    }
  }, [urlRunId, activeRunId, dispatch, promptData.id]);

  // Update URL only when execution has started (variables applied)
  useEffect(() => {
    if (activeRunId && !urlRunId && !requiresVariableReplacement) {
      const url = new URL(window.location.href);
      url.searchParams.set("runId", activeRunId);
      router.replace(url.pathname + url.search);
    }
  }, [activeRunId, urlRunId, requiresVariableReplacement, router]);

  const handleClearConversation = () => {
    // Clear the runId from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("runId");

    // Use native browser reload to force complete remount (Next.js best practice)
    window.location.href = url.pathname + url.search;
  };

  // Handle run selection from sidebar
  const handleRunSelect = useCallback(
    (runId: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("runId", runId);
      router.push(url.pathname + url.search);
    },
    [router],
  );

  return (
    <>
      {/* Header */}
      <PageSpecificHeader>
        <div className="flex items-center justify-between w-full h-full px-2 sm:px-4">
          {/* Mobile Layout */}
          <div className="md:hidden flex items-center justify-between w-full">
            {/* Left: Back chevron */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={() => router.push(basePath)}
              title="Back to Prompts"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Center: Edit/Run toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5 flex-shrink-0">
              <button
                onClick={() => router.push(`${basePath}/edit/${promptData.id}`)}
                className="px-3 py-1 text-xs font-medium rounded transition-colors text-muted-foreground hover:text-foreground"
              >
                <Edit3 className="h-3 w-3 inline mr-1" />
                Edit
              </button>
              <button className="px-3 py-1 text-xs font-medium rounded transition-colors bg-background text-foreground shadow-sm">
                <Play className="h-3 w-3 inline mr-1" />
                Run
              </button>
            </div>

            {/* Right: Actions drawer trigger */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={() => setIsMobileDrawerOpen(true)}
              title="Actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between w-full">
            <PromptModeNavigation
              promptId={promptData.id}
              promptName={promptData.name}
              currentMode="run"
            />
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {isSharedPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyToMyPrompts}
                  disabled={isCopyingPrompt}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-2 gap-1.5"
                  title="Copy to My Prompts"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Copy</span>
                </Button>
              )}
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
                title={isCanvasOpen ? "Close canvas" : "Open canvas"}
              >
                {isCanvasOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </PageSpecificHeader>

      {/* Mobile Actions Drawer */}
      <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <DrawerContent className="pb-safe">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Actions</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-1 px-4 pb-6">
            {isSharedPrompt && (
              <DrawerClose asChild>
                <button
                  onClick={handleCopyToMyPrompts}
                  disabled={isCopyingPrompt}
                  className="flex items-center gap-3 w-full h-12 px-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  Copy to My Prompts
                </button>
              </DrawerClose>
            )}
            <DrawerClose asChild>
              <button
                onClick={() => setShowSidebarOnMobile(!showSidebarOnMobile)}
                className="flex items-center gap-3 w-full h-12 px-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {showSidebarOnMobile ? (
                  <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
                )}
                {showSidebarOnMobile ? "Hide Runs" : "Show Runs"}
              </button>
            </DrawerClose>
            <DrawerClose asChild>
              <button
                onClick={handleClearConversation}
                className="flex items-center gap-3 w-full h-12 px-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                Reset Conversation
              </button>
            </DrawerClose>
            <DrawerClose asChild>
              <button
                onClick={handleCanvasToggle}
                className="flex items-center gap-3 w-full h-12 px-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {isCanvasOpen ? (
                  <PanelRightClose className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
                )}
                {isCanvasOpen && showCanvasOnMobile
                  ? "Back to Conversation"
                  : isCanvasOpen
                    ? "Show Canvas"
                    : "Open Canvas"}
              </button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>

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
      ) : isMobile ? (
        /* Mobile Runner View - Direct rendering without AdaptiveLayout */
        <div className="h-page w-full bg-textured overflow-x-hidden flex flex-col">
          {/* Shared Prompt Banner for Mobile */}
          {isSharedPrompt && accessInfo && (
            <SharedPromptBanner
              ownerEmail={accessInfo.ownerEmail}
              permissionLevel={accessInfo.permissionLevel}
              className="mx-3 my-2 flex-shrink-0"
            />
          )}
          {activeRunId ? (
            <PromptRunner runId={activeRunId} className="flex-1 w-full" />
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      ) : (
        /* Desktop Layout with AdaptiveLayout */
        <AdaptiveLayout
          className="h-page bg-textured"
          leftPanelMaxWidth={280} // Compact sidebar for runs list
          leftPanel={
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
          }
          rightPanel={
            <div className="h-full flex flex-col overflow-hidden">
              {/* Shared Prompt Banner for Desktop */}
              {isSharedPrompt && accessInfo && (
                <SharedPromptBanner
                  ownerEmail={accessInfo.ownerEmail}
                  permissionLevel={accessInfo.permissionLevel}
                  className="mx-4 my-2 flex-shrink-0"
                />
              )}
              {activeRunId ? (
                <PromptRunner runId={activeRunId} className="flex-1" />
              ) : (
                <div className="flex items-center justify-center flex-1">
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
