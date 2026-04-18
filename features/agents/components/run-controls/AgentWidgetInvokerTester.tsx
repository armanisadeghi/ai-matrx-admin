import { AgentLauncherSidebarTester } from "./AgentLauncherSidebarTester";
import { AgentExecutionTestModal } from "./AgentExecutionTestModal";
import * as LucideIcons from "lucide-react";
import {
  getAllDisplayTypes,
  getDisplayMeta,
} from "@/features/agents/utils/run-ui-utils";
import { useAgentLauncherTester } from "@/features/agents/hooks/useAgentLauncherTester";
import {
  VARIABLE_INPUT_STYLE_OPTIONS,
  type VariableInputStyle,
} from "@/features/agents/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =============================================================================
// Tab 8: Test Displays
// =============================================================================

export function AgentWidgetInvokerTester({
  conversationId,
}: {
  conversationId: string;
}) {
  const tester = useAgentLauncherTester(conversationId, "agent-creator-panel");

  const displayTypes = getAllDisplayTypes().map((displayMode) => {
    const meta = getDisplayMeta(displayMode);
    const IconComponent = (LucideIcons as any)[meta.icon];
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
    <div className="flex h-full w-full">
      {/* Left sidebar for configurations */}
      <div className="w-1/3 min-w-[170px] max-w-[210px] border-r border-border p-2 overflow-y-auto ">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <Label
              htmlFor="creator-test-use-pre-execution"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Use Pre-Execution Input
            </Label>
            <Switch
              id="creator-test-use-pre-execution"
              checked={tester.usePreExecutionInput}
              onCheckedChange={tester.setUsePreExecutionInput}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            <Label
              htmlFor="creator-test-apply-variables"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Apply Variables
            </Label>
            <Switch
              id="creator-test-apply-variables"
              checked={tester.applyVariables}
              onCheckedChange={tester.setApplyVariables}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            <Label
              htmlFor="creator-test-auto-run"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Auto Run
            </Label>
            <Switch
              id="creator-test-auto-run"
              checked={tester.autoRun}
              onCheckedChange={tester.setAutoRun}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            <Label
              htmlFor="creator-test-allow-chat"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Allow Chat
            </Label>
            <Switch
              id="creator-test-allow-chat"
              checked={tester.allowChat}
              onCheckedChange={tester.setAllowChat}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            <Label
              htmlFor="creator-test-show-variables"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Show Variables
            </Label>
            <Switch
              id="creator-test-show-variables"
              checked={tester.showVariables}
              onCheckedChange={tester.setShowVariables}
              className="scale-75 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            <Label
              htmlFor="creator-test-variable-input-style"
              className={`text-[11px] leading-tight ${tester.showVariables ? "text-foreground cursor-pointer" : "text-muted-foreground cursor-not-allowed"}`}
              aria-disabled={!tester.showVariables}
            >
              Variable UI
            </Label>
            <Select
              value={tester.variableInputStyle}
              onValueChange={(v) =>
                tester.setVariableInputStyle(v as VariableInputStyle)
              }
              disabled={!tester.showVariables}
            >
              <SelectTrigger
                id="creator-test-variable-input-style"
                size="sm"
                className="h-5 min-w-[6.5rem] max-w-[6.5rem] shrink-0 text-[11px] px-1.5"
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
          <div className="flex items-center justify-between gap-1">
            <Label
              htmlFor="creator-test-conversation-mode"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Mode
            </Label>
            <Select
              value={tester.conversationMode}
              onValueChange={(v) =>
                tester.setConversationMode(v as "agent" | "chat")
              }
            >
              <SelectTrigger
                id="creator-test-conversation-mode"
                size="sm"
                className="h-5 min-w-[6.5rem] max-w-[6.5rem] shrink-0 text-[11px] px-1.5"
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
      </div>

      {/* Right side for icons */}
      <div className="flex-1 p-1 flex flex-wrap content-start gap-2 overflow-y-auto">
        {displayTypes.map((display) => (
          <button
            key={display.displayMode}
            onClick={() => tester.openWithDisplayType(display.displayMode)}
            title={display.note}
            className="flex flex-col items-center justify-center border border-border gap-1.5 w-[84px] h-[84px] bg-muted/10 hover:bg-muted/30 border border-transparent hover:border-border rounded-xl transition-all shrink-0"
          >
            {display.icon && (
              <display.icon className={`w-7 h-7 ${display.color}`} />
            )}
            <span className="text-[10px] text-center leading-tight line-clamp-2 break-words w-full p-1">
              {display.name}
            </span>
          </button>
        ))}
      </div>

      {tester.instance && (
        <AgentExecutionTestModal
          isOpen={tester.testModalOpen}
          onClose={() => tester.setTestModalOpen(false)}
          testType={tester.testModalType}
          agentId={tester.instance.agentId}
          sourceInstanceId={conversationId}
          autoRun={tester.autoRun}
          allowChat={tester.allowChat}
          showVariables={tester.showVariables}
          applyVariables={tester.applyVariables}
          conversationMode={tester.conversationMode}
          variableInputStyle={tester.variableInputStyle}
          variables={tester.applyVariables ? tester.currentVariables : {}}
          userInput={tester.currentInput || ""}
        />
      )}
    </div>
  );
}
