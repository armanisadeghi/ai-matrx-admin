/**
 * What a blur on a variable's Name field does.
 *
 * A variable has two names: its KEY (`{{vocabulary}}`, what messages use) and
 * its LABEL ("Store vocabulary", what people see). For a variable made in this
 * editor the key is derived from the label, so typing a new name renames both.
 * An agent authored elsewhere (the agent author tool, a direct write) may carry
 * a label whose key is NOT derived from it. The editor used to assume it was:
 * it previewed `{{store_vocabulary}}` for a variable whose key is `vocabulary`,
 * and a plain focus-and-blur renamed the key, cutting it off from every message.
 *
 * Rule: the key follows the label only while it already does. Otherwise a name
 * edit changes the label alone, and the editor shows the real key.
 */
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { sanitizeVariableName } from "@ai-matrx/chat/agents/utils/variable-utils";
import { findVariableTokens } from "@ai-matrx/content-ir/source";

/** The text the Name field shows for a variable. */
export function shownVariableName(key: string, label: string | undefined): string {
  return label?.trim() || humanizeIdentifier(key) || key;
}

/** True when the key is what the shown name would produce — edits rename both. */
export function keyFollowsLabel(key: string, label: string | undefined): boolean {
  return sanitizeVariableName(shownVariableName(key, label)) === key;
}

/** The label to store for `typed` under `key`; none when the key already says it. */
function labelFor(typed: string, key: string): string | undefined {
  return typed !== key && typed !== humanizeIdentifier(key) ? typed : undefined;
}

export type VariableNameEdit =
  | { kind: "reset" } // empty field: restore the shown name
  | { kind: "none" } // nothing changed
  | { kind: "label"; label: string | undefined } // key stays
  | { kind: "rename"; name: string; label: string | undefined }
  | { kind: "duplicate" }; // the new key is taken: keep the draft

export function resolveVariableNameEdit(input: {
  typed: string;
  key: string;
  label: string | undefined;
  existingNames: readonly string[];
}): VariableNameEdit {
  const { key, label, existingNames } = input;
  const typed = input.typed.trim();
  const currentLabel = label?.trim() || undefined;
  if (!typed || !sanitizeVariableName(typed)) return { kind: "reset" };
  if (typed === shownVariableName(key, label)) return { kind: "none" };

  if (!keyFollowsLabel(key, label)) {
    const next = labelFor(typed, key);
    return next === currentLabel ? { kind: "none" } : { kind: "label", label: next };
  }

  const sanitized = sanitizeVariableName(typed);
  const next = labelFor(typed, sanitized);
  if (sanitized === key) {
    return next === currentLabel ? { kind: "none" } : { kind: "label", label: next };
  }
  if (existingNames.includes(sanitized)) return { kind: "duplicate" };
  return { kind: "rename", name: sanitized, label: next };
}

/**
 * `text` with every reference to `from` pointed at `to`: `{{from}}`,
 * `{{ from }}` and the section markers `{{#from}}` `{{^from}}` `{{/from}}`.
 * Uses the ONE token finder, so `{{!from}}` (an author's example) and a
 * longer name that merely starts with `from` are left alone.
 */
export function renameVariableInText(
  text: string,
  from: string,
  to: string,
): { text: string; count: number } {
  let out = "";
  let at = 0;
  let count = 0;
  for (const token of findVariableTokens(text)) {
    if (token.name !== from) continue;
    out += text.slice(at, token.start) + token.raw.replace(from, to);
    at = token.end;
    count++;
  }
  return count ? { text: out + text.slice(at), count } : { text, count: 0 };
}

function renameInValue(value: unknown, from: string, to: string): { value: unknown; count: number } {
  if (typeof value === "string") {
    const r = renameVariableInText(value, from, to);
    return { value: r.text, count: r.count };
  }
  if (Array.isArray(value)) {
    let count = 0;
    const next = value.map((item) => {
      const r = renameInValue(item, from, to);
      count += r.count;
      return r.value;
    });
    return count ? { value: next, count } : { value, count: 0 };
  }
  if (value && typeof value === "object") {
    let count = 0;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "type" || key === "role") {
        next[key] = item;
        continue;
      }
      const r = renameInValue(item, from, to);
      count += r.count;
      next[key] = r.value;
    }
    return count ? { value: next, count } : { value, count: 0 };
  }
  return { value, count: 0 };
}

/**
 * Every message — the system prompt is the `role: "system"` one — with each
 * reference to variable `from` renamed to `to`, in every string the message
 * holds (text blocks and any other block field), and how many were changed.
 */
export function renameVariableInMessages<M>(
  messages: readonly M[],
  from: string,
  to: string,
): { messages: M[]; count: number } {
  const r = renameInValue(messages, from, to);
  return { messages: r.value as M[], count: r.count };
}
