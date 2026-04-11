/**
 * Reusable agent config extractor.
 *
 * Converts raw JSON (from AI-generated responses) into the AgentBuilderConfig
 * shape expected by useAgentBuilder. Handles multiple key naming conventions
 * the LLM might use (e.g. "variableDefaults" vs "variables", nested messages
 * with role/content, etc.).
 *
 * Used by AgentGenerator, and will be reused by FullPromptOptimizer and any
 * future tool that produces agent config JSON.
 */

import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";
import type { AgentBuilderConfig } from "../services/agentBuilderService";

interface MessageEntry {
  role: string;
  content: string;
}

export function extractAgentConfig(raw: unknown): AgentBuilderConfig | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const description =
    typeof obj.description === "string" ? obj.description.trim() : undefined;

  const messages = extractMessages(obj);
  const systemMessage =
    messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n") || "You are a helpful AI assistant.";

  const userMessage =
    messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n") || undefined;

  const variableDefaults = extractVariables(obj);
  const settings = extractSettings(obj);

  if (!name && !systemMessage) return null;

  return {
    name: name || "Untitled Agent",
    description,
    systemMessage,
    userMessage,
    variableDefaults,
    settings,
  };
}

function extractMessages(obj: Record<string, unknown>): MessageEntry[] {
  const raw = obj.messages;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (m): m is Record<string, unknown> =>
        !!m && typeof m === "object" && "role" in m && "content" in m,
    )
    .map((m) => ({
      role: String(m.role),
      content: String(m.content),
    }));
}

/**
 * Extracts variable definitions from raw AI-generated JSON.
 *
 * Accepts several key-naming conventions the LLM might use and normalizes
 * them into proper VariableDefinition objects with all required keys present.
 */
function extractVariables(obj: Record<string, unknown>): VariableDefinition[] {
  const raw = obj.variableDefaults ?? obj.variables ?? obj.variable_defaults;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (v): v is Record<string, unknown> =>
        !!v && typeof v === "object" && "name" in v,
    )
    .map(
      (v): VariableDefinition => ({
        name: String(v.name),
        defaultValue: v.defaultValue ?? v.default_value ?? v.default ?? "",
        helpText:
          typeof v.helpText === "string"
            ? v.helpText
            : typeof v.help_text === "string"
              ? v.help_text
              : typeof v.description === "string"
                ? v.description
                : undefined,
        required: typeof v.required === "boolean" ? v.required : false,
      }),
    );
}

function extractSettings(
  obj: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const raw = obj.settings;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return raw as Record<string, unknown>;
}

/**
 * Extracts the suggested agent name from raw JSON.
 * Returns null if no name is found.
 */
export function extractAgentName(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return typeof obj.name === "string" && obj.name.trim()
    ? obj.name.trim()
    : null;
}
