/**
 * The ONE builder for the Print tool surfaces (`/print/<tool>`).
 *
 * Every Print tool is the same shape: a form the person fills (the values an
 * agent reads AND may set), a preview of what that form makes (read-only
 * values), and a print/download button that stays the person's. So each tool
 * declares its form fields once (`PrintField[]`) and this builder turns them
 * into the surface's values and write targets:
 *
 *   - every free-text field gets its own `patchable` string target (same name
 *     as its value), so an agent can fix a word without resending the field;
 *   - every other control (numbers, switches, pickers, colors) is set together
 *     through ONE object target (`formTarget`).
 *
 * Nothing here prints, downloads, orders or saves. Writes only change the
 * on-screen form (mode `ui`); the person still presses Print.
 *
 * Runtime half: `./print-tool-writes.ts` (parses and applies the same fields).
 */

import type {
  SurfaceManifest,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export type PrintFieldKind = "text" | "number" | "boolean" | "choice" | "color";

export interface PrintField {
  /** lower_snake_case; the value name, and for text fields the target name too. */
  name: string;
  label: string;
  description: string;
  kind: PrintFieldKind;
  /** Fixed choices. Leave unset when the page supplies them at run time (say where in `description`). */
  options?: readonly string[];
  min?: number;
  max?: number;
  typicalCharCount?: number;
}

export const PRINT_FORM_GROUP = "print_form";
export const PRINT_RESULT_GROUP = "print_result";

/** Free text is inlined whole up to this many characters. */
const TEXT_INLINE_UP_TO = 1000;

function valueTypeOf(kind: PrintFieldKind): SurfaceValue["valueType"] {
  if (kind === "number") return "number";
  if (kind === "boolean") return "boolean";
  return "string";
}

function shapeOf(field: PrintField): string {
  switch (field.kind) {
    case "number": {
      const range =
        field.min !== undefined && field.max !== undefined
          ? ` ${field.min}-${field.max}`
          : field.min !== undefined
            ? ` >= ${field.min}`
            : "";
      return `number${range}`;
    }
    case "boolean":
      return "true | false";
    case "color":
      return 'hex color "#rrggbb"';
    case "choice":
      return field.options?.length
        ? field.options.map((o) => JSON.stringify(o)).join(" | ")
        : "one of the ids the page lists (see its description)";
    default:
      return "string";
  }
}

/** A read-only value the page shows (preview, counts, status). */
export function printShown(
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue {
  return {
    name,
    label,
    description,
    valueType,
    alwaysAvailable: true,
    typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
    group: PRINT_RESULT_GROUP,
    sortOrder: 200,
    ...extra,
  };
}

export interface PrintToolSpec {
  surfaceName: string;
  label: string;
  urlPattern: string;
  description: string;
  situation: string;
  /** What the form is called on screen ("Booklet settings"). */
  formLabel: string;
  fields: readonly PrintField[];
  /** The one object target for the non-text controls. Required when any exist. */
  formTarget?: { name: string; label: string };
  shown: readonly SurfaceValue[];
  /** Page-specific targets beyond the form (e.g. a list of rows). */
  extraTargets?: readonly SurfaceWriteTarget[];
}

export function printFieldValues(fields: readonly PrintField[]): SurfaceValue[] {
  return fields.map((field, index) => ({
    name: field.name,
    label: field.label,
    description: field.description,
    valueType: valueTypeOf(field.kind),
    alwaysAvailable: true,
    typicalCharCount: field.typicalCharCount ?? (field.kind === "text" ? 60 : 8),
    group: PRINT_FORM_GROUP,
    sortOrder: 100 + index,
    ...(field.kind === "text" ? { inlineUpTo: TEXT_INLINE_UP_TO } : {}),
  }));
}

export function printFieldTargets(
  fields: readonly PrintField[],
  formTarget: PrintToolSpec["formTarget"],
): SurfaceWriteTarget[] {
  const text = fields.filter((f) => f.kind === "text");
  const controls = fields.filter((f) => f.kind !== "text");
  const targets: SurfaceWriteTarget[] = text.map((field, index) => ({
    name: field.name,
    label: field.label,
    description: `Replaces the "${field.label}" field on the page. Value: a plain string (an empty string clears it). Only the on-screen form changes: nothing is printed or saved, the person presses Print.`,
    valueType: "string",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: field.name,
    mode: "ui",
    applyPolicy: "ask",
    group: PRINT_FORM_GROUP,
    sortOrder: 300 + index,
  }));
  if (controls.length) {
    if (!formTarget) {
      throw new Error("print-tool-surface: a tool with non-text controls must name its formTarget.");
    }
    targets.push({
      name: formTarget.name,
      label: formTarget.label,
      description: `Sets controls on the page's form. Value: a JSON object with ONLY the keys to change: ${controls
        .map((f) => `"${f.name}": ${shapeOf(f)} (${f.label})`)
        .join("; ")}. Refused (nothing changes): an unknown key, a wrong type, a value outside its range or choices. Only the on-screen form changes: nothing is printed or saved, the person presses Print.`,
      valueType: "object",
      mode: "ui",
      applyPolicy: "ask",
      group: PRINT_FORM_GROUP,
      sortOrder: 290,
    });
  }
  return targets;
}

/**
 * The manifest. `readiness: "partial"` only because the published alchemy still requires the
 * typed field; the W1-E strip removes it fleet-wide once D2 publishes.
 */
export function buildPrintToolManifest(spec: PrintToolSpec): SurfaceManifest {
  const groups: SurfaceValueGroup[] = [
    { key: PRINT_FORM_GROUP, label: spec.formLabel, sortOrder: 100, description: "What the person has set on the form." },
    { key: PRINT_RESULT_GROUP, label: "What it makes", sortOrder: 200, description: "The preview and its checks." },
  ];
  const declared: SurfaceManifest = {
    surfaceName: spec.surfaceName,
    situation: spec.situation,
    inheritsFrom: "matrx-default/publish",
    client: "matrx-user",
    executor: MATRX_WEB_APP_EXECUTOR,
    executionMode: "python-stream",
    label: spec.label,
    description: spec.description,
    urlPattern: spec.urlPattern,
    groups,
    values: mergeBaselineValues(pickBaseline("selection"), [...printFieldValues(spec.fields), ...spec.shown]),
    writeTargets: [...printFieldTargets(spec.fields, spec.formTarget), ...(spec.extraTargets ?? [])],
  };
  return declared;
}
