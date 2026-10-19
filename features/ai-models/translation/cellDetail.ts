/**
 * One translation cell, everything it carries, as an admin reads it — the pure
 * half of `components/CellDetailPanel.tsx` (shared by the /approvals row and the
 * grid's cell editor; one renderer, never two copies).
 *
 * - `sourceLabel` — who proposed it, in words.
 * - `evidenceProven` — mirrors `ai.translation_evidence_proven(jsonb)` exactly
 *   (live definition read 2026-10-18): proven when some `probe`/`replay` entry
 *   passed (`"pass"|"accepted"|"boundary"`, bare or as `result.outcome`) and
 *   none failed (`"fail"|"rejected"`).
 * - `proofCurrent` — mirrors `ai.translation_proof_current(jsonb, jsonb)`, the
 *   door's actual proof test since aidream migration 20261019110000: only entries
 *   a server-run test wrote (`by: "probe"`) about exactly the current rule
 *   (`for_rule` equal to the cell's rule, compared as JSON) count.
 * - `normalizeEvidence` — every entry, any shape (many live rows carry entries
 *   with no `kind`, e.g. `{date, probe}`); nothing is ever dropped.
 * - `readRun` — `metadata.run` written by the drafting agent.
 * - `testTranslationCell` — POST /admin/ai-catalog/translation-cells/{id}/test
 *   (aidream; not in the generated `paths` yet, so it goes through
 *   `postJsonAsUser` like the other ai-catalog admin calls in ../discovery/api.ts).
 */

import { BackendApiError } from "@ai-matrx/api";
import { postJsonAsUser } from "@/lib/api/post-json-as-user";

/** THE query key for the grid bundle; cell details hang under it, so one invalidate refreshes all. */
export const TRANSLATION_GRID_QUERY_KEY = [
  "ai-models",
  "translation-grid",
] as const;

/** The last Test now reply per cell — outside the grid prefix, so it survives a refetch and an unmount. */
export const translationTestResultKey = (cellId: string) =>
  ["ai-models", "translation-test-result", cellId] as const;

const SOURCE_LABEL: Record<string, string> = {
  agent: "Drafting agent",
  probe: "Live test",
  ingest: "Provider catalog",
  migration: "Code change",
};

/** Who proposed a cell, in words; an unknown value is shown as it is stored. */
export function sourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  return SOURCE_LABEL[source] ?? source;
}

const PASS = new Set(["pass", "accepted", "boundary"]);
const FAIL = new Set(["fail", "rejected"]);

function outcomeOf(result: unknown): string | null {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const o = (result as Record<string, unknown>).outcome;
    return typeof o === "string" ? o : null;
  }
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Same answer as `ai.translation_evidence_proven(evidence)`. */
export function evidenceProven(evidence: unknown): boolean {
  if (evidence == null) return false;
  if (!Array.isArray(evidence)) return false;
  const tests = evidence.filter(
    (e): e is Record<string, unknown> =>
      isRecord(e) && (e.kind === "probe" || e.kind === "replay"),
  );
  const passed = tests.some((e) => {
    const o = outcomeOf(e.result);
    return o !== null && PASS.has(o);
  });
  const failed = tests.some((e) => {
    const o = outcomeOf(e.result);
    return o !== null && FAIL.has(o);
  });
  return passed && !failed;
}

/** Postgres `jsonb =`: objects equal regardless of key order, arrays in order. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => jsonEqual(v, b[i]))
    );
  }
  if (isRecord(a) && isRecord(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return (
      ka.length === kb.length &&
      ka.every((k) => k in b && jsonEqual(a[k], b[k]))
    );
  }
  return false;
}

/** The door's proof test: server-run tests (`by: "probe"`) of exactly this rule. */
export function proofCurrent(evidence: unknown, rule: unknown): boolean {
  if (!Array.isArray(evidence)) return false;
  return evidenceProven(
    evidence.filter(
      (e) => isRecord(e) && e.by === "probe" && jsonEqual(e.for_rule, rule),
    ),
  );
}

export type EvidenceView = {
  kind: string | null;
  at: string | null;
  ref: unknown;
  result: unknown;
  /** `result.outcome` or a bare string result, when present. */
  outcome: string | null;
  /** `result.conversation_id` — the stored live-test call. */
  conversationId: string | null;
  /** Every other key the entry carries, shown as key/value. */
  extra: [string, unknown][];
  /** The entry as stored. */
  raw: unknown;
};

export function normalizeEvidence(evidence: unknown): EvidenceView[] {
  if (evidence == null) return [];
  const list = Array.isArray(evidence) ? evidence : [evidence];
  return list.map((entry) => {
    if (!isRecord(entry)) {
      return {
        kind: null,
        at: null,
        ref: undefined,
        result: undefined,
        outcome: null,
        conversationId: null,
        extra: [["value", entry]],
        raw: entry,
      };
    }
    // A key leaves `extra` ONLY when it is drawn in its own slot: a non-string
    // `kind` or `at` stays visible as key/value instead of vanishing.
    const consumed = new Set<string>(["ref", "result"]);
    const kind = typeof entry.kind === "string" ? entry.kind : null;
    if (kind !== null) consumed.add("kind");
    const at = typeof entry.at === "string" ? entry.at : null;
    if (at !== null) consumed.add("at");
    const result = entry.result;
    const conv = isRecord(result) ? result.conversation_id : undefined;
    return {
      kind,
      at,
      ref: entry.ref,
      result,
      outcome: outcomeOf(result),
      conversationId: typeof conv === "string" && conv ? conv : null,
      extra: Object.entries(entry).filter(([k]) => !consumed.has(k)),
      raw: entry,
    };
  });
}

/** Every `metadata` key other than `run` (which has its own slot), as stored. */
export function otherMetadata(metadata: unknown): [string, unknown][] {
  if (!isRecord(metadata))
    return metadata == null ? [] : [["metadata", metadata]];
  return Object.entries(metadata).filter(([k]) => k !== "run");
}

export type CellRun = {
  conversation_id: string | null;
  request_id: string | null;
  agent_id: string | null;
  model_id: string | null;
  mandate_key: string | null;
  at: string | null;
  /** Any other key the run carries (or a known key in an unexpected shape). */
  extra: [string, unknown][];
};

const RUN_KEYS = new Set([
  "conversation_id",
  "request_id",
  "agent_id",
  "model_id",
  "mandate_key",
  "at",
]);

/** `metadata.run` (the drafting agent's run), or null when none was recorded. */
export function readRun(metadata: unknown): CellRun | null {
  if (!isRecord(metadata) || !isRecord(metadata.run)) return null;
  const r = metadata.run;
  const s = (k: string) =>
    typeof r[k] === "string" && r[k] ? (r[k] as string) : null;
  return {
    conversation_id: s("conversation_id"),
    request_id: s("request_id"),
    agent_id: s("agent_id"),
    model_id: s("model_id"),
    mandate_key: s("mandate_key"),
    at: s("at"),
    extra: Object.entries(r).filter(
      ([k]) => !RUN_KEYS.has(k) || typeof r[k] !== "string",
    ),
  };
}

export function isHttpUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\/\S+$/i.test(v.trim());
}

// ─── Test now ────────────────────────────────────────────────────────────────

export type CellTestOutcome = {
  offering_id: string | null;
  model_name: string | null;
  api: string | null;
  setting_key: string | null;
  label: string | null;
  value: unknown;
  wire: unknown;
  outcome: string | null;
  detail: string | null;
  provider_message: string | null;
  provider_param: string | null;
  conversation_id: string | null;
  evidence: string | null;
};

export type CellTestBudget = {
  per_run: number | null;
  per_day: number | null;
  used_last_24h: number | null;
  allowed_now: number | null;
};

/**
 * The Test now reply as the screen draws it. Every field is read defensively:
 * a missing or mis-typed part is named in `problems` and the reply as received
 * stays in `raw`, so an unexpected shape renders honestly and never throws.
 */
export type CellTestResult = {
  summary: string | null;
  tested_offerings: number | null;
  budget: CellTestBudget | null;
  stopped_by_budget: boolean;
  outcomes: CellTestOutcome[];
  problems: string[];
  raw: unknown;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function normalizeTestResult(raw: unknown): CellTestResult {
  const problems: string[] = [];
  if (!isRecord(raw)) {
    return {
      summary: null,
      tested_offerings: null,
      budget: null,
      stopped_by_budget: false,
      outcomes: [],
      problems: ["The server's reply is not an object."],
      raw,
    };
  }
  const summary = str(raw.summary);
  if (summary === null) problems.push("The reply has no summary.");
  let budget: CellTestBudget | null = null;
  if (isRecord(raw.budget)) {
    budget = {
      per_run: num(raw.budget.per_run),
      per_day: num(raw.budget.per_day),
      used_last_24h: num(raw.budget.used_last_24h),
      allowed_now: num(raw.budget.allowed_now),
    };
  } else {
    problems.push("The reply has no budget.");
  }
  let outcomes: CellTestOutcome[] = [];
  if (Array.isArray(raw.outcomes)) {
    outcomes = raw.outcomes.map((o) => {
      const r = isRecord(o) ? o : {};
      return {
        offering_id: str(r.offering_id),
        model_name: str(r.model_name),
        api: str(r.api),
        setting_key: str(r.setting_key),
        label: str(r.label),
        value: r.value,
        wire: r.wire,
        outcome: str(r.outcome),
        detail: str(r.detail),
        provider_message: str(r.provider_message),
        provider_param: str(r.provider_param),
        conversation_id: str(r.conversation_id),
        evidence: str(r.evidence),
      };
    });
    if (raw.outcomes.some((o) => !isRecord(o)))
      problems.push("Some outcome lines are not objects.");
  } else {
    problems.push("The reply has no outcome list.");
  }
  return {
    summary,
    tested_offerings: num(raw.tested_offerings),
    budget,
    stopped_by_budget: raw.stopped_by_budget === true,
    outcomes,
    problems,
    raw,
  };
}

export type CellTestAuth = {
  baseUrl: string | null;
  accessToken: string | null;
  organizationId: string | null | undefined;
};

/** The server's own sentence for a refused test (400/409 `detail`), with its status. */
export function testErrorSentence(error: unknown): string {
  if (error instanceof BackendApiError) {
    const words = (
      error.detail ||
      error.userMessage ||
      error.message ||
      ""
    ).trim();
    return error.status ? `${error.status}: ${words}` : words;
  }
  return error instanceof Error ? error.message : String(error);
}

export async function testTranslationCell(
  auth: CellTestAuth,
  cellId: string,
): Promise<CellTestResult> {
  return normalizeTestResult(await postTestTranslationCell(auth, cellId));
}

async function postTestTranslationCell(
  auth: CellTestAuth,
  cellId: string,
): Promise<unknown> {
  if (!auth.baseUrl)
    throw new Error("No AI Matrx server address is configured.");
  if (!auth.accessToken)
    throw new Error("Sign in again; no session was found.");
  return postJsonAsUser<unknown>({
    baseUrl: auth.baseUrl,
    accessToken: auth.accessToken,
    organizationId: auth.organizationId,
    path: `/admin/ai-catalog/translation-cells/${encodeURIComponent(cellId)}/test`,
    body: {},
  });
}
