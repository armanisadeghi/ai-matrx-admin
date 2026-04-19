import { AgentExecutionTestModal } from "./AgentExecutionTestModal";
import * as LucideIcons from "lucide-react";
import {
  getAllDisplayTypes,
  getDisplayMeta,
} from "@/features/agents/utils/run-ui-utils";
import { useAgentLauncherTester } from "@/features/agents/hooks/useAgentLauncherTester";
import type { SourceFeature } from "@/features/agents/types/instance.types";
import { TesterSettingsPanel } from "./TesterSettingsPanel";

// =============================================================================
// Widget invoker test harness
//
// Borrows state from the active conversation and re-launches the same agent
// into each display-mode widget. Every launch gets its own unique surfaceKey
// so parallel widgets coexist without focus-registry collisions.
// =============================================================================

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
      <div className="w-[230px] shrink-0 border-r border-border overflow-y-auto">
        <div className="p-2">
          <TesterSettingsPanel
            controller={tester}
            quickTest={{
              applyVariables: tester.applyVariables,
              setApplyVariables: tester.setApplyVariables,
              applyUserInput: tester.applyUserInput,
              setApplyUserInput: tester.setApplyUserInput,
              applyAppContext: tester.applyAppContext,
              setApplyAppContext: tester.setApplyAppContext,
            }}
            idPrefix="widget-test"
          />
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
