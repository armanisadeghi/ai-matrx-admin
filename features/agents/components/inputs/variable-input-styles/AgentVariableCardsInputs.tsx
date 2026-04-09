"use client";

/**
 * Renders one AgentVariableInputCard per definition (micro card UX), gated like other variable layouts.
 */

import { useAppSelector } from "@/lib/redux/hooks";
import { selectInstanceVariableDefinitions } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectShouldShowVariables } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectShowVariablePanel } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { AgentVariableInputCard } from "./AgentVariableInputCard";

interface AgentVariableCardsInputsProps {
  conversationId: string;
  onSubmit?: () => void;
}

export function AgentVariableCardsInputs({
  conversationId,
  onSubmit,
}: AgentVariableCardsInputsProps) {
  const showVariablePanel = useAppSelector(
    selectShowVariablePanel(conversationId),
  );
  const shouldShowVariables = useAppSelector(
    selectShouldShowVariables(conversationId),
  );
  const defs = useAppSelector(
    selectInstanceVariableDefinitions(conversationId),
  );

  if (!shouldShowVariables || !showVariablePanel || defs.length === 0) {
    return null;
  }

  const fire = onSubmit ?? (() => {});

  return (
    <div className="flex flex-col gap-2 border-b border-border px-2 py-2">
      {defs.map((variable) => (
        <div
          key={variable.name}
          className="flex justify-center sm:justify-start"
        >
          <AgentVariableInputCard
            conversationId={conversationId}
            variable={variable}
            onSubmit={fire}
          />
        </div>
      ))}
    </div>
  );
}
