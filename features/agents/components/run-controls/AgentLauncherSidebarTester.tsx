"use client";

/**
 * AgentLauncherSidebarTester
 *
 * Testing component for ALL ResultDisplayMode types.
 * Reads REAL data from the current execution instance and launches
 * new parallel executions programmatically — proving the Redux
 * architecture and useAgentLauncher work correctly from any trigger.
 *
 * Replicates the old PromptRunnerModalSidebarTester with:
 *   - All 10 display mode buttons
 *   - Execution config toggles (auto-run, allow-chat, show-variables, etc.)
 *   - New agent features: context, resources, source tracking
 *   - Test modal for direct/inline/background (non-UI modes)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { selectInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.selectors";
import { selectResolvedVariables } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";

import type { ResultDisplayMode } from "@/features/agents/types/instance.types";
import {
  getAllDisplayTypes,
  getDisplayMeta,
} from "@/features/agents/utils/run-ui-utils";
import {
  ChevronDown,
  Zap,
  Eye,
  Settings,
  TestTube2,
  Play,
  TestTube,
  Database,
  Minimize2,
  Layers,
  FolderOpen,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { AgentExecutionTestModal } from "./AgentExecutionTestModal";

interface AgentLauncherSidebarTesterProps {
  instanceId: string;
}

export function AgentLauncherSidebarTester({
  instanceId,
}: AgentLauncherSidebarTesterProps) {
  const { launchAgent } = useAgentLauncher();
  const [isOpen, setIsOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testModalType, setTestModalType] = useState<
    "direct" | "inline" | "background"
  >("direct");

  const [autoRun, setAutoRun] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [showVariables, setShowVariables] = useState(false);
  const [applyVariables, setApplyVariables] = useState(true);
  const [usePreExecutionInput, setUsePreExecutionInput] = useState(false);
  const [useChat, setUseChat] = useState(false);

  const instance = useAppSelector(selectInstance(instanceId));
  const currentVariables = useAppSelector(selectResolvedVariables(instanceId));
  const currentInput = useAppSelector(selectUserInputText(instanceId));

  const openWithDisplayType = async (displayMode: ResultDisplayMode) => {
    if (!instance) {
      console.warn("No active instance — cannot test display type");
      return;
    }

    if (
      displayMode === "direct" ||
      displayMode === "inline" ||
      displayMode === "background"
    ) {
      setTestModalType(displayMode);
      setTestModalOpen(true);
      return;
    }

    try {
      await launchAgent(instance.agentId, {
        sourceFeature: "agent-builder",
        displayMode,
        autoRun,
        allowChat,
        showVariables,
        useChat,
        variables: applyVariables ? currentVariables : undefined,
        userInput: currentInput || undefined,
      });
    } catch (error) {
      console.error("Programmatic agent execution failed:", error);
    }
  };

  const displayTypes = getAllDisplayTypes().map((displayMode) => {
    const meta = getDisplayMeta(displayMode);
    const IconComponent = (
      LucideIcons as unknown as Record<
        string,
        React.ComponentType<{ className?: string }>
      >
    )[meta.icon];

    return {
      name: meta.label,
      icon: IconComponent,
      color: meta.color,
      displayMode,
      note: meta.description,
      testMode: meta.testMode,
    };
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="p-2 space-y-2">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-7 px-2 text-xs"
          >
            <div className="flex items-center gap-1.5">
              <TestTube2 className="w-3.5 h-3.5" />
              <span>Test Display Modes</span>
            </div>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2">
          {/* Pre-Execution Input Toggle */}
          <div className="space-y-2 pr-2 pl-4 pb-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="use-pre-execution"
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Use Pre-Execution Input
              </Label>
              <Switch
                id="use-pre-execution"
                checked={usePreExecutionInput}
                onCheckedChange={setUsePreExecutionInput}
              />
            </div>
          </div>

          <Separator />

          {/* Execution Config Toggles */}
          <div className="space-y-2 pr-2 pl-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="auto-run"
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Auto Run
              </Label>
              <Switch
                id="auto-run"
                checked={autoRun}
                onCheckedChange={setAutoRun}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="allow-chat"
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                Allow Chat
              </Label>
              <Switch
                id="allow-chat"
                checked={allowChat}
                onCheckedChange={setAllowChat}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="show-variables"
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Show Variables
              </Label>
              <Switch
                id="show-variables"
                checked={showVariables}
                onCheckedChange={setShowVariables}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="apply-variables"
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Apply Variables
              </Label>
              <Switch
                id="apply-variables"
                checked={applyVariables}
                onCheckedChange={setApplyVariables}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="use-chat-endpoint"
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                Use Chat Endpoint
              </Label>
              <Switch
                id="use-chat-endpoint"
                checked={useChat}
                onCheckedChange={setUseChat}
              />
            </div>
          </div>

          <Separator />

          {/* Context & Resources Info */}
          {instance && (
            <div className="px-4 py-1.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <FolderOpen className="w-3 h-3" />
                <span>
                  Source: {instance.sourceApp} / {instance.sourceFeature}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Database className="w-3 h-3" />
                <span>
                  Agent: {instance.agentId || "(no agent)"} | Origin:{" "}
                  {instance.origin}
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Display Type Buttons */}
          <div className="space-y-1">
            <div className="space-y-0 px-1">
              {displayTypes.map((display) => (
                <Button
                  key={display.displayMode}
                  variant="ghost"
                  size="sm"
                  onClick={() => openWithDisplayType(display.displayMode)}
                  className="w-full justify-start h-8 px-2 text-xs hover:bg-accent"
                  title={display.note}
                >
                  {display.icon && (
                    <display.icon
                      className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${display.color}`}
                    />
                  )}
                  <span className="flex-1 text-left font-medium">
                    {display.name}
                  </span>
                  {display.testMode && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1">
                      <TestTube className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>

      {/* Test Modal for Direct/Inline/Background */}
      {instance && (
        <AgentExecutionTestModal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          testType={testModalType}
          agentId={instance.agentId}
          sourceInstanceId={instanceId}
          autoRun={autoRun}
          allowChat={allowChat}
          showVariables={showVariables}
          applyVariables={applyVariables}
          useChat={useChat}
          variables={applyVariables ? currentVariables : {}}
          userInput={currentInput || ""}
        />
      )}
    </Collapsible>
  );
}
