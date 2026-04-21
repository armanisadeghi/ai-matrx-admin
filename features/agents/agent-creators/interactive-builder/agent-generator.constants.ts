import type {
  ManagedAgentOptions,
  ResultDisplayMode,
  ApiEndpointMode,
} from "@/features/agents/types/instance.types";

/**
 * Standardized in-app agent definition for the AI Agent Generator.
 *
 * This agent takes a user's description of what they want and generates
 * a complete agent configuration (system message, variables, settings)
 * as structured JSON.
 *
 * The agent ID maps to the "Full Prompt Structure Builder" which was
 * duplicated from prompt_builtins into the agx_agent table with the
 * same UUID so existing definitions carry over.
 *
 * TODO: Enable allowChat: true for multi-turn refinement ("make it more
 * concise", "add a variable for X"). This requires handling incremental
 * patches to the extracted JSON — tracked as the next milestone.
 */
export const AGENT_GENERATOR_CONFIG = {
  agentId: "62895ef4-1f3a-499d-9af3-148944462769",

  launchDefaults: {
    displayMode: "direct" as ResultDisplayMode,
    apiEndpointMode: "manual" as ApiEndpointMode,
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
