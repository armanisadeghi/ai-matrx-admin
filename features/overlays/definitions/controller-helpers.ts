import type { MessageRole } from "@/features/message-templates/types/message-templates-db";

export function isMessageRole(value: unknown): value is MessageRole {
  return (
    value === "system" ||
    value === "user" ||
    value === "assistant" ||
    value === "tool"
  );
}

export function parseStepLabels(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null) return null;
  const labels: Record<string, string> = {};
  for (const [nodeId, label] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof label === "string" && label) labels[nodeId] = label;
  }
  return Object.keys(labels).length > 0 ? labels : null;
}
