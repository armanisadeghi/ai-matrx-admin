/**
 * Runtime half of `./print-tool-surface.ts`: the write handlers a Print tool
 * registers for the fields it declared.
 *
 * Every write only changes the on-screen form through the page's own setter
 * (`apply(patch)`); nothing here prints, downloads, orders or saves.
 *
 * Choices the page only knows at run time (a catalog, the package's label
 * stocks) are passed in `runtimeOptions`.
 */

import type { SurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import type { PrintSetting, PrintSettings } from "@ai-matrx/print/core";
import type { PrintField } from "./print-tool-surface";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export type PrintFormPatch = Record<string, string | number | boolean>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse an object write against the non-text controls. Throws a sentence the
 * agent can act on; returns only the keys sent.
 */
export function parsePrintFormPatch(
  fields: readonly PrintField[],
  value: unknown,
  runtimeOptions: Record<string, readonly string[]> = {},
): PrintFormPatch {
  if (!isPlainObject(value)) throw new Error("Send a JSON object with only the keys to change.");
  const controls = new Map(fields.filter((f) => f.kind !== "text").map((f) => [f.name, f]));
  const keys = Object.keys(value);
  if (!keys.length) throw new Error("The object is empty: name at least one control to change.");
  const patch: PrintFormPatch = {};
  for (const key of keys) {
    const field = controls.get(key);
    if (!field) {
      throw new Error(`"${key}" is not a control on this form. Known: ${[...controls.keys()].join(", ")}.`);
    }
    const raw = value[key];
    switch (field.kind) {
      case "number": {
        if (typeof raw !== "number" || !Number.isFinite(raw)) throw new Error(`"${key}" must be a number.`);
        if (field.min !== undefined && raw < field.min) throw new Error(`"${key}" must be at least ${field.min}.`);
        if (field.max !== undefined && raw > field.max) throw new Error(`"${key}" must be at most ${field.max}.`);
        patch[key] = raw;
        break;
      }
      case "boolean": {
        if (typeof raw !== "boolean") throw new Error(`"${key}" must be true or false.`);
        patch[key] = raw;
        break;
      }
      case "color": {
        if (typeof raw !== "string" || !HEX_COLOR.test(raw)) throw new Error(`"${key}" must be a hex color like "#1d4ed8".`);
        patch[key] = raw.toLowerCase();
        break;
      }
      case "choice": {
        const options = runtimeOptions[key] ?? field.options ?? [];
        if (typeof raw !== "string" || !options.includes(raw)) {
          throw new Error(`"${key}" must be one of: ${options.map((o) => JSON.stringify(o)).join(", ")}.`);
        }
        patch[key] = raw;
        break;
      }
      default:
        throw new Error(`"${key}" is a text field: write it through its own target.`);
    }
  }
  return patch;
}

function parseText(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`"${label}" takes a plain string.`);
  return value;
}

/**
 * Handlers for every field: one string handler per text field (same name as
 * the field) and one object handler (`formTargetName`) for the rest.
 * Callers annotate their registration with `// surface-write-handlers:` naming
 * the keys, because they are built from the field list.
 */
export function printToolWriteHandlers(
  fields: readonly PrintField[],
  formTargetName: string | null,
  apply: (patch: PrintFormPatch) => void,
  runtimeOptions: Record<string, readonly string[]> = {},
): SurfaceWriteHandlers {
  const handlers: SurfaceWriteHandlers = {};
  for (const field of fields.filter((f) => f.kind === "text")) {
    handlers[field.name] = {
      validate: (value: unknown) => {
        try {
          parseText(value, field.label);
        } catch (err) {
          refuseSurfaceWrite((err as Error).message);
        }
      },
      apply: (value: unknown) => {
        const text = parseText(value, field.label);
        apply({ [field.name]: text });
        return { summary: `${field.label} is now set on the form. Nothing was printed.`, data: { [field.name]: text } };
      },
    };
  }
  if (formTargetName && fields.some((f) => f.kind !== "text")) {
    handlers[formTargetName] = {
      validate: (value: unknown) => {
        try {
          parsePrintFormPatch(fields, value, runtimeOptions);
        } catch (err) {
          refuseSurfaceWrite((err as Error).message);
        }
      },
      apply: (value: unknown) => {
        const patch = parsePrintFormPatch(fields, value, runtimeOptions);
        apply(patch);
        return { summary: `Set on the form: ${Object.keys(patch).join(", ")}. Nothing was printed.`, data: patch };
      },
    };
  }
  return handlers;
}

/**
 * A package printer's declared settings (`BlockPrinter.settings`) as form
 * fields, so the same parser guards them. A range setting becomes its two
 * number keys.
 */
export function printSettingsAsFields(settings: readonly PrintSetting[]): PrintField[] {
  return settings.flatMap((setting): PrintField[] => {
    const description = setting.description ?? setting.label;
    switch (setting.type) {
      case "boolean":
        return [{ name: setting.id, label: setting.label, description, kind: "boolean" }];
      case "number":
        return [{ name: setting.id, label: setting.label, description, kind: "number", min: setting.min, max: setting.max }];
      case "select":
        return [{ name: setting.id, label: setting.label, description, kind: "choice", options: setting.options.map((o) => o.value) }];
      default:
        return [
          { name: setting.fromId, label: `${setting.label} from`, description, kind: "number", min: setting.min },
          { name: setting.toId, label: `${setting.label} to`, description, kind: "number", min: setting.min },
        ];
    }
  });
}

/** Every declared setting with its current value (defaults filled in), as the page shows it. */
export function printSettingsSnapshot(settings: readonly PrintSetting[], current: PrintSettings) {
  return printSettingsAsFields(settings).map((field) => {
    const setting = settings.find(
      (s) => s.id === field.name || (s.type === "range" && (s.fromId === field.name || s.toId === field.name)),
    );
    const fallback =
      setting?.type === "range"
        ? setting.fromId === field.name
          ? setting.defaultFrom
          : setting.defaultTo
        : setting?.defaultValue;
    return {
      key: field.name,
      label: field.label,
      type: field.kind,
      value: current[field.name] ?? fallback ?? null,
      ...(field.options ? { options: field.options } : {}),
      ...(field.min !== undefined ? { min: field.min } : {}),
      ...(field.max !== undefined ? { max: field.max } : {}),
    };
  });
}
