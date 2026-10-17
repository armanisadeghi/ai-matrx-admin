"use client";

/**
 * One message's flags, their per-model verdicts, and the toggle — the single
 * door every message header (user/assistant items and the system message) uses.
 */

import { useAppDispatch, useAppSelector } from "@ai-matrx/chat/store/hooks";
import {
  selectAgentMessages,
  selectAgentModelId,
  selectAgentOfferingPin,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import {
  setAgentMessages,
} from "@/features/agents/redux/agent-builder.slice";
import { useModelFull } from "@ai-matrx/chat/agents/identity/model-catalog";
import { useSessionKnob } from "@ai-matrx/chat/host/prefs-react";
import type { AgentDefinitionMessage } from "@ai-matrx/chat/agents/types/agent-message-types";
import {
  FLAG_COMPATIBILITY_KNOB,
  flagPlacementProblem,
  flagsOf,
  prefillVerdict,
  resolveFlagCompatibilityMode,
  toggleMessageFlag,
  type MessageFlagKey,
  type MessageFlags,
} from "@ai-matrx/chat/agents/message-flags/flags";
import { movePrefillIntoInstructions } from "./prefillWayOut";
import type { FlagToggleState } from "@ai-matrx/chat/agents/message-flags/MessageFlagToggles";
import { useMessageFlagProfile } from "@ai-matrx/chat/agents/message-flags/useMessageFlagProfile";

export interface MessageFlagsController {
  flags: MessageFlags;
  states: Partial<Record<MessageFlagKey, FlagToggleState>>;
  onToggle: (flag: MessageFlagKey) => void;
  /** The prefill way-out menu (PrefillCompatNote): the verdict plus the fixes. */
  prefill: {
    on: boolean;
    verdict: FlagToggleState["verdict"];
    pickModel: () => void;
    moveIntoInstructions: () => void;
    remove: () => void;
  };
}

export function useMessageFlags(agentId: string, messageIndex: number): MessageFlagsController {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state) => selectAgentMessages(state, agentId));
  const modelId = useAppSelector((state) => selectAgentModelId(state, agentId));
  const model = useModelFull(modelId);
  const offeringPin = useAppSelector((state) => selectAgentOfferingPin(state, agentId));
  const profile = useMessageFlagProfile(modelId, offeringPin);
  const mode = resolveFlagCompatibilityMode(useSessionKnob(FLAG_COMPATIBILITY_KNOB));

  const list = messages ?? [];
  const message = list[messageIndex];
  const flags = flagsOf(message);
  const role = message?.role;
  const isLast = messageIndex === list.length - 1;

  const states: Partial<Record<MessageFlagKey, FlagToggleState>> = {
    example: {
      // Examples are added as a pair from the builder's "+ Example" button and
      // removed by deleting their messages — never toggled in a message header.
      hidden: true,
      verdict: {
        verdict: "native",
        reason: "Sent as an ordinary turn; the paired user and assistant messages toggle together.",
      },
      placementProblem: flags.example ? flagPlacementProblem(list, messageIndex, "example") : null,
    },
    prefill: {
      // Absent unless it can be lawful here — or it is set and now misplaced,
      // so the author can see why and switch it off.
      hidden: !flags.prefill && !(role === "assistant" && isLast),
      verdict: prefillVerdict(model, mode),
      placementProblem: flags.prefill ? flagPlacementProblem(list, messageIndex, "prefill") : null,
    },
  };

  const onToggle = (flag: MessageFlagKey) => {
    if (!messages) return;
    dispatch(
      setAgentMessages({
        id: agentId,
        messages: toggleMessageFlag(messages, messageIndex, flag) as AgentDefinitionMessage[],
      }),
    );
  };

  const prefillVerdictNow = prefillVerdict(model, mode);
  const prefill = {
    on: flags.prefill === true,
    verdict: prefillVerdictNow,
    pickModel: () => {
      const section = document.querySelector<HTMLElement>('[data-agent-builder-section="model"]');
      if (!section) {
        console.error("[useMessageFlags] the model section is not on this page");
        return;
      }
      section.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(() => section.querySelector<HTMLElement>("button")?.click(), 250);
    },
    moveIntoInstructions: () => {
      if (!messages) return;
      dispatch(
        setAgentMessages({
          id: agentId,
          messages: movePrefillIntoInstructions(messages) as AgentDefinitionMessage[],
        }),
      );
    },
    remove: () => onToggle("prefill"),
  };

  return { flags, states, onToggle, prefill };
}
