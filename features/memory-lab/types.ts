/**
 * Memory Lab — the shapes the page reads. A trial (`chat.memory_trial`) is one person's historic
 * chats replayed through the memory agents into a sandbox store (`files`), never their live memory.
 * Every agent pass is a `chat.memory_trial_step` row written by the server's apply door.
 * Plan: common-docs/systems/chat/agent-memory/projects/memory-v1/PLAN.md §4. FEATURE: ./FEATURE.md.
 */
import type { Json } from "@/types/database.types";

export type MemoryRole = "review" | "reflect" | "steward";
export const MEMORY_ROLES: readonly MemoryRole[] = ["review", "reflect", "steward"];

export const ROLE_LABEL: Record<MemoryRole, string> = {
  review: "Reviewer",
  reflect: "Reflection",
  steward: "Steward",
};

/** The trial column holding each role's agent. */
export const ROLE_AGENT_COLUMN = {
  review: "reviewer_agent_id",
  reflect: "reflect_agent_id",
  steward: "steward_agent_id",
} as const satisfies Record<MemoryRole, string>;

/** The provision points each role is fed from (server: aidream/services/agent_memory). */
export const REVIEW_POINT = "memory.conversation_review";
export const STORE_POINT = "memory.store";
export const ROLE_POINTS: Record<MemoryRole, readonly string[]> = {
  review: [REVIEW_POINT, STORE_POINT],
  reflect: [STORE_POINT],
  steward: [STORE_POINT],
};

/** `{role: {variable: "<point key>.<value name>"}}` — saved on the trial. */
export type TrialBindings = Partial<Record<MemoryRole, Record<string, string>>>;

/** A run started but not yet applied — kept on `trial.metadata.pending_runs` so a reload can finish it. */
export interface PendingRun {
  role: MemoryRole;
  runConversationId: string;
  agentId: string;
  subjectConversationId: string | null;
  requestText: string | null;
  provisionSnapshotIds: string[];
  startedAt: string;
}

export interface MemoryTrial {
  id: string;
  title: string;
  subjectUserId: string;
  subjectLabel: string;
  status: "open" | "archived";
  files: Record<string, string>;
  agents: Record<MemoryRole, string | null>;
  bindings: TrialBindings;
  notes: string;
  organizationId: string;
  pendingRuns: PendingRun[];
  metadata: Record<string, Json | undefined>;
  createdAt: string;
  updatedAt: string;
}

export type MemoryEditCommand = "create" | "str_replace" | "insert" | "delete" | "rename" | "view";

export interface MemoryEvidence {
  position: number | null;
  quote: string;
}

export interface MemoryEdit {
  command: string;
  path: string;
  why: string;
  evidence: MemoryEvidence[];
  raw: Record<string, unknown>;
}

export interface MemoryQuestion {
  path: string;
  question: string;
}

export interface MemoryEditResult {
  index: number;
  command: string;
  path: string;
  ok: boolean;
  error: string | null;
  before: string | null;
  after: string | null;
}

export type StepStatus = "applied" | "nothing" | "failed";

export interface MemoryTrialStep {
  id: string;
  trialId: string;
  seq: number;
  role: MemoryRole;
  subjectConversationId: string | null;
  agentId: string | null;
  runConversationId: string | null;
  requestText: string | null;
  provisionSnapshotIds: string[];
  status: StepStatus;
  edits: MemoryEdit[];
  questions: MemoryQuestion[];
  nothingBecause: string;
  results: MemoryEditResult[];
  filesBefore: Record<string, string>;
  filesAfter: Record<string, string>;
  error: string | null;
  createdAt: string;
}

/** One of the person's chat conversations, with the agent it ran. */
export interface CandidateConversation {
  id: string;
  title: string | null;
  createdAt: string;
  messageCount: number;
  agentId: string | null;
  agentName: string | null;
  agentType: string | null;
  /** True for a chat agent, and for a plain chat with no agent. */
  isChat: boolean;
}

export interface LabAgent {
  id: string;
  name: string;
  agentType: string | null;
  isChatAgent: boolean;
  variables: string[];
}

// ---------------------------------------------------------------------------
// Parsers — the jsonb columns are read defensively; a bad shape reads as empty, never throws.
// ---------------------------------------------------------------------------

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseFiles(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(asRecord(value))) {
    out[path] = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  }
  return out;
}

export function parseBindings(value: unknown): TrialBindings {
  const out: TrialBindings = {};
  const raw = asRecord(value);
  for (const role of MEMORY_ROLES) {
    const map = asRecord(raw[role]);
    const clean: Record<string, string> = {};
    for (const [variable, source] of Object.entries(map)) {
      if (typeof source === "string" && source) clean[variable] = source;
    }
    if (Object.keys(clean).length) out[role] = clean;
  }
  return out;
}

function isRole(value: unknown): value is MemoryRole {
  return value === "review" || value === "reflect" || value === "steward";
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function parsePendingRuns(metadata: unknown): PendingRun[] {
  const list = asRecord(metadata).pending_runs;
  if (!Array.isArray(list)) return [];
  const out: PendingRun[] = [];
  for (const item of list) {
    const r = asRecord(item);
    if (!isRole(r.role) || !str(r.runConversationId) || !str(r.agentId)) continue;
    out.push({
      role: r.role,
      runConversationId: str(r.runConversationId),
      agentId: str(r.agentId),
      subjectConversationId: str(r.subjectConversationId) || null,
      requestText: str(r.requestText) || null,
      provisionSnapshotIds: stringList(r.provisionSnapshotIds),
      startedAt: str(r.startedAt),
    });
  }
  return out;
}

function parseEvidence(value: unknown): MemoryEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.map((e) => {
    const r = asRecord(e);
    return { position: typeof r.position === "number" ? r.position : null, quote: str(r.quote) };
  });
}

/** The path an edit names (`rename` names two). */
export function editPath(raw: Record<string, unknown>): string {
  if (str(raw.command) === "rename") return `${str(raw.old_path)} → ${str(raw.new_path)}`;
  return str(raw.path);
}

export function parseOutput(output: unknown): {
  edits: MemoryEdit[];
  questions: MemoryQuestion[];
  nothingBecause: string;
} {
  const r = asRecord(output);
  const edits = Array.isArray(r.edits)
    ? r.edits.map((e) => {
        const raw = asRecord(e);
        return {
          command: str(raw.command),
          path: editPath(raw),
          why: str(raw.why),
          evidence: parseEvidence(raw.evidence),
          raw,
        };
      })
    : [];
  const questions = Array.isArray(r.questions)
    ? r.questions.map((q) => {
        const raw = asRecord(q);
        return { path: str(raw.path), question: str(raw.question) };
      })
    : [];
  return { edits, questions, nothingBecause: str(r.nothing_to_remember_because) };
}

export function parseResults(value: unknown): MemoryEditResult[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, i) => {
    const r = asRecord(item);
    return {
      index: typeof r.index === "number" ? r.index : i,
      command: str(r.command),
      path: str(r.path),
      ok: r.ok === true,
      error: str(r.error) || null,
      before: typeof r.before === "string" ? r.before : null,
      after: typeof r.after === "string" ? r.after : null,
    };
  });
}

export function parseStepStatus(value: unknown): StepStatus {
  return value === "applied" || value === "nothing" ? value : "failed";
}

export function parseRole(value: unknown): MemoryRole {
  return isRole(value) ? value : "review";
}

export { stringList };

/** Names declared in `agent.definition.variable_definitions` (an array of `{name, …}`). */
export function variableNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const name = asRecord(item).name;
    if (typeof name === "string" && name && !out.includes(name)) out.push(name);
  }
  return out;
}

/** `"<point key>.<value name>"` → its two halves (point keys carry dots; value names never do). */
export function splitSource(source: string): { point: string; value: string } | null {
  const at = source.lastIndexOf(".");
  if (at <= 0 || at === source.length - 1) return null;
  return { point: source.slice(0, at), value: source.slice(at + 1) };
}
