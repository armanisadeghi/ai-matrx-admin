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
