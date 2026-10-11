/**
 * Agent Studio — everything the page holds lives in its URL (the Studio stores nothing of its own;
 * DESIGN.md §1 rule 7), so a reload resumes: the mode, the factory build, the agent it kept, the
 * assistant's conversation, and (mode 2) whether the doer has been asked to make it an agent.
 */

import type { FactoryBuildState } from "@/features/agents/factory/types";

export interface StudioState {
  mode: string | null;
  buildId: string | null;
  agentId: string | null;
  /** The assistant's conversation (LEFT). */
  chatId: string | null;
  /** Opened from a System Builder plan step: the plan (a Note id) and the step number. */
  planId: string | null;
  planStep: string | null;
  /** Mode "Improve": the agent's run shown in the center (its latest real run, preloaded). */
  runId: string | null;
  /**
   * The assistant on the LEFT, when it is not the default chat agent (the `chat.default_new_chat`
   * mandate's holder). Any agent the person can run; the URL carries it so a reload keeps it.
   */
  assistantId: string | null;
}

const KEYS = {
  mode: "mode",
  buildId: "build",
  agentId: "agent",
  chatId: "chat",
  planId: "plan",
  planStep: "step",
  runId: "run",
  assistantId: "assistant",
} as const;

/** The job a System Builder step hands the Studio (`?job=`), prefilled into "Describe it". */
export function studioJobParam(params: URLSearchParams): string {
  return (params.get("job") ?? "").trim();
}

export function readStudioState(params: URLSearchParams): StudioState {
  const get = (k: string) => {
    const v = params.get(k);
    return v && v.trim() ? v : null;
  };
  return {
    mode: get(KEYS.mode),
    buildId: get(KEYS.buildId),
    agentId: get(KEYS.agentId),
    chatId: get(KEYS.chatId),
    planId: get(KEYS.planId),
    planStep: get(KEYS.planStep),
    runId: get(KEYS.runId),
    assistantId: get(KEYS.assistantId),
  };
}

export function studioHref(state: Partial<StudioState>): string {
  const params = new URLSearchParams();
  for (const [field, key] of Object.entries(KEYS) as [keyof StudioState, string][]) {
    const value = state[field];
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/agents/new/studio?${qs}` : "/agents/new/studio";
}

/**
 * A build name from the person's own words: the first few words, snake_case, never ending on a
 * joining word (the same rule the Generate door uses). The factory names the agent itself from its
 * goal step; this is only the build's handle.
 */
const JOINERS = new Set(["a", "an", "the", "and", "or", "for", "of", "to", "with", "in", "on", "that", "my"]);
export function buildNameFrom(description: string): string {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 6);
  while (words.length > 1 && JOINERS.has(words[words.length - 1])) words.pop();
  return words.join("_") || "new_agent";
}

/** The source the from-chat door stamps on the chat's own case (aidream `CHAT_CASE_SOURCE`). */
export const CHAT_CASE_SOURCE = "chat.turns";

export interface StudioCase {
  variables: Record<string, string>;
  userInput: string;
  /** The answer the person approved (the case's baseline). */
  approved: string;
}

/** The source the Studio stamps on a person's own finished example ("From examples I already have"). */
export const EXAMPLES_CASE_SOURCE = "studio.examples";

/**
 * The case the Studio sent the factory with the person's own answer as its baseline, read back
 * from the build's own record (`request.spec.sample_inputs`), never kept anywhere else:
 * mode 2's original request + approved answer (`CHAT_CASE_SOURCE`), or "From examples"'s first
 * example that came with the input behind it (else the first example) (`EXAMPLES_CASE_SOURCE`).
 */
export function studioCaseFromBuild(
  state: FactoryBuildState | null | undefined,
  source: string = CHAT_CASE_SOURCE,
): StudioCase | null {
  const raw = state?.request?.spec?.["sample_inputs"];
  if (typeof raw !== "string" || !raw.trim()) return null;
  let cases: unknown;
  try {
    cases = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(cases)) return null;
  const mine = cases.filter(
    (c): c is Record<string, unknown> =>
      typeof c === "object" && c !== null && (c as Record<string, unknown>).source === source,
  );
  const hasInput = (c: Record<string, unknown>) =>
    (typeof c.user_input === "string" && c.user_input.trim() !== "") ||
    (!!c.variables && typeof c.variables === "object" && Object.keys(c.variables as object).length > 0);
  const found = mine.find(hasInput) ?? mine[0];
  if (!found) return null;
  const variables: Record<string, string> = {};
  const vars = found.variables;
  if (vars && typeof vars === "object") {
    for (const [k, v] of Object.entries(vars as Record<string, unknown>)) {
      if (typeof v === "string") variables[k] = v;
    }
  }
  return {
    variables,
    userInput: typeof found.user_input === "string" ? found.user_input : "",
    approved: typeof found.baseline_output === "string" ? found.baseline_output : "",
  };
}

/** One finished thing the person made, and (optionally) what it was made from. */
export interface StudioExample {
  output: string;
  input: string;
}

export const EXAMPLES_MIN = 2;
export const EXAMPLES_MAX = 5;
/** How much of each example rides in the job text (the full example rides as its proof case). */
const EXAMPLE_EXCERPT_CHARS = 1500;

export function filledStudioExamples(examples: readonly StudioExample[]): StudioExample[] {
  return examples
    .map((e) => ({ output: e.output.trim(), input: e.input.trim() }))
    .filter((e) => e.output !== "")
    .slice(0, EXAMPLES_MAX);
}

/**
 * "From examples I already have" → the Agent Factory's own intake (no new builder): the job is to
 * produce work like the examples; each example is a proof case whose baseline is the person's own
 * work (`baseline_output`, the same shape the from-chat door sends), so the factory's blind proof
 * compares the new agent against them; the excerpts ride in the job text so the instruction writer
 * sees them even when no input came with them.
 */
export function examplesBuildSpec(
  examples: readonly StudioExample[],
  job: string,
): { name: string; purpose: string; sample_inputs: string; grading_rubric: string } {
  const given = filledStudioExamples(examples);
  const said = job.trim();
  const lines = [
    said || "Produce new work exactly like the examples below, which this person made themselves.",
    said ? "These are finished examples this person made themselves; the agent's job is to produce work like them." : "",
    "Match their structure, length, tone and level of detail. Where an example came with the input it was made from, that input shows what the agent will be given.",
    ...given.flatMap((e, i) => [
      "",
      `Example ${i + 1}${e.input ? " — made from:" : ":"}`,
      ...(e.input ? [e.input.slice(0, EXAMPLE_EXCERPT_CHARS), "", "The finished result:"] : []),
      e.output.slice(0, EXAMPLE_EXCERPT_CHARS),
    ]),
  ].filter((l, i) => i > 1 || l !== "");
  const cases = given.map((e, i) => ({
    source: EXAMPLES_CASE_SOURCE,
    turn: i + 1,
    baseline_output: e.output,
    ...(e.input ? { user_input: e.input } : {}),
  }));
  return {
    name: buildNameFrom(said || `like my examples ${given[0]?.output.slice(0, 40) ?? ""}`),
    purpose: lines.join("\n"),
    sample_inputs: JSON.stringify(cases),
    grading_rubric:
      "A run passes when its result could pass for one of the person's own examples: the same structure, length, tone and level of detail, with the facts of its own input.",
  };
}

/**
 * Asked of the doer, on its own conversation, when the person presses "Make this an agent". A plain
 * person turn (like Debrief's question): the doer answers as itself; the Agent Builder writes the
 * new agent from the brief this feeds — this text is never the new agent's instructions.
 */
export const CAPTURE_QUESTION = [
  "I'm happy with that result, and I'm turning this into an agent so it can be done the same way next time.",
  "Tell me exactly what made it work: the steps you took, the skills and knowledge you used, the tools you relied on,",
  "the inputs that will change from one time to the next (with the values I used today),",
  "and every preference or correction I gave you along the way.",
].join(" ");

/**
 * The doer's standing hint (DESIGN.md §11 cut-line "standing doer hint"): until a holder for a
 * declared `agent_studio.doer` mandate comes out of the Agent Factory, the doer stays the default
 * chat agent and this note rides on ITS conversation as context (`runtime.context`) — never a new
 * agent, never hand-written instructions.
 */
export const DOER_CONTEXT_KEY = "agent_studio_doer_note";
export const DOER_NOTE = [
  "You are helping this person get a real result for their job in the Agent Studio.",
  "Do the job fully and well with every tool you have. When they are happy with the result, they will",
  "turn this chat into a reusable agent, so make the steps, inputs and preferences you rely on easy to see.",
].join(" ");

/** A message record as the chat store keeps it (only what the Studio reads). */
export interface StudioMessageRecord {
  role?: string;
  status?: string;
  error?: unknown;
  _clientStatus?: string;
  metadata?: unknown;
  content?: unknown;
}

function recordText(record: StudioMessageRecord): string {
  const blocks = Array.isArray(record.content) ? (record.content as Array<Record<string, unknown>>) : [];
  return blocks
    .filter((b) => (b.type === "text" || b.type === undefined) && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();
}

function isFailed(record: StudioMessageRecord): boolean {
  const md = record.metadata as Record<string, unknown> | null | undefined;
  return (
    record.status === "failed" ||
    Boolean(record.error) ||
    record._clientStatus === "error" ||
    (!!md && typeof md === "object" && md.failed === true)
  );
}

/**
 * The answer the person approved: the LATEST assistant answer that actually came back. A refused
 * or failed turn (an approval hold, a provider error, a stop) is never the approved result — the
 * plain "latest assistant message" would hand the build an error line as its baseline.
 */
export function approvedAnswerFrom(
  orderedIds: readonly string[] | undefined,
  byId: Record<string, StudioMessageRecord | undefined> | undefined,
): { id: string; text: string } | null {
  if (!orderedIds || !byId) return null;
  for (let i = orderedIds.length - 1; i >= 0; i--) {
    const record = byId[orderedIds[i]];
    if (!record || record.role !== "assistant" || isFailed(record)) continue;
    const text = recordText(record);
    if (text) return { id: orderedIds[i], text };
  }
  return null;
}

/**
 * "Make this an agent", in flight: the approved answer, the doer's capture and the inputs brief
 * awaiting the person's confirm. Kept ON the doer's conversation (`chat.conversation.metadata`,
 * key below) so a reload mid-flow resumes the confirm card instead of losing the approval.
 */
export const MAKE_DRAFT_KEY = "agent_studio_make";

export interface StudioMakeDraft<Brief = unknown> {
  approved: string;
  capture: string;
  brief: Brief;
}

export function readMakeDraft<Brief>(metadata: unknown): StudioMakeDraft<Brief> | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>)[MAKE_DRAFT_KEY];
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.approved !== "string" || !d.approved.trim() || !d.brief || typeof d.brief !== "object") return null;
  return { approved: d.approved, capture: typeof d.capture === "string" ? d.capture : "", brief: d.brief as Brief };
}

/**
 * "Run again, fresh every time" re-runs the SAME inputs on a new conversation: the values the
 * last run's first turn was sent with, and what the person typed on it. Without this a re-run
 * opened blank and the person had to re-enter the case before they could compare versions.
 */
export function rerunSeedFrom(
  firstTurnValues: Record<string, unknown> | undefined,
  messages: readonly StudioMessageRecord[] | undefined,
): { variables: Record<string, string>; userInput: string } | null {
  const variables: Record<string, string> = {};
  for (const [k, v] of Object.entries(firstTurnValues ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    variables[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  const firstUser = (messages ?? []).find((m) => m.role === "user");
  const userInput = firstUser ? recordText(firstUser) : "";
  if (Object.keys(variables).length === 0 && !userInput) return null;
  return { variables, userInput };
}
