/**
 * Shared builders for the HR page surfaces (surface declarations W2, area hr-b): one value
 * builder, one write-target builder and one manifest shell, so each HR page manifest states only
 * what is true of its page. The HR module (`matrx-default/human-resources`) values — employer,
 * persona, scope — are inherited and supplied by `HrProvider`; no page redeclares them.
 */

import type {
  SurfaceManifest,
  SurfaceValue,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const HR_MODULE_PARENT = "matrx-default/human-resources";

/** One page value. `alwaysAvailable` defaults false; set it only for what the page always has once loaded. */
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
    typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 60,
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
