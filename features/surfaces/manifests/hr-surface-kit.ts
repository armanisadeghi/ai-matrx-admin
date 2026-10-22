/**
 * Shared pieces for the HR page surfaces (W2 area hr-a): one value helper so every HR
 * manifest declares a value the same way. Not a manifest; nothing here is registered.
 */

import type { SurfaceValue } from "@ai-matrx/chat/surfaces/types";

/** One HR page value. Defaults: not always available, auto context on, size by type. */
export function hrValue(
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue {
  return {
    name,
    label,
    description,
    valueType,
    alwaysAvailable: false,
    typicalCharCount:
      valueType === "number" ? 4 : valueType === "boolean" ? 5 : valueType === "array" ? 600 : 40,
    group,
    sortOrder,
    ...extra,
  };
}

/** "loading" | "loaded" | "failed" | "no_access" — every HR page says which. */
export type HrLoadStatus = "loading" | "loaded" | "failed" | "no_access";

export function hrLoadStatus(input: {
  loading: boolean;
  denied?: boolean;
  failed?: boolean;
}): HrLoadStatus {
  if (input.denied) return "no_access";
  if (input.failed) return "failed";
  return input.loading ? "loading" : "loaded";
}

/** Drops null/undefined/"" keys so the agent never reads an empty field as a fact. */
export function compact<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined || value === "") continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}
