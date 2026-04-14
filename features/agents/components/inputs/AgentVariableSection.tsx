"use client";

/**
 * AgentVariableSection
 *
 * Renders the correct variable input UI based on the instance's variableInputStyle.
 * Only requires conversationId — reads style from Redux directly.
 * Receives onSubmit as a stable callback since it needs to know how to submit.
 */

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectVariableInputStyle } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { SmartAgentVariableInputs } from "./SmartAgentVariableInputs";
import { WizardAgentVariableInputs } from "./WizardAgentVariableInputs";
import {
  AgentCompactVariableInputs,
  AgentGuidedVariableInputs,
  AgentVariableCardsInputs,
} from "./variable-input-styles";
import { AgentVariableInputForm } from "../run/AgentVariableInputForm";
import type { VariableInputStyle } from "@/features/agents/types/instance.types";

interface AgentVariableSectionProps {
  conversationId: string;
  compact?: boolean;
  onSubmit: () => void;
  /** Override the Redux-stored style (e.g. from parent props) */
  styleOverride?: VariableInputStyle;
}

export function AgentVariableSection({
  conversationId,
  compact = false,
  onSubmit,
  styleOverride,
}: AgentVariableSectionProps) {
  const reduxStyle = useAppSelector(selectVariableInputStyle(conversationId));
  const submitOnEnter = useAppSelector(
    (state) =>
      state.instanceUIState.byConversationId[conversationId]?.submitOnEnter ??
      true,
  );

  const style = styleOverride ?? reduxStyle;

  switch (style) {
    case "form":
      return <AgentVariableInputForm conversationId={conversationId} />;
    case "inline":
      return (
        <SmartAgentVariableInputs
          conversationId={conversationId}
          compact={compact}
          onSubmit={onSubmit}
          submitOnEnter={submitOnEnter}
        />
      );
    case "wizard":
      return (
        <WizardAgentVariableInputs
          conversationId={conversationId}
          onSubmit={onSubmit}
        />
      );
    case "compact":
      return <AgentCompactVariableInputs conversationId={conversationId} />;
    case "guided":
      return (
        <AgentGuidedVariableInputs conversationId={conversationId} seamless />
      );
    case "cards":
      return (
        <AgentVariableCardsInputs
          conversationId={conversationId}
          onSubmit={onSubmit}
        />
      );
    default:
      return null;
  }
}
