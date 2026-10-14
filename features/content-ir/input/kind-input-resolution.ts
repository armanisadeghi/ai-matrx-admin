/**
 * Pure input-path decision for the D1 input contract — the seam
 * `KindInputForm` routes on, extracted so the routing law is unit-testable
 * without mounting the form or mocking Supabase.
 *
 * THE LAW (mirrors the R6 output gate, input role):
 *
 *   resolveComponent(kind, platform, "input") …
 *     · null            → REFUSE loudly — the kind has no registered input
 *                         path (unknown kind, or a known kind deliberately
 *                         left non-interactive). Never render a guessed form.
 *     · isActive=false  → REFUSE loudly — a held binding is KNOWN-inactive,
 *                         not a license to fall back.
 *     · generic_structured →
 *         - schema with ≥1 field  → "bridged-form": kind fields →
 *           `kindFieldsToVariableDefinitions` (R5) → production
 *           `VariableInputComponent`s → `assembleKindInstance`.
 *         - no stored field list  → "instance-json": ONE whole-instance JSON
 *           textarea validated against `emitted_json_schema`. This is the
 *           documented v1 fallback for python-owned / non-object-root kinds
 *           (workflow I/O scalars store `data = null`), the same posture as
 *           the bridge's structured-JSON textarea for nested fields — honest,
 *           not hidden.
 *     · any other componentKey → REFUSE loudly — a dedicated editor was
 *       registered in the DB but this build has no routing for it. Screaming
 *       beats silently substituting the generic form for a binding that
 *       promised something better.
 *
 * HISTORY: a `dataOnly` signal used to ride through here (2026-07-15 through
 * 2026-08-27), first as a hard refusal, then — post-eviction of machine
 * contracts into `content_ir.io_contract` — as an informational "machine-
 * produced" note. It was sourced from the row's own `metadata.data_only`,
 * the manual per-row flag eradicated 2026-08-27 (Arman's ruling: "if it's
 * dead completely, let's drop it completely and forget it existed"). The
 * instance-JSON fallback below never actually needed that signal — it rests
 * on `hasEmittedSchema` alone, which is what it always needed.
 */

import type { ComponentResolution } from "../registry/component-registry";
import { KIND_KEY } from "@ai-matrx/content-ir";
import type { FieldSchema, KindSchema } from "@ai-matrx/content-ir";

/**
 * MUST equal `GENERIC_STRUCTURED_COMPONENT_KEY` (react/kind-route.ts) — the
 * literal is duplicated to keep this pure module out of the react layer;
 * equality is pinned by `__tests__/kind-input-form.test.ts`.
 */
export const GENERIC_INPUT_COMPONENT_KEY = "generic_structured";

export type KindInputPath =
  | { mode: "bridged-form" }
  | { mode: "instance-json" }
  | { mode: "refused"; reason: string };

export function decideKindInputPath(
  kind: string,
  resolution: ComponentResolution | null,
  schema: KindSchema | null,
  hasEmittedSchema = false,
): KindInputPath {
  const hasFields = schema !== null && Object.keys(schema.fields).length > 0;
  if (resolution === null) {
    // A REGISTERED SHAPE WITH A CONTRACT IS NEVER A DEAD END, and a shape
    // with a field list always gets its fields as a form: a missing
    // input-component row is a registry detail, never a reason to hand a
    // person a raw-JSON box (SHAPES-BUGS 2.4/3.3 — brand_basics has 3 fields
    // and was shown "stores no field list"). With no fields, the
    // instance-JSON editor still edits anything that has an
    // `emitted_json_schema`. The refusal is reserved for a row with nothing
    // to edit at all, which is a genuine registry gap worth screaming about.
    if (hasFields) return { mode: "bridged-form" };
    if (hasEmittedSchema) {
      return { mode: "instance-json" };
    }
    return {
      mode: "refused",
      reason: `No input component is registered for kind "${kind}" (resolver returned null for role "input") and the row carries no emitted_json_schema to edit against — a registry gap: add the kind_component row, never a guessed form.`,
    };
  }
  if (!resolution.isActive) {
    return {
      mode: "refused",
      reason: `The input component binding for kind "${kind}" ("${resolution.componentKey}") is registered but inactive — held out of production by its kind_component row.`,
    };
  }
  if (resolution.componentKey !== GENERIC_INPUT_COMPONENT_KEY) {
    return {
      mode: "refused",
      reason: `Kind "${kind}" resolves input component "${resolution.componentKey}", which this build has no routing for — KindInputForm routes only "${GENERIC_INPUT_COMPONENT_KEY}" today. Route the dedicated editor before registering it.`,
    };
  }
  return hasFields ? { mode: "bridged-form" } : { mode: "instance-json" };
}

/**
 * The field list a form renders for a kind: the stored `kind_definition.data`
 * fields when present, otherwise the top-level properties of an object-root
 * `emitted_json_schema` (python-owned kinds store no `data`, but their schema
 * still names every field). Null only when neither yields a field — a scalar
 * or array root, or an empty object — which is the one case that is honestly
 * "enter the whole value".
 *
 * The derivation is deliberately shallow and lossless toward validation: the
 * structural leg still runs over the full `emitted_json_schema`, so a nested
 * property that maps to a `json` field is validated exactly as before.
 */
export function inputSchemaForKind(
  kind: string,
  stored: KindSchema | null,
  emittedJsonSchema: unknown,
): KindSchema | null {
  if (stored !== null && Object.keys(stored.fields).length > 0) return stored;
  const derived = fieldsFromEmittedJsonSchema(emittedJsonSchema);
  return derived === null ? stored : { kind, fields: derived };
}

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** `type` as a list, `null` split off as nullability. */
function readTypes(node: JsonObject): { types: string[]; nullable: boolean } {
  const raw = node.type;
  const list =
    typeof raw === "string"
      ? [raw]
      : Array.isArray(raw)
        ? raw.filter((t): t is string => typeof t === "string")
        : [];
  return {
    types: list.filter((t) => t !== "null"),
    nullable: list.includes("null"),
  };
}

function stringEnum(node: JsonObject): string[] | null {
  const values = node.enum;
  if (!Array.isArray(values) || values.length === 0) return null;
  const strings = values.filter((v): v is string => typeof v === "string");
  return strings.length === values.length ? strings : null;
}

function fieldFromProperty(node: unknown, required: boolean): FieldSchema {
  const base = {
    required,
    ...(isJsonObject(node) && typeof node.description === "string"
      ? { description: node.description }
      : {}),
  };
  if (!isJsonObject(node)) return { ...base, type: "json" };
  const { types, nullable } = readTypes(node);
  const withNull = nullable ? { nullable: true } : {};
  const values = stringEnum(node);
  if (values) return { ...base, ...withNull, type: "enum", values };
  if (types.length !== 1) return { ...base, ...withNull, type: "json" };
  switch (types[0]) {
    case "string":
      return { ...base, ...withNull, type: "string" };
    case "number":
    case "integer":
      return { ...base, ...withNull, type: "number" };
    case "boolean":
      return { ...base, ...withNull, type: "boolean" };
    case "array": {
      const items = isJsonObject(node.items) ? node.items : null;
      const itemTypes = items ? readTypes(items).types : [];
      if (itemTypes.length === 1 && itemTypes[0] === "string")
        return { ...base, ...withNull, type: "string[]" };
      if (itemTypes.length === 1 && (itemTypes[0] === "number" || itemTypes[0] === "integer"))
        return { ...base, ...withNull, type: "number[]" };
      if (itemTypes.length === 1 && itemTypes[0] === "boolean")
        return { ...base, ...withNull, type: "boolean[]" };
      return { ...base, ...withNull, type: "json[]" };
    }
    default:
      return { ...base, ...withNull, type: "json" };
  }
}

/**
 * Top-level fields of an object-root JSON Schema. `__kind` is the carried
 * discriminator (stamped by `assembleKindInstance`), never a form field.
 */
export function fieldsFromEmittedJsonSchema(
  emitted: unknown,
): Record<string, FieldSchema> | null {
  if (!isJsonObject(emitted)) return null;
  const { types } = readTypes(emitted);
  if (types.length > 0 && !(types.length === 1 && types[0] === "object")) return null;
  if (!isJsonObject(emitted.properties)) return null;
  const required = new Set(
    Array.isArray(emitted.required)
      ? emitted.required.filter((r): r is string => typeof r === "string")
      : [],
  );
  const fields: Record<string, FieldSchema> = {};
  for (const [name, node] of Object.entries(emitted.properties)) {
    if (name === KIND_KEY) continue;
    fields[name] = fieldFromProperty(node, required.has(name));
  }
  return Object.keys(fields).length > 0 ? fields : null;
}
