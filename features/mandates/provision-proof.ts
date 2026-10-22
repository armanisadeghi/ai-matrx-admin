// features/mandates/provision-proof.ts
//
// THE PROVISION PROOF, read side. A proof run (aidream scripts/prove_provision.py) drives the REAL code at a
// provision's point with example inputs, builds every value, and stores what each one really was on
// `mandate.provision.proof`. This module parses that column and the two placement fields each offered value may
// declare (`group`, `source`), which the shared `parseOfferedValues` does not carry.
//
// Arman, 2026-10-21 (mandates VISION § A provision is real, and the mandate proves it): the mandate page shows the
// reality — what we will get and its exact shape — grouped into packages, with real samples.

export type ProofVerdict = "seen" | "empty_in_proof" | "inconclusive" | "not_produced";

export interface ProofValue {
  verdict: ProofVerdict;
  group: string | null;
  source: string | null;
  label: string | null;
  sample: unknown;
  sampleCase: string | null;
  shape: unknown;
  /** case label → present | empty | not_run | error */
  cases: Record<string, string>;
  /** case label → why it was absent */
  reasons: Record<string, string>;
}

export interface ProvisionProof {
  provedAt: string | null;
  counts: Partial<Record<ProofVerdict, number>>;
  cases: { case: string; runId: string | null; status: string | null }[];
  values: Record<string, ProofValue>;
  undeclared: { case: string; what: string; where: string }[];
}

export interface ValuePlacement {
  group: string | null;
  source: string | null;
}

const VERDICTS: readonly ProofVerdict[] = ["seen", "empty_in_proof", "inconclusive", "not_produced"];

function obj(raw: unknown): Record<string, unknown> | null {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function str(raw: unknown): string | null {
  return typeof raw === "string" && raw !== "" ? raw : null;
}

function strMap(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(raw) ?? {})) if (typeof v === "string") out[k] = v;
  return out;
}

export function parseProvisionProof(raw: unknown): ProvisionProof | null {
  const proof = obj(raw);
  if (!proof) return null;
  const values: Record<string, ProofValue> = {};
  for (const [name, entry] of Object.entries(obj(proof.values) ?? {})) {
    const v = obj(entry);
    if (!v || !VERDICTS.includes(v.verdict as ProofVerdict)) continue;
    values[name] = {
      verdict: v.verdict as ProofVerdict,
      group: str(v.group),
      source: str(v.source),
      label: str(v.label),
      sample: v.sample ?? null,
      sampleCase: str(v.sample_case),
      shape: v.shape ?? null,
      cases: strMap(v.cases),
      reasons: strMap(v.reasons),
    };
  }
  const counts: Partial<Record<ProofVerdict, number>> = {};
  for (const [k, n] of Object.entries(obj(proof.counts) ?? {})) {
    if (VERDICTS.includes(k as ProofVerdict) && typeof n === "number") counts[k as ProofVerdict] = n;
  }
  const cases = (Array.isArray(proof.cases) ? proof.cases : []).flatMap((c) => {
    const row = obj(c);
    return row && str(row.case) ? [{ case: str(row.case) as string, runId: str(row.run_id), status: str(row.status) }] : [];
  });
  const undeclared = (Array.isArray(proof.undeclared) ? proof.undeclared : []).flatMap((u) => {
    const row = obj(u);
    return row && str(row.what)
      ? [{ case: str(row.case) ?? "", what: str(row.what) as string, where: str(row.where) ?? "" }]
      : [];
  });
  return { provedAt: str(proof.proved_at), counts, cases, values, undeclared };
}

/** name → the `group` / `source` an offered value declares (absent on provisions that declare neither). */
export function parsePlacements(raw: unknown): Record<string, ValuePlacement> {
  const out: Record<string, ValuePlacement> = {};
  if (!Array.isArray(raw)) return out;
  for (const entry of raw) {
    const v = obj(entry);
    const name = v && str(v.name);
    if (name && v && (str(v.group) || str(v.source))) out[name] = { group: str(v.group), source: str(v.source) };
  }
  return out;
}

export const VERDICT_WORDS: Record<ProofVerdict | "unproven", string> = {
  seen: "Real",
  empty_in_proof: "Empty here",
  inconclusive: "Retry",
  not_produced: "Not produced",
  unproven: "Not proven",
};

export const VERDICT_TONE = {
  seen: "success",
  empty_in_proof: "neutral",
  inconclusive: "warning",
  not_produced: "destructive",
  unproven: "neutral",
} as const;

/** The closed `source` grammar (aidream OfferedValue.source) in screen words. */
export function sourceWords(source: string | null): string {
  if (!source) return "Not stated";
  if (source === "always") return "Always";
  const [head, rest = ""] = source.split(":", 2);
  const what = rest.replace(/[._]/g, " ").trim();
  if (head === "when_input") return `When ${what || "an input"} is given`;
  if (head === "when_knob") return `When ${what || "a setting"} is on`;
  if (head === "fetched_on_use") return rest === "paid" ? "Fetched when used (paid)" : "Fetched when used";
  return source;
}
