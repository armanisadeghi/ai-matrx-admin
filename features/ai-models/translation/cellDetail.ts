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
export const TRANSLATION_GRID_QUERY_KEY = ["ai-models", "translation-grid"] as const;

/** Knob `ai.translation` / `agent_confidence_threshold` (platform default 0.9). */
export const CONFIDENCE_THRESHOLD_KNOB = {
  feature: "ai.translation",
  key: "agent_confidence_threshold",
} as const;
export const CONFIDENCE_THRESHOLD_DEFAULT = 0.9;

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

const KNOWN = new Set(["kind", "at", "ref", "result"]);

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
    const result = entry.result;
    const conv = isRecord(result) ? result.conversation_id : undefined;
    return {
      kind: typeof entry.kind === "string" ? entry.kind : null,
      at: typeof entry.at === "string" ? entry.at : null,
      ref: entry.ref,
      result,
      outcome: outcomeOf(result),
      conversationId: typeof conv === "string" && conv ? conv : null,
      extra: Object.entries(entry).filter(([k]) => !KNOWN.has(k)),
      raw: entry,
    };
  });
}

export type CellRun = {
  conversation_id: string | null;
  request_id: string | null;
  agent_id: string | null;
  model_id: string | null;
  mandate_key: string | null;
  at: string | null;
};

/** `metadata.run` (the drafting agent's run), or null when none was recorded. */
export function readRun(metadata: unknown): CellRun | null {
  if (!isRecord(metadata) || !isRecord(metadata.run)) return null;
  const r = metadata.run;
  const s = (k: string) => (typeof r[k] === "string" && r[k] ? (r[k] as string) : null);
  return {
    conversation_id: s("conversation_id"),
    request_id: s("request_id"),
    agent_id: s("agent_id"),
    model_id: s("model_id"),
    mandate_key: s("mandate_key"),
    at: s("at"),
  };
}

export function isHttpUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\/\S+$/i.test(v.trim());
}

// ─── Test now ────────────────────────────────────────────────────────────────

export type CellTestOutcome = {
  offering_id: string;
  model_name: string;
  api: string;
  setting_key: string;
  label: string;
  value: unknown;
  wire: Record<string, unknown>;
  outcome: "accepted" | "rejected" | "error" | "skipped";
  detail: string;
  provider_message: string | null;
  provider_param: string | null;
  conversation_id: string | null;
  cost_usd: number;
  evidence: string;
};

export type CellTestResult = {
  cell_id: string;
  summary: string;
  tested_offerings: number;
  budget: { per_run: number; per_day: number; used_last_24h: number; allowed_now: number };
  stopped_by_budget: boolean;
  outcomes: CellTestOutcome[];
};

export type CellTestAuth = {
  baseUrl: string | null;
  accessToken: string | null;
  organizationId: string | null | undefined;
};

/** The server's own sentence for a refused test (400/409 `detail`), with its status. */
export function testErrorSentence(error: unknown): string {
  if (error instanceof BackendApiError) {
    const words = (error.detail || error.userMessage || error.message || "").trim();
    return error.status ? `${error.status}: ${words}` : words;
  }
  return error instanceof Error ? error.message : String(error);
}

export async function testTranslationCell(
  auth: CellTestAuth,
  cellId: string,
): Promise<CellTestResult> {
  if (!auth.baseUrl) throw new Error("No AI Matrx server address is configured.");
  if (!auth.accessToken) throw new Error("Sign in again; no session was found.");
  return postJsonAsUser<CellTestResult>({
    baseUrl: auth.baseUrl,
    accessToken: auth.accessToken,
    organizationId: auth.organizationId,
    path: `/admin/ai-catalog/translation-cells/${encodeURIComponent(cellId)}/test`,
    body: {},
  });
}
