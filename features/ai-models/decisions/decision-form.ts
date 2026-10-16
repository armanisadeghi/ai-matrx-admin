export type DecisionValue = unknown;

export interface DecisionRunInput {
  model: string;
  offeringId?: string;
  state: DecisionValue;
  questions: Record<string, Record<string, unknown>>;
}

/**
 * What a person picks. Two of them are the server's `choice` type: "Yes or no"
 * is a choice whose two options are fixed; "Pick one" is a choice whose options
 * the person names. "How true" is the server's `noul` type (a 0–1 degree of truth).
 */
export type QuestionKind = "yes_no" | "pick_one" | "score" | "how_true";

interface QuestionBase {
  id: string;
  /** The answer's key in the result — what a workflow reads. Lives under Advanced. */
  name: string;
  kind: QuestionKind;
  instructions: string;
  /** Advanced: the options written as JSON instead of rows. */
  criteriaMode: "rows" | "json";
  criteriaJson: string;
}

export type DecisionQuestion =
  | (QuestionBase & { type: "choice"; criteria: Array<{ key: string; description: string }> })
  | (QuestionBase & { type: "score"; criteria: string[] })
  | (QuestionBase & { type: "noul"; criteria: { true: string; false: string } });

const DEFAULT_NAMES: Record<QuestionKind, string> = {
  yes_no: "decision",
  pick_one: "choice",
  score: "score",
  how_true: "truth",
};

export const YES_NO_KEYS = ["yes", "no"] as const;

function uniqueName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/**
 * A new question of `kind`. Its answer name never repeats one in `existing`
 * (a second question used to reuse "decision" and lock Run). `carry` keeps
 * what was typed when a question changes kind.
 */
export function newQuestion(
  kind: QuestionKind,
  existing: readonly DecisionQuestion[] = [],
  carry?: { id: string; instructions: string },
): DecisionQuestion {
  const taken = new Set(existing.map((question) => question.name.trim()));
  const base = {
    id: carry?.id ?? crypto.randomUUID(),
    name: uniqueName(DEFAULT_NAMES[kind], taken),
    kind,
    instructions: carry?.instructions ?? "",
    criteriaMode: "rows" as const,
    criteriaJson: "",
  };
  if (kind === "score") return { ...base, type: "score", criteria: ["", ""] };
  if (kind === "how_true") return { ...base, type: "noul", criteria: { true: "", false: "" } };
  if (kind === "yes_no")
    return { ...base, type: "choice", criteria: YES_NO_KEYS.map((key) => ({ key, description: "" })) };
  return {
    ...base,
    type: "choice",
    criteria: [
      { key: "", description: "" },
      { key: "", description: "" },
    ],
  };
}

/** Change a question's kind, keeping what was typed into it. */
export function changeKind(
  question: DecisionQuestion,
  kind: QuestionKind,
  others: readonly DecisionQuestion[],
): DecisionQuestion {
  return newQuestion(kind, others, { id: question.id, instructions: question.instructions });
}

/**
 * Text the person typed, as the value to send: JSON when it IS JSON (an object
 * or array), otherwise the text itself. There is no Text/JSON switch.
 */
export function readTypedValue(source: string): DecisionValue {
  const trimmed = source.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return source;
  try {
    const value: unknown = JSON.parse(trimmed);
    return value !== null && typeof value === "object" ? value : source;
  } catch {
    return source;
  }
}

export function looksLikeJson(source: string): boolean {
  return readTypedValue(source) !== source;
}

function parseCriteriaJson(source: string): { value?: unknown; error?: boolean } {
  try {
    return { value: JSON.parse(source) };
  } catch {
    return { error: true };
  }
}

export function questionErrors(questions: DecisionQuestion[]): string[] {
  const errors: string[] = [];
  if (questions.length === 0) errors.push("Add a question.");
  const names = new Set<string>();
  questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    if (!question.instructions.trim()) errors.push(`${label}: write what you want to know.`);
    const name = question.name.trim();
    if (!name) errors.push(`${label}: give it an answer name (Advanced).`);
    else if (names.has(name)) errors.push(`${label}: its answer name “${name}” is already used (Advanced).`);
    else names.add(name);

    if (question.criteriaMode === "json") {
      const parsed = parseCriteriaJson(question.criteriaJson);
      if (parsed.error) {
        errors.push(`${label}: the options JSON is not valid.`);
        return;
      }
      const value = parsed.value;
      if (question.type === "score") {
        if (!Array.isArray(value) || value.length < 2)
          errors.push(`${label}: the levels JSON needs a list of at least two levels.`);
      } else if (value === null || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`${label}: the options JSON must be an object.`);
      } else {
        const keys = Object.keys(value);
        if (question.type === "choice" && (keys.length < 2 || keys.some((key) => !key.trim())))
          errors.push(`${label}: the options JSON needs at least two named options.`);
        if (question.type === "noul" && (keys.length !== 2 || !keys.includes("true") || !keys.includes("false")))
          errors.push(`${label}: the JSON must have exactly “true” and “false”.`);
      }
      return;
    }

    if (question.type === "choice") {
      const keys = question.criteria.map((criterion) => criterion.key.trim());
      if (keys.some((key) => !key)) errors.push(`${label}: give every option a name.`);
      const filled = keys.filter(Boolean);
      if (new Set(filled).size !== filled.length) errors.push(`${label}: two options have the same name.`);
      if (question.criteria.length < 2) errors.push(`${label}: add at least two options.`);
    }
    if (question.type === "score") {
      const levels = new Set(question.criteria.map((level) => level.trim()).filter(Boolean));
      if (levels.size < 2) errors.push(`${label}: name at least two different levels.`);
    }
  });
  return errors;
}

function rowsCriteria(question: DecisionQuestion): unknown {
  if (question.type === "choice")
    return Object.fromEntries(
      question.criteria.map((criterion) => [criterion.key.trim(), criterion.description.trim() || null]),
    );
  if (question.type === "noul")
    return {
      true: question.criteria.true.trim() || null,
      false: question.criteria.false.trim() || null,
    };
  // A blank level from "Add level" is dropped, never sent as "".
  return question.criteria.map((level) => level.trim()).filter(Boolean);
}

export function decisionQuestionPayload(question: DecisionQuestion): Record<string, unknown> | null {
  const instructions = readTypedValue(question.instructions);
  if (question.criteriaMode === "json") {
    const parsed = parseCriteriaJson(question.criteriaJson);
    return parsed.error ? null : { type: question.type, instructions, criteria: parsed.value };
  }
  return { type: question.type, instructions, criteria: rowsCriteria(question) };
}

/** The rows as JSON, so opening the JSON editor shows what was typed. */
export function criteriaRowsAsJson(question: DecisionQuestion): string {
  return JSON.stringify(rowsCriteria(question), null, 2);
}
