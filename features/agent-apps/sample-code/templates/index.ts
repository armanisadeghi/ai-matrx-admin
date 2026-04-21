/**
 * Agent-App Template Registry
 *
 * Maps AppDisplayMode values to their corresponding template code strings.
 * Used by:
 * - The app creation flow when a user selects a display mode
 * - AI code generation instructions that need example templates
 *
 * Each template is a complete React component string that the Babel +
 * `new Function()` pipeline transforms and renders at runtime.
 *
 * All templates receive the standard `AgentAppComponentProps`:
 * - onExecute(variables, userInput)  — invokes the agent
 * - response                          — streaming text accumulation
 * - streamEvents                      — raw stream events
 * - conversationId                    — active conversation id (null before first run)
 * - onResetConversation               — clears the conversation
 *
 * Chat-mode follow-ups call `onExecute({}, userInput)` — empty variables
 * signal "no new inputs"; the renderer detects the existing conversationId
 * and routes to the continuation endpoint.
 */

import type { AppDisplayMode } from "../../types";
import formTemplate from "./form-template";
import formToChatTemplate from "./form-to-chat-template";
import chatTemplate from "./chat-template";
import centeredInputTemplate from "./centered-input-template";
import chatWithHistoryTemplate from "./chat-with-history-template";

export function getTemplateForDisplayMode(mode: AppDisplayMode): string {
  switch (mode) {
    case "form":
      return formTemplate;
    case "form-to-chat":
      return formToChatTemplate;
    case "chat":
      return chatTemplate;
    case "centered-input":
      return centeredInputTemplate;
    case "chat-with-history":
      return chatWithHistoryTemplate;
    default:
      return formTemplate;
  }
}

export const DISPLAY_MODE_OPTIONS: {
  value: AppDisplayMode;
  label: string;
  description: string;
  supportsChat: boolean;
}[] = [
  {
    value: "form",
    label: "Form",
    description:
      "Classic form inputs at top, AI response below. Single execution, no follow-up.",
    supportsChat: false,
  },
  {
    value: "form-to-chat",
    label: "Form to Chat",
    description:
      "Form for initial input, then transitions to chat for follow-up conversation.",
    supportsChat: true,
  },
  {
    value: "chat",
    label: "Chat",
    description:
      "Full chat interface from the start. Input at bottom, messages flow up.",
    supportsChat: true,
  },
  {
    value: "centered-input",
    label: "Centered Input",
    description:
      "Landing-page style with large centered input. Converts to chat after first message.",
    supportsChat: true,
  },
  {
    value: "chat-with-history",
    label: "Chat with History",
    description:
      "Full chat with collapsible sidebar showing past conversation runs.",
    supportsChat: true,
  },
];

export function displayModeSupportsChat(mode: AppDisplayMode): boolean {
  for (const option of DISPLAY_MODE_OPTIONS) {
    if (option.value === mode) return option.supportsChat;
  }
  return false;
}

export function getDefaultDisplayMode(): AppDisplayMode {
  return "form";
}

export {
  formTemplate,
  formToChatTemplate,
  chatTemplate,
  centeredInputTemplate,
  chatWithHistoryTemplate,
};
