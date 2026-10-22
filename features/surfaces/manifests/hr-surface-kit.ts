/**
 * The ONE shared helper for the HR page surfaces (surface declarations W2; hr-a and hr-b merged in
 * W2-B, 2026-10-22): a value builder, a write-target builder, the manifest shell, and the small
 * runtime helpers their scope builders share. Not a manifest; nothing here is registered.
 *
 * The HR module (`matrx-default/human-resources`) values — employer, persona, scope — are
 * inherited and supplied by `HrProvider`; no page redeclares them.
 */

import type {
  SurfaceManifest,
  SurfaceValue,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const HR_MODULE_PARENT = "matrx-default/human-resources";

/** Default `typicalCharCount` by value type when a value does not state its own. */
export function hrTypicalCharCount(valueType: SurfaceValue["valueType"]): number {
  if (valueType === "number") return 4;
  if (valueType === "boolean") return 5;
  if (valueType === "array") return 600;
  return 40;
}

/**
 * One HR page value. Defaults: not always available, sized by type (`hrTypicalCharCount`). Set
 * `alwaysAvailable` only for what the page always has once loaded.
 */
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
    typicalCharCount: hrTypicalCharCount(valueType),
    group,
    sortOrder,
    ...extra,
  };
}

/** One write target; every one asks the person first. */
export function hrTarget(
  name: string,
  label: string,
  target: Pick<SurfaceWriteTarget, "valueType" | "mode" | "updatesValue" | "group" | "sortOrder"> &
    Partial<SurfaceWriteTarget>,
  description: string,
): SurfaceWriteTarget {
  return { name, label, description, applyPolicy: "ask", ...target };
}

/** The manifest shell every HR page surface shares (client, executor, parent). */
export function hrPageSurface(
  manifest: Omit<SurfaceManifest, "client" | "executor" | "executionMode" | "inheritsFrom" | "readiness"> & {
    inheritsFrom?: string;
    readinessNote: string;
  },
): SurfaceManifest {
  return {
    client: "matrx-user",
    executor: MATRX_WEB_APP_EXECUTOR,
    executionMode: "python-stream",
    inheritsFrom: HR_MODULE_PARENT,
    // `readiness` is still a required field on the published `SurfaceManifest` type (D2 makes it
    // derived; until that cross-package change lands the type demands a value).
    readiness: "partial",
    ...manifest,
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
