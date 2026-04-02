import type { PromptVariable } from "@/lib/types/agent-chat";

/**
 * Minimal agent shape used by the SSR welcome screen and agent resolver.
 */
export interface WelcomeAgent {
  promptId: string;
  name: string;
  description?: string;
  variableDefaults?: PromptVariable[];
}

/**
 * Agent option used in the hardcoded DEFAULT_AGENTS list and the agent picker.
 */
export interface AgentOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  promptId: string;
  variableDefaults?: PromptVariable[];
}

// Re-export Redux-global agent types so cx-chat code has one import source
// AgentRecord / AgentSource kept for any legacy consumers; agentCacheSlice is being phased out
export type {
  AgentRecord,
  AgentSource,
} from "@/lib/redux/slices/agentCacheSlice";

export interface AgentConfig {
  promptId: string;
  name: string;
  description?: string;
  variableDefaults?: PromptVariable[];
}
