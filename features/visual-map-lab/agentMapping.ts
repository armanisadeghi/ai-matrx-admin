// features/visual-map-lab/agentMapping.ts
//
// "Send to agent builder": which of the sample's values go into which of the chosen agent's declared variables.
// Pure. The mapping starts from NAME matches (a variable called `spec` takes the spec) and the person edits it; every
// value that no variable takes is returned as `unmapped` and listed on screen — never silently dropped.

import type { LabSample } from "./types";

export interface SampleValue {
  /** The sample value's own name — what an agent variable is matched against. */
  key: string;
  label: string;
  /** What would be sent: strings verbatim, JSON pretty-printed. */
  text: string;
}

const asText = (v: unknown): string => (typeof v === "string" ? v : JSON.stringify(v, null, 2));
const present = (v: unknown): boolean =>
  v != null && v !== "" && !(Array.isArray(v) && v.length === 0) && !(typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** Every value of the sample that can ride into an agent, in the order the page shows them. */
export function sampleValues(sample: LabSample): SampleValue[] {
  const all: Array<[string, string, unknown]> = [
    ["spec", "Spec", sample.spec],
    ["diagnostics", "Engine diagnostics", sample.diagnostics],
    ["measurements", "Measurements (inspection.v1)", sample.measurements],
    ["receipt", "Receipt", sample.receipt],
    ["mermaid", "Mermaid version", sample.mermaid?.source ?? null],
    ["rounds", "Repair rounds", sample.rounds.length ? sample.rounds.map((r) => ({ round: r.round, diagnostics: r.diagnostics, measurements: r.measurements })) : null],
    ["title", "Title", sample.title],
    ["diagram_type", "Diagram type", sample.type],
  ];
  return all.filter(([, , v]) => present(v)).map(([key, label, v]) => ({ key, label, text: asText(v) }));
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Words an agent author is likely to use for each value. */
const ALIASES: Record<string, string[]> = {
  spec: ["spec", "diagramspec", "diagram", "json"],
  diagnostics: ["diagnostics", "diagnostic", "issues", "errors", "validation", "enginediagnostics"],
  measurements: ["measurements", "measurement", "numbers", "inspection", "metrics", "layoutnumbers"],
  receipt: ["receipt", "layoutreceipt"],
  mermaid: ["mermaid", "mermaidsource", "mermaidversion"],
  rounds: ["rounds", "history", "repairrounds"],
  title: ["title", "name"],
  diagram_type: ["diagramtype", "type"],
};

/** Name-match suggestion: declared variable name -> sample value key (only for values the sample has). */
export function suggestMapping(declared: readonly string[], values: readonly SampleValue[]): Record<string, string> {
  const have = new Set(values.map((v) => v.key));
  const taken = new Set<string>();
  const out: Record<string, string> = {};
  for (const name of declared) {
    const n = norm(name);
    const hit = Object.entries(ALIASES).find(([key, words]) => have.has(key) && !taken.has(key) && words.includes(n));
    if (hit) {
      out[name] = hit[0];
      taken.add(hit[0]);
    } else out[name] = "";
  }
  return out;
}

export interface AppliedMapping {
  /** declared variable name -> the text it receives (only variables that got a value). */
  variables: Record<string, string>;
  /** The sample values no variable takes, by label. */
  unmapped: SampleValue[];
}

export function applyMapping(mapping: Readonly<Record<string, string>>, values: readonly SampleValue[]): AppliedMapping {
  const byKey = new Map(values.map((v) => [v.key, v]));
  const variables: Record<string, string> = {};
  const used = new Set<string>();
  for (const [variable, key] of Object.entries(mapping)) {
    const value = key ? byKey.get(key) : undefined;
    if (!value) continue;
    variables[variable] = value.text;
    used.add(key);
  }
  return { variables, unmapped: values.filter((v) => !used.has(v.key)) };
}
