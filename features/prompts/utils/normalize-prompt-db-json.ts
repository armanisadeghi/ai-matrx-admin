import type { Json } from "@/types/database.types";
import type {
  PromptMessage,
  PromptSettings,
  PromptVariable,
} from "../types/core";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow DB `messages` JSON into chat messages the UI and cache layer expect. */
export function normalizePromptMessagesFromDb(
  value: Json | null | undefined,
): PromptMessage[] {
  if (!Array.isArray(value)) return [];
  const out: PromptMessage[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const role = item.role;
    const content = item.content;
    if (typeof role !== "string") continue;
    if (typeof content === "string") {
      const msg: PromptMessage = { role, content };
      if ("metadata" in item && item.metadata !== undefined) {
        msg.metadata = item.metadata as PromptMessage["metadata"];
      }
      out.push(msg);
    }
  }
  return out;
}

/** Narrow DB `variable_defaults` JSON for editors and cache. */
export function normalizePromptVariablesFromDb(
  value: Json | null | undefined,
): PromptVariable[] {
  if (!Array.isArray(value)) return [];
  const out: PromptVariable[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const name = item.name;
    const defaultValue = item.defaultValue ?? item.default_value;
    if (typeof name !== "string" || typeof defaultValue !== "string") continue;
    out.push({
      name,
      defaultValue,
      customComponent:
        item.customComponent as PromptVariable["customComponent"],
      required: typeof item.required === "boolean" ? item.required : undefined,
      helpText: typeof item.helpText === "string" ? item.helpText : undefined,
    });
  }
  return out;
}

/** Narrow DB `settings` JSON — object rows only; otherwise empty settings. */
export function normalizePromptSettingsFromDb(
  value: Json | null | undefined,
): PromptSettings {
  if (!isRecord(value)) return {};
  return value as PromptSettings;
}
