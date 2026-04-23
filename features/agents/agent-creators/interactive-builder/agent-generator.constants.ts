import type {
  ManagedAgentOptions,
  ResultDisplayMode,
  ApiEndpointMode,
} from "@/features/agents/types/instance.types";

/**
 * Standardized in-app agent configuration for the AI Agent Generator.
 *
 * Launches via the "Agent Generator" shortcut, which:
 *   - Pins the agent + version to use (shortcut owns the agent reference)
 *   - Maps `selection` scope → the agent's primary description variable
 *   - Runs in direct display mode so this component owns the UI
 *
 * The caller here sends the two UI fields mapped to the shortcut's
 * standard input surface:
 *   - `scope.selection` — "What should this agent do?"
 *   - `runtime.userInput` — "Additional context" (optional)
 *
 * JSON extraction is on so the streaming output is parsed into a structured
 * agent config in real time; see `extractAgentConfig` for the shape.
 */
export const AGENT_GENERATOR_CONFIG = {
  shortcutId: "cfde5205-598f-41d5-a627-6774846f5879",

  launchDefaults: {
    displayMode: "direct" as ResultDisplayMode,
    autoRun: false,
    allowChat: false,
    showVariables: false,
    showVariablePanel: false,
    showDefinitionMessages: false,
    showDefinitionMessageContent: false,
    showPreExecutionGate: false,
    autoClearConversation: false,
    hideReasoning: true,
    hideToolResults: true,
    sourceFeature: "agent-generator" as const,
    jsonExtraction: {
      enabled: true,
      fuzzyOnFinalize: true,
      maxResults: 5,
    },
  } satisfies Partial<ManagedAgentOptions>,

  variables: {
    prompt_purpose: "",
  },
} as const;
