/**
 * The Studio workspace — the one shared record between the person and the Studio assistant
 * (aidream `agent_studio/workspace.py`; spec common-docs ASSISTANT-PROVISION.md §4a). Stored once, on the
 * assistant's own conversation (`chat.conversation.metadata.agent_studio_workspace`) with the same guarded
 * merge `make-draft.ts` uses. The assistant writes it through the `studio_workspace` tool; the person edits
 * it here, and a person's edit WINS: the field is marked `by: "person"` and the server refuses the
 * assistant's overwrite.
 *
 * The edit functions are pure (record in, record out) so the rules are tested without a store.
 */

import { mergeJsonColumn } from "@ai-matrx/data/db";
import { createClient } from "@/utils/supabase/client";

export const WORKSPACE_KEY = "agent_studio_workspace";

export type WorkspaceBy = "assistant" | "person" | "code";

export interface WorkspaceInput {
  name: string;
  label?: string | null;
  value?: string | null;
  required?: boolean;
  turn?: number | null;
  by?: WorkspaceBy;
  /** A value the "inputs we may have missed" check suggested; the person keeps or drops it. */
  suggested?: boolean;
}

export interface WorkspaceTool {
  tool: string;
  why?: string | null;
  calls?: number | null;
  by?: WorkspaceBy;
}

export interface StudioWorkspace {
  __kind: "agent_studio_workspace";
  title: string | null;
  goal: string | null;
  deliverable: string | null;
  output_form: unknown;
  /** The result itself, as the assistant last gave it (no lead-in, no follow-up): what "This is the one" approves. */
  draft?: string | null;
  inputs: WorkspaceInput[];
  approved_result: { turn?: number | null; text: string; by: WorkspaceBy } | null;
  steps: string[];
  tools_that_mattered: WorkspaceTool[];
  knowledge: string[];
  requirements: string[];
  open_questions: string[];
  build: { build_id?: string; agent_id?: string; outcome?: string | null } | null;
  by: Record<string, WorkspaceBy>;
}

export type TextListField = "steps" | "knowledge" | "requirements" | "open_questions";
export type TextField = "title" | "goal" | "deliverable";

export function emptyWorkspace(): StudioWorkspace {
  return {
    __kind: "agent_studio_workspace",
    title: null,
    goal: null,
    deliverable: null,
    output_form: null,
    draft: null,
    inputs: [],
    approved_result: null,
    steps: [],
    tools_that_mattered: [],
    knowledge: [],
    requirements: [],
    open_questions: [],
    build: null,
    by: {},
  };
}

/** The stored value as a full record; a half-written row never throws. */
export function readWorkspace(metadata: unknown): StudioWorkspace {
  const ws = emptyWorkspace();
  const raw =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>)[WORKSPACE_KEY] : null;
  if (!raw || typeof raw !== "object") return ws;
  const r = raw as Record<string, unknown>;
  const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    ...ws,
    ...(r as Partial<StudioWorkspace>),
    inputs: list<WorkspaceInput>(r.inputs),
    steps: list<string>(r.steps),
    tools_that_mattered: list<WorkspaceTool>(r.tools_that_mattered),
    knowledge: list<string>(r.knowledge),
    requirements: list<string>(r.requirements),
    open_questions: list<string>(r.open_questions),
    by: r.by && typeof r.by === "object" ? (r.by as Record<string, WorkspaceBy>) : {},
  };
}

export function workspaceIsEmpty(ws: StudioWorkspace): boolean {
  return (
    !ws.goal &&
    !ws.title &&
    ws.inputs.length === 0 &&
    ws.steps.length === 0 &&
    ws.requirements.length === 0 &&
    ws.knowledge.length === 0 &&
    ws.open_questions.length === 0 &&
    ws.tools_that_mattered.length === 0
  );
}

// ── the person's edits (every one marks `by: "person"`; the server then refuses the assistant's overwrite) ──

export function personSetText(ws: StudioWorkspace, field: TextField, value: string): StudioWorkspace {
  return withName({ ...ws, [field]: value, by: { ...ws.by, [field]: "person" } });
}

// ── the name follows from the goal (code, never a question; same rule as aidream workspace.name_from_goal) ──

const NAME_CUT = /(?:[.;:!?](?:\s|$)|\n| — | - | \((?=.)| (?:for|so that|so|by|which|that|because|when|while) )/;

const JOINING_WORDS = new Set(
  "a an the to of for with and or in on at about from into by as its their our your his her".split(" "),
);

/** A short name read off the goal's first clause; null for an empty goal. */
export function nameFromGoal(goal: string | null | undefined): string | null {
  const text = (goal ?? "").split(/\s+/).filter(Boolean).join(" ");
  if (!text) return null;
  const cut = NAME_CUT.exec(text);
  let head = cut && text.slice(0, cut.index).split(" ").length >= 3 ? text.slice(0, cut.index) : text;
  if (head.length > 60) {
    // A cut name never ends on a joining word ("…buyer's question about").
    const words = head.slice(0, 60).replace(/ [^ ]*$/, "").split(" ");
    while (words.length > 3 && JOINING_WORDS.has(words[words.length - 1].toLowerCase().replace(/[,;:]+$/, ""))) words.pop();
    head = words.join(" ");
  }
  head = head.replace(/^[ ,;:\-—]+|[ ,;:\-—]+$/g, "");
  return head ? head[0].toUpperCase() + head.slice(1) : null;
}

/** Fill an empty name from the goal, marked `code` (a name the person wrote is never replaced). */
export function withName(ws: StudioWorkspace): StudioWorkspace {
  if ((ws.title ?? "").trim() || ws.by.title === "person") return ws;
  const derived = nameFromGoal(ws.goal);
  return derived ? { ...ws, title: derived, by: { ...ws.by, title: "code" } } : ws;
}

// ── what "This is the one" approves: the deliverable, never the chat around it ──

/**
 * The deliverable inside a chat answer: the block between horizontal rules (the lead-in above and the
 * follow-up below dropped), else the largest fenced block, else the whole answer.
 */
export function deliverableFrom(answer: string): string {
  const text = answer.trim();
  const parts = text.split(/\n[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*\n/);
  if (parts.length >= 3) {
    const inner = parts.slice(1, -1).map((p) => p.trim()).filter(Boolean);
    if (inner.length > 0) return inner.reduce((a, b) => (b.length > a.length ? b : a));
  }
  const fenced = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1].trim()).filter(Boolean);
  if (fenced.length > 0) return fenced.reduce((a, b) => (b.length > a.length ? b : a));
  return text;
}

/** The text the press approves: the assistant's recorded draft, else the deliverable inside the latest answer. */
export function approvalText(ws: StudioWorkspace | null, latestAnswer: string): string {
  const draft = (ws?.draft ?? "").trim();
  return draft || deliverableFrom(latestAnswer);
}

export function personSetInput(
  ws: StudioWorkspace,
  name: string,
  patch: Partial<Pick<WorkspaceInput, "label" | "value">>,
): StudioWorkspace {
  return {
    ...ws,
    inputs: ws.inputs.map((i) => (i.name === name ? { ...i, ...patch, by: "person", suggested: false } : i)),
    by: { ...ws.by, [`inputs.${name}`]: "person" },
  };
}

export function personRemoveInput(ws: StudioWorkspace, name: string): StudioWorkspace {
  const { [`inputs.${name}`]: _gone, ...by } = ws.by;
  return { ...ws, inputs: ws.inputs.filter((i) => i.name !== name), by };
}

/** The person types into a text-list row (steps, knowledge, requirements, open questions). */
export function personSetListItem(ws: StudioWorkspace, field: TextListField, index: number, value: string): StudioWorkspace {
  return {
    ...ws,
    [field]: ws[field].map((v, i) => (i === index ? value : v)),
    by: { ...ws.by, [`${field}.${index}`]: "person" },
  };
}

export function personAddListItem(ws: StudioWorkspace, field: TextListField, value: string): StudioWorkspace {
  return {
    ...ws,
    [field]: [...ws[field], value],
    by: { ...ws.by, [`${field}.${ws[field].length}`]: "person" },
  };
}

/** Removing shifts later rows up: their marks move with them (a plain-text row has only its path mark). */
export function personRemoveListItem(ws: StudioWorkspace, field: TextListField, index: number): StudioWorkspace {
  const by: Record<string, WorkspaceBy> = {};
  for (const [path, who] of Object.entries(ws.by)) {
    if (!path.startsWith(`${field}.`)) {
      by[path] = who;
      continue;
    }
    const n = Number(path.slice(field.length + 1));
    if (!Number.isInteger(n) || n === index) continue;
    by[`${field}.${n > index ? n - 1 : n}`] = who;
  }
  return { ...ws, [field]: ws[field].filter((_, i) => i !== index), by };
}

/** The code-written approval: "This is the one" (default: the latest answer that actually came back). */
export function codeApprove(ws: StudioWorkspace, text: string, turn: number | null): StudioWorkspace {
  return { ...ws, approved_result: { text, turn, by: "code" }, by: { ...ws.by, approved_result: "code" } };
}

/** The person keeps a suggested input (it becomes theirs) or drops it. */
export function keepSuggestedInput(ws: StudioWorkspace, input: WorkspaceInput): StudioWorkspace {
  if (ws.inputs.some((i) => i.name === input.name)) return ws;
  return {
    ...ws,
    inputs: [...ws.inputs, { ...input, by: "person", suggested: false }],
    by: { ...ws.by, [`inputs.${input.name}`]: "person" },
  };
}

// ── storage ──

export async function loadWorkspace(conversationId: string): Promise<StudioWorkspace> {
  const { data, error } = await createClient()
    .schema("chat")
    .from("conversation")
    .select("metadata")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw new Error(`The workspace did not load: ${error.message}`);
  return readWorkspace(data?.metadata);
}

/**
 * Applies ONE edit to the record as it stands NOW (re-read inside the guarded merge, so the assistant's
 * concurrent write to another field survives) and saves only this key.
 */
export async function editWorkspace(
  conversationId: string,
  edit: (current: StudioWorkspace) => StudioWorkspace,
): Promise<StudioWorkspace> {
  const supabase = createClient();
  let saved: StudioWorkspace | null = null;
  const result = await mergeJsonColumn<{ id: string; version: number; metadata: unknown }>({
    fetchCurrent: () =>
      supabase.schema("chat").from("conversation").select("id,version,metadata").eq("id", conversationId).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => {
      saved = edit(readWorkspace(current));
      return { ...current, [WORKSPACE_KEY]: saved };
    },
    applyUpdate: ({ value, expectedVersion, nextVersion }) =>
      supabase
        .schema("chat")
        .from("conversation")
        .update({ metadata: value, version: nextVersion })
        .eq("id", conversationId)
        .eq("version", expectedVersion)
        .select("id,version,metadata")
        .maybeSingle(),
  });
  if (result.status !== "saved" || !saved) throw new Error(`The workspace did not save (${result.status})`);
  return saved;
}
