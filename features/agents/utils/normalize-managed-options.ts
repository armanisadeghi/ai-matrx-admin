/**
 * Normalize ManagedAgentOptions — collapse the legacy flat-field form and
 * the new nested `config` / `runtime` form into a single canonical shape
 * that the execution pipeline consumes.
 *
 * Precedence (lower → higher):
 *   1. Deprecated flat fields on the options envelope
 *   2. Nested `config` and `runtime`
 *
 * Rationale: a caller using the new shape always wins over a caller that
 * happens to have both. In practice only legacy callers pass flat fields.
 */

import type { ManagedAgentOptions } from "../types/instance.types";
import {
  resolveExecutionConfig,
  type AgentExecutionConfig,
  type AgentExecutionRuntime,
} from "../types/agent-execution-config.types";

export interface NormalizedManagedOptions {
  identity: {
    surfaceKey: string;
    sourceFeature: ManagedAgentOptions["sourceFeature"];
    agentId?: string;
    shortcutId?: string;
    manual?: ManagedAgentOptions["manual"];
  };
  /** Fully-resolved config (all defaults filled in). */
  config: AgentExecutionConfig;
  /** Runtime payload (all fields optional). */
  runtime: AgentExecutionRuntime;
  flags: {
    ready?: boolean;
    isEphemeral?: boolean;
    apiEndpointMode?: ManagedAgentOptions["apiEndpointMode"];
    jsonExtraction?: ManagedAgentOptions["jsonExtraction"];
    showAutoClearToggle?: boolean;
    autoClearConversation?: boolean;
  };
}

/**
 * Build a Partial<AgentExecutionConfig> from legacy flat fields on
 * ManagedAgentOptions. Keys that aren't set are omitted.
 */
function legacyFlatToConfig(
  opts: ManagedAgentOptions,
): Partial<AgentExecutionConfig> {
  const out: Partial<AgentExecutionConfig> = {};
  if (opts.displayMode !== undefined) out.displayMode = opts.displayMode;
  if (opts.showVariablePanel !== undefined)
    out.showVariablePanel = opts.showVariablePanel;
  if (opts.variablesPanelStyle !== undefined)
    out.variablesPanelStyle = opts.variablesPanelStyle;
  if (opts.autoRun !== undefined) out.autoRun = opts.autoRun;
  if (opts.allowChat !== undefined) out.allowChat = opts.allowChat;
  if (opts.showDefinitionMessages !== undefined)
    out.showDefinitionMessages = opts.showDefinitionMessages;
  if (opts.showDefinitionMessageContent !== undefined)
    out.showDefinitionMessageContent = opts.showDefinitionMessageContent;
  if (opts.showPreExecutionGate !== undefined)
    out.showPreExecutionGate = opts.showPreExecutionGate;
  if (opts.preExecutionMessage !== undefined)
    out.preExecutionMessage = opts.preExecutionMessage;
  if (opts.bypassGateSeconds !== undefined)
    out.bypassGateSeconds = opts.bypassGateSeconds;
  if (opts.hideReasoning !== undefined) out.hideReasoning = opts.hideReasoning;
  if (opts.hideToolResults !== undefined)
    out.hideToolResults = opts.hideToolResults;
  if (opts.variables !== undefined) out.defaultVariables = opts.variables;
  if (opts.overrides !== undefined) out.llmOverrides = opts.overrides;
  return out;
}

function legacyFlatToRuntime(
  opts: ManagedAgentOptions,
): AgentExecutionRuntime {
  const out: AgentExecutionRuntime = {};
  if (opts.userInput !== undefined) out.userInput = opts.userInput;
  if (opts.applicationScope !== undefined)
    out.applicationScope = opts.applicationScope;
  if (opts.widgetHandleId !== undefined)
    out.widgetHandleId = opts.widgetHandleId;
  if (opts.originalText !== undefined) out.originalText = opts.originalText;
  return out;
}

export function normalizeManagedOptions(
  opts: ManagedAgentOptions,
): NormalizedManagedOptions {
  const flatConfig = legacyFlatToConfig(opts);
  const config = resolveExecutionConfig(flatConfig, opts.config ?? null);

  const flatRuntime = legacyFlatToRuntime(opts);
  const runtime: AgentExecutionRuntime = { ...flatRuntime, ...(opts.runtime ?? {}) };

  return {
    identity: {
      surfaceKey: opts.surfaceKey,
      sourceFeature: opts.sourceFeature,
      agentId: opts.agentId,
      shortcutId: opts.shortcutId,
      manual: opts.manual,
    },
    config,
    runtime,
    flags: {
      ready: opts.ready,
      isEphemeral: opts.isEphemeral,
      apiEndpointMode: opts.apiEndpointMode,
      jsonExtraction: opts.jsonExtraction,
      showAutoClearToggle: opts.showAutoClearToggle,
      autoClearConversation: opts.autoClearConversation,
    },
  };
}
