// features/visual-map-lab/types.ts
//
// The lab's two shapes: a LIST row (cheap, what the list page reads) and a SAMPLE (everything the record page
// shows side by side). A sample id is the address of the record page: `subject:S3:archify-sonnet`,
// `workflow:<definition id>` or `inspection:<render_inspection row id>`.

export type SampleSource = "subject" | "workflow" | "inspection";

export const SOURCE_LABEL: Record<SampleSource, string> = {
  subject: "Test subject",
  workflow: "Workflow overview",
  inspection: "Saved inspection",
};

export interface LabListRow {
  id: string;
  source: SampleSource;
  /** What the facet filters on: "Test subject", "Workflow overview", "Repair round", "Shape inspection". */
  kind: string;
  title: string;
  /** Diagram type (architecture, sequence, workflow...) when the sample draws as a visual map. */
  type: string | null;
  /** The subject it belongs to (S3, a workflow name, a subject_ref). Rows with the same subject group together. */
  subject: string;
  /** Variant or round: "archify", "sonnet rerun", "3 rounds". */
  detail: string;
  organizationId: string | null;
  createdAt: string | null;
  hasScreenshot: boolean;
}

/** One saved inspection row (a repair round, a delivery, a shape inspection). */
export interface LabRound {
  id: string;
  round: number;
  createdAt: string;
  spec: unknown;
  diagnostics: unknown;
  measurements: unknown;
  screenshotFileId: string | null;
  metadata: unknown;
}

/** A named JSON document that belongs to the sample (layout receipt, visual check, agent report...). */
export interface LabDocument {
  id: string;
  label: string;
  value: unknown;
}

/** A part that could not be read: shown as a row, never dropped. */
export interface LabLoadNote {
  label: string;
  reason: string;
}

export interface LabSample {
  id: string;
  source: SampleSource;
  title: string;
  subject: string;
  /** The engine diagram type, or null when the sample is not a visual map (a shape inspection). */
  type: string | null;
  spec: Record<string, unknown> | null;
  receipt: unknown;
  diagnostics: unknown;
  /** inspection.v1, or a map `"1440:dark" -> inspection.v1 | {error}`, or null when nothing was measured. */
  measurements: unknown;
  verified: boolean;
  issues: number;
  /** Stored screenshot file ids, in the order they were taken. */
  screenshotFileIds: string[];
  mermaid: { source: string; fileId: string | null } | null;
  rounds: LabRound[];
  documents: LabDocument[];
  /** workflow overview only: overview box id -> the real step ids behind it. */
  nodeMap: Record<string, string[]> | null;
  organizationId: string | null;
  createdAt: string | null;
  notes: LabLoadNote[];
}

/** The `visual_map` kind value the one VisualMap renderer takes. */
export function visualMapValueOf(sample: Pick<LabSample, "type" | "spec" | "receipt" | "verified" | "issues" | "id">): unknown {
  if (!sample.type || !sample.spec) return null;
  return {
    type: sample.type,
    spec: sample.spec,
    receipt: sample.receipt && typeof sample.receipt === "object" && !Array.isArray(sample.receipt) ? sample.receipt : undefined,
    verified: sample.verified,
    issues: sample.issues,
  };
}
