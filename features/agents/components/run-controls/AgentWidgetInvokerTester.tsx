import { useState } from "react";
import { AgentExecutionTestModal } from "./AgentExecutionTestModal";
import * as LucideIcons from "lucide-react";
import { ChevronRight } from "lucide-react";
import {
  getAllDisplayTypes,
  getDisplayMeta,
} from "@/features/agents/utils/run-ui-utils";
import { useAgentLauncherTester } from "@/features/agents/hooks/useAgentLauncherTester";
import {
  VARIABLE_INPUT_STYLE_OPTIONS,
  type VariableInputStyle,
} from "@/features/agents/types";
import type { SourceFeature } from "@/features/agents/types/instance.types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiEndpointMode } from "@/features/agents/types/instance.types";

// =============================================================================
// Widget invoker test harness
//
// Borrows state from the active conversation and re-launches the same agent
// into each display-mode widget. Every launch gets its own unique surfaceKey
// so parallel widgets coexist without focus-registry collisions.
//
// `sourceFeature` is passed in by the host UI — not configurable from inside.
// =============================================================================

function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  title,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-1" title={title}>
      <Label
        htmlFor={id}
        className={`text-[11px] leading-tight ${
          disabled
            ? "text-muted-foreground cursor-not-allowed"
            : "text-foreground cursor-pointer"
        }`}
        aria-disabled={disabled}
      >
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="scale-75 shrink-0"
      />
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-1 pb-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 border-t border-border/60">
      {children}
    </div>
  );
}

export function AgentWidgetInvokerTester({
  conversationId,
  sourceFeature,
  surfaceKey,
}: {
  conversationId: string;
  sourceFeature: SourceFeature;
  surfaceKey: string;
}) {
  const tester = useAgentLauncherTester(
    conversationId,
    sourceFeature,
    surfaceKey,
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
      {/* Left sidebar: narrow, scrollable, labels get the room */}
      <div className="w-[230px] shrink-0 border-r border-border overflow-y-auto">
        <div className="p-2 space-y-2">
          {/* ── Main settings (no header — the primary surface) ────────── */}
          <SwitchRow
            id="widget-test-auto-run"
            label="Auto Run"
            checked={tester.autoRun}
            onCheckedChange={tester.setAutoRun}
            title="Start execution immediately after launch"
          />
          <SwitchRow
            id="widget-test-show-variable-panel"
            label="Show Variables Panel"
            checked={tester.showVariablePanel}
            onCheckedChange={tester.setShowVariablePanel}
            title="Render the variable input panel inside the widget"
          />

          <div className="flex items-center justify-between gap-1">
            <Label
              htmlFor="widget-test-variable-input-style"
              className={`text-[11px] leading-tight ${
                tester.showVariablePanel
                  ? "text-foreground cursor-pointer"
                  : "text-muted-foreground cursor-not-allowed"
              }`}
              aria-disabled={!tester.showVariablePanel}
            >
              Variable Input Style
            </Label>
            <Select
              value={tester.variableInputStyle}
              onValueChange={(v) =>
                tester.setVariableInputStyle(v as VariableInputStyle)
              }
              disabled={!tester.showVariablePanel}
            >
              <SelectTrigger
                id="widget-test-variable-input-style"
                size="sm"
                className="h-5 min-w-[6.5rem] max-w-[6.5rem] shrink-0 text-[11px] px-1.5"
              >
                <SelectValue />
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

          <SwitchRow
            id="widget-test-use-pre-execution"
            label="Use Pre-Execution Input"
            checked={tester.usePreExecutionInput}
            onCheckedChange={tester.setUsePreExecutionInput}
            title="Gate the widget with an initial input screen"
          />

          {tester.usePreExecutionInput && (
            <input
              id="widget-test-pre-execution-message"
              type="text"
              value={tester.preExecutionMessage}
              onChange={(e) => tester.setPreExecutionMessage(e.target.value)}
              placeholder="Pre-execution message"
              className="h-6 w-full rounded-md border border-border bg-background px-2 text-[11px] leading-tight placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}

          <SwitchRow
            id="widget-test-show-definition-messages"
            label="Show Definition Messages"
            checked={tester.showDefinitionMessages}
            onCheckedChange={tester.setShowDefinitionMessages}
          />
          <SwitchRow
            id="widget-test-show-definition-content"
            label="Show Definition Content"
            checked={tester.showDefinitionMessageContent}
            onCheckedChange={tester.setShowDefinitionMessageContent}
            title="Reveal raw template content inside definition messages"
          />
          <SwitchRow
            id="widget-test-allow-chat"
            label="Allow Chat"
            checked={tester.allowChat}
            onCheckedChange={tester.setAllowChat}
            title="Permit multi-turn follow-ups after the first response"
          />
          <SwitchRow
            id="widget-test-hide-reasoning"
            label="Hide Reasoning"
            checked={tester.hideReasoning}
            onCheckedChange={tester.setHideReasoning}
          />
          <SwitchRow
            id="widget-test-hide-tool-calls"
            label="Hide Tool Calls"
            checked={tester.hideToolResults}
            onCheckedChange={tester.setHideToolResults}
          />

          <div className="space-y-0.5">
            <Label
              htmlFor="widget-test-original-text"
              className="text-[11px] cursor-pointer leading-tight"
            >
              Original Text
            </Label>
            <textarea
              id="widget-test-original-text"
              value={tester.originalText}
              onChange={(e) => tester.setOriginalText(e.target.value)}
              rows={2}
              placeholder="Text selected in the simulated editor"
              className="w-full resize-y rounded-md border border-border bg-background px-1.5 py-1 text-[11px] leading-tight placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* ── Quick Test Features ─────────────────────────────────────── */}
          <GroupLabel>Quick Test Features</GroupLabel>

          <SwitchRow
            id="widget-test-apply-variables"
            label="Apply My Local Variables"
            checked={tester.applyVariables}
            onCheckedChange={tester.setApplyVariables}
            title="Send the active conversation's resolved variable values"
          />
          <SwitchRow
            id="widget-test-apply-user-input"
            label="Apply My Local User Input"
            checked={tester.applyUserInput}
            onCheckedChange={tester.setApplyUserInput}
            title="Send the active conversation's current user input text"
          />
          <SwitchRow
            id="widget-test-apply-app-context"
            label="Apply My Local App Context"
            checked={tester.applyAppContext}
            onCheckedChange={tester.setApplyAppContext}
            title="Construct an Application Scope from the active state"
          />

          {/* ── Advanced Controls (click to open) ───────────────────────── */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="mt-1 flex w-full items-center gap-1 border-t border-border/60 pt-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground"
          >
            <ChevronRight
              className={`h-2.5 w-2.5 transition-transform ${
                advancedOpen ? "rotate-90" : ""
              }`}
            />
            Advanced Controls
          </button>

          {advancedOpen && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <Label
                  htmlFor="widget-test-api-endpoint-mode"
                  className="text-[11px] cursor-pointer leading-tight"
                >
                  API Endpoint Mode
                </Label>
                <Select
                  value={tester.apiEndpointMode}
                  onValueChange={(v) =>
                    tester.setApiEndpointMode(v as ApiEndpointMode)
                  }
                >
                  <SelectTrigger
                    id="widget-test-api-endpoint-mode"
                    size="sm"
                    className="h-5 min-w-[6.5rem] max-w-[6.5rem] shrink-0 text-[11px] px-1.5"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SwitchRow
                id="widget-test-show-auto-clear-toggle"
                label="Show Auto-Clear Toggle"
                checked={tester.showAutoClearToggle}
                onCheckedChange={tester.setShowAutoClearToggle}
                title="Render the auto-clear toggle inside the widget's input area"
              />
              <SwitchRow
                id="widget-test-auto-clear"
                label="Initial Auto-Clear Value"
                checked={tester.autoClearConversation}
                onCheckedChange={tester.setAutoClearConversation}
                title="Initial value for the widget's auto-clear behavior"
              />

              <SwitchRow
                id="widget-test-json-extraction"
                label="JSON Extraction"
                checked={tester.jsonExtractionEnabled}
                onCheckedChange={tester.setJsonExtractionEnabled}
                title="Run StreamingJsonTracker during this request"
              />
              <SwitchRow
                id="widget-test-json-fuzzy"
                label="Fuzzy On Finalize"
                checked={tester.jsonExtractionFuzzy}
                onCheckedChange={tester.setJsonExtractionFuzzy}
                disabled={!tester.jsonExtractionEnabled}
              />

              <div className="flex items-center justify-between gap-1">
                <Label
                  htmlFor="widget-test-json-max"
                  className={`text-[11px] leading-tight ${
                    tester.jsonExtractionEnabled
                      ? "text-foreground cursor-pointer"
                      : "text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  Max Results
                </Label>
                <input
                  id="widget-test-json-max"
                  type="number"
                  min={1}
                  value={tester.jsonExtractionMaxResults}
                  onChange={(e) =>
                    tester.setJsonExtractionMaxResults(e.target.value)
                  }
                  disabled={!tester.jsonExtractionEnabled}
                  placeholder="∞"
                  className="h-5 w-16 shrink-0 rounded-md border border-border bg-background px-1.5 text-[11px] leading-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-0.5">
                <Label
                  htmlFor="widget-test-overrides"
                  className="text-[11px] cursor-pointer leading-tight"
                >
                  LLM Overrides (JSON)
                </Label>
                <textarea
                  id="widget-test-overrides"
                  value={tester.overridesJson}
                  onChange={(e) => tester.setOverridesJson(e.target.value)}
                  rows={3}
                  spellCheck={false}
                  placeholder={`{ "temperature": 0.2 }`}
                  className="w-full resize-y rounded-md border border-border bg-background px-1.5 py-1 font-mono text-[10.5px] leading-tight placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-0.5">
                <Label
                  htmlFor="widget-test-app-scope"
                  className="text-[11px] cursor-pointer leading-tight"
                >
                  Application Scope (JSON)
                </Label>
                <textarea
                  id="widget-test-app-scope"
                  value={tester.applicationScopeJson}
                  onChange={(e) =>
                    tester.setApplicationScopeJson(e.target.value)
                  }
                  rows={3}
                  spellCheck={false}
                  placeholder={`{ "selection": "..." }`}
                  className="w-full resize-y rounded-md border border-border bg-background px-1.5 py-1 font-mono text-[10.5px] leading-tight placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          {tester.jsonError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-1.5 py-1 text-[10.5px] text-destructive leading-tight">
              {tester.jsonError}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Display Mode grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-1 flex flex-wrap content-start gap-2">
          {displayTypes.map((display) => (
            <button
              key={display.displayMode}
              onClick={() => tester.openWithDisplayType(display.displayMode)}
              title={display.note}
              className="flex flex-col items-center justify-center gap-1.5 w-[84px] h-[84px] bg-muted/10 hover:bg-muted/30 border border-transparent hover:border-border rounded-xl transition-all shrink-0"
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
      </div>

      {tester.instance && (
        <AgentExecutionTestModal
          surfaceKey={surfaceKey}
          isOpen={tester.testModalOpen}
          onClose={() => tester.setTestModalOpen(false)}
          testType={tester.testModalType}
          agentId={tester.instance.agentId}
          sourceInstanceId={conversationId}
          autoRun={tester.autoRun}
          allowChat={tester.allowChat}
          showVariables={tester.showVariablePanel}
          applyVariables={tester.applyVariables}
          apiEndpointMode={tester.apiEndpointMode}
          variableInputStyle={tester.variableInputStyle}
          variables={tester.applyVariables ? tester.currentVariables : {}}
          userInput={
            tester.applyUserInput && tester.currentInput
              ? tester.currentInput
              : ""
          }
        />
      )}
    </div>
  );
}
