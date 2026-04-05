import type { Json } from "@/types/database.types";

/** Normalize JSONB array columns (e.g. workflow_relay.target_broker_ids) to string[]. */
export function stringArrayFromJson(value: Json | null | undefined): string[] {
  if (value == null || !Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Safe spread source for `metadata` and similar Json object columns. */
export function recordFromJson(
  value: Json | null | undefined,
): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value))
    return {};
  return value as Record<string, unknown>;
}
