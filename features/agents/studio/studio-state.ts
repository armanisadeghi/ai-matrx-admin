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
}

const KEYS = {
  mode: "mode",
  buildId: "build",
  agentId: "agent",
  chatId: "chat",
  planId: "plan",
  planStep: "step",
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

/**
 * The original request the Studio sent the factory as the agent's first proof case (mode 2): read
 * back from the build's own record (`request.spec.sample_inputs`), never kept anywhere else.
 */
export function studioCaseFromBuild(state: FactoryBuildState | null | undefined): StudioCase | null {
  const raw = state?.request?.spec?.["sample_inputs"];
  if (typeof raw !== "string" || !raw.trim()) return null;
  let cases: unknown;
  try {
    cases = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(cases)) return null;
  const found = cases.find(
    (c): c is Record<string, unknown> =>
      typeof c === "object" && c !== null && (c as Record<string, unknown>).source === CHAT_CASE_SOURCE,
  );
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
