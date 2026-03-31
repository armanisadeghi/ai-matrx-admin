/**
 * Agent Execution — Type Definitions
 *
 * Simpler than promptExecution because Python handles all DB persistence.
 * The frontend only tracks: instance identity, messages, streaming state,
 * variable values, and UI controls.
 */

import type { VariableDefinition } from "@/features/agents/redux/agent-definition/types";
import type { ContextSlot } from "@/features/agents/types/agent-api-types";

export type AgentExecutionStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "executing"
  | "streaming"
  | "completed"
  | "error";

export interface AgentRunMessage {
  role: "system" | "user" | "assistant";
  content: string;
  taskId?: string;
  timestamp: string;
  metadata?: {
    fromTemplate?: boolean;
    timeToFirstToken?: number;
    totalTime?: number;
    tokens?: number;
    cost?: number;
    [key: string]: unknown;
  };
}

export interface AgentExecutionInstance {
  // Identity
  runId: string;
  agentId: string; // resolvedId from the execution payload
  isVersion: boolean; // true = agentId points to agent_versions table
  agentName: string;

  // Status
  status: AgentExecutionStatus;
  error: string | null;

  // Timestamps
  createdAt: number;
  updatedAt: number;

  // Messages (conversation history)
  messages: AgentRunMessage[];

  // Template replacement flag — true until first message is sent
  requiresVariableReplacement: boolean;

  // Streaming tracking
  currentTaskId: string | null;
  streamEnded: boolean;

  // Variable handling
  variableDefaults: VariableDefinition[];
  variableValues: Record<string, string>;

  // Context slots (for context injection)
  contextSlots: ContextSlot[];

  // UI state
  showVariables: boolean;
  expandedVariable: string | null;
}

export interface AgentExecutionState {
  // Core instances — keyed by runId
  instances: Record<string, AgentExecutionInstance>;

  // Isolated input state — separate map to prevent re-renders on keystroke
  currentInputs: Record<string, string>;
}

// ── Thunk Payloads ────────────────────────────────────────────────────────────

export interface CreateAgentInstancePayload {
  runId: string;
  agentId: string;
  isVersion: boolean;
  agentName?: string;
  variableDefaults?: VariableDefinition[];
  contextSlots?: ContextSlot[];
  initialVariableValues?: Record<string, string>;
}

export interface ExecuteAgentMessagePayload {
  runId: string;
  userInput?: string;
}
