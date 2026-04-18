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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { selectAgentName } from "@/features/agents/redux/agent-definition/selectors";

import type { ResultDisplayMode } from "@/features/agents/types/instance.types";
import {
  VARIABLE_INPUT_STYLE_OPTIONS,
  type VariableInputStyle,
} from "@/features/agents/types";
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
  Copy,
  Check,
  GalleryVertical,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { AgentExecutionTestModal } from "./AgentExecutionTestModal";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 min-w-0">
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <span className="text-[10px] font-medium text-foreground truncate">
        {value}
      </span>
    </div>
  );
}

interface AgentLauncherSidebarTesterProps {
  conversationId: string;
}

export function AgentLauncherSidebarTester({
  conversationId,
}: AgentLauncherSidebarTesterProps) {
  const { launchAgent } = useAgentLauncher();
  const [isOpen, setIsOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testModalType, setTestModalType] = useState<"direct" | "background">(
    "direct",
  );

  const [autoRun, setAutoRun] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [showVariables, setShowVariables] = useState(false);
  const [variableInputStyle, setVariableInputStyle] =
    useState<VariableInputStyle>("inline");
  const [applyVariables, setApplyVariables] = useState(true);
  const [usePreExecutionInput, setUsePreExecutionInput] = useState(false);
  const [conversationMode, setConversationMode] = useState<"agent" | "chat">(
    "agent",
  );

  const [copiedId, setCopiedId] = useState(false);

  const instance = useAppSelector(selectInstance(conversationId));
  const agentName = useAppSelector((state) =>
    instance?.agentId ? selectAgentName(state, instance.agentId) : undefined,
  );
  const currentVariables = useAppSelector(
    selectResolvedVariables(conversationId),
  );
  const currentInput = useAppSelector(selectUserInputText(conversationId));

  const copyAgentId = () => {
    if (!instance?.agentId) return;
    navigator.clipboard.writeText(instance.agentId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const openWithDisplayType = async (displayMode: ResultDisplayMode) => {
    if (!instance) {
      console.warn("No active instance — cannot test display type");
      return;
    }

    if (displayMode === "direct" || displayMode === "background") {
      setTestModalType(displayMode);
      setTestModalOpen(true);
      return;
    }

    try {
      await launchAgent(instance.agentId, {
        sourceFeature: "agent-launcher-sidebar",
        displayMode,
        autoRun,
        allowChat,
        showVariables,
        usePreExecutionInput,
        conversationMode,
        variableInputStyle,
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
      <CollapsibleTrigger asChild>
        <div className="border-b border-border">
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
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 py-1">
        <Separator />

        {/* Context & Resources Info */}
        {/* {instance && (
          <div className="px-2 py-1 space-y-1.5">
            <InfoRow label="Source App" value={instance.sourceApp || "—"} />
            <InfoRow
              label="Source Feature"
              value={instance.sourceFeature || "—"}
            />
            <InfoRow label="Execution Style" value={instance.origin || "—"} />
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground">Agent</span>
              {agentName && (
                <div className="text-[10px] font-medium text-foreground truncate">
                  {agentName}
                </div>
              )}
              {instance.agentId && (
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[9px] text-muted-foreground font-mono truncate">
                    {instance.agentId}
                  </span>
                  <button
                    onClick={copyAgentId}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy agent ID"
                  >
                    {copiedId ? (
                      <Check className="w-2.5 h-2.5 text-green-500" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )} */}
        {/* Execution Config Toggles */}
        <div className="space-y-2 p-2">
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
              htmlFor="variable-input-style"
              className={`flex items-center gap-1.5 text-xs ${showVariables ? "text-foreground" : "text-muted-foreground cursor-not-allowed"}`}
              aria-disabled={!showVariables}
            >
              <GalleryVertical className="w-3.5 h-3.5 shrink-0" />
              Variable UI
            </Label>
            <Select
              value={variableInputStyle}
              onValueChange={(v) =>
                setVariableInputStyle(v as VariableInputStyle)
              }
              disabled={!showVariables}
            >
              <SelectTrigger
                id="variable-input-style"
                size="sm"
                className="min-w-[9rem] max-w-[9rem] shrink-0"
              >
                <SelectValue placeholder="Variable UI" />
              </SelectTrigger>
              <SelectContent>
                {VARIABLE_INPUT_STYLE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    title={opt.description}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label
              htmlFor="conversation-mode"
              className="flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              Mode
            </Label>
            <Select
              value={conversationMode}
              onValueChange={(v) =>
                setConversationMode(v as "agent" | "chat")
              }
            >
              <SelectTrigger
                id="conversation-mode"
                size="sm"
                className="min-w-[9rem] max-w-[9rem] shrink-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="chat">Chat (builder)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Display Type Buttons */}
        <div className="space-y-0.5">
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

      {/* Test Modal for Direct/Inline/Background */}
      {instance && (
        <AgentExecutionTestModal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          testType={testModalType}
          agentId={instance.agentId}
          sourceInstanceId={conversationId}
          autoRun={autoRun}
          allowChat={allowChat}
          showVariables={showVariables}
          applyVariables={applyVariables}
          conversationMode={conversationMode}
          variableInputStyle={variableInputStyle}
          variables={applyVariables ? currentVariables : {}}
          userInput={currentInput || ""}
        />
      )}
    </Collapsible>
  );
}
