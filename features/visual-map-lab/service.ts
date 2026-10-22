// features/visual-map-lab/service.ts
//
// What the lab reads. LIST: the six test subjects (embedded), every workflow the person can see (the workflow list's own
// read, one row each — no overview is made until a workflow is opened), and the saved render inspections they can read
// (content_ir.render_inspection, row security decides), grouped by subject. SAMPLE: everything one record page shows.
//
// A part that cannot be read becomes a `notes` row on the sample — never a silent gap.

import { supabase } from "@/utils/supabase/client";
import { fetchFileBlob } from "@/features/files/hooks/useFileBlob";
import { fetchWorkflowBrowsePage } from "@/features/workflow-runtime/browse/service";
import { parseWorkflowOverview } from "@/features/workflow-runtime/overview/overview-model";
import { callApi } from "@/lib/api/call-api";
import { DEFAULT_ENTITY_LIST_QUERY } from "@/lib/entity-list/types";
import type { AppDispatch } from "@/lib/redux/store";
import { isJsonObject } from "@/types/json";
import { diagramTypeOf, parseSubjectSampleId, specTitle, subjectListRows } from "./subjects";
import {
  SOURCE_LABEL,
  type LabDocument,
  type LabListRow,
  type LabLoadNote,
  type LabRound,
  type LabSample,
} from "./types";

export interface LabLoadFailure {
  source: string;
  message: string;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : typeof e === "string" ? e : "The read failed.");

const INSPECTION_COLUMNS =
  "id, subject_type, subject_ref, round, spec, measurements, diagnostics, screenshot_file_id, organization_id, created_at, metadata";

interface InspectionRow {
  id: string;
  subject_type: string;
  subject_ref: string;
  round: number;
  spec: unknown;
  measurements: unknown;
  diagnostics: unknown;
  screenshot_file_id: string | null;
  organization_id: string;
  created_at: string;
  metadata: unknown;
}

const inspections = () => supabase.schema("content_ir").from("render_inspection");

const toRound = (r: InspectionRow): LabRound => ({
  id: r.id,
  round: r.round,
  createdAt: r.created_at,
  spec: r.spec,
  diagnostics: r.diagnostics,
  measurements: r.measurements,
  screenshotFileId: r.screenshot_file_id,
  metadata: r.metadata,
});

/** The subject groups of the saved inspections: one list row per subject, its newest row, how many rows it holds. */
export function groupInspections(rows: readonly InspectionRow[]): LabListRow[] {
  const bySubject = new Map<string, InspectionRow[]>();
  for (const row of rows) {
    const key = `${row.subject_type}|${row.subject_ref}`;
    const list = bySubject.get(key);
    if (list) list.push(row);
    else bySubject.set(key, [row]);
  }
  const out: LabListRow[] = [];
  for (const group of bySubject.values()) {
    const newest = group.reduce((a, b) => (b.created_at > a.created_at ? b : a));
    const spec = isJsonObject(newest.spec) ? newest.spec : null;
    const isMap = newest.subject_type === "visual_map";
    out.push({
      id: `inspection:${newest.id}`,
      source: "inspection",
      kind: isMap ? "Repair round" : "Shape inspection",
      title: isMap ? specTitle(spec, newest.subject_ref) : newest.subject_ref,
      type: isMap ? diagramTypeOf(spec) : null,
      subject: newest.subject_ref,
      detail: `${group.length} saved ${group.length === 1 ? "row" : "rows"}`,
      organizationId: newest.organization_id,
      createdAt: newest.created_at,
      hasScreenshot: group.some((r) => r.screenshot_file_id != null),
    });
  }
  return out;
}

/** Subjects, workflows, inspections. A source that fails is reported; the others still list. */
export async function loadLabRows(): Promise<{ rows: LabListRow[]; failures: LabLoadFailure[] }> {
  const failures: LabLoadFailure[] = [];
  const rows: LabListRow[] = subjectListRows();

  const workflows = (async () => {
    const seen = new Set<string>();
    for (const kind of ["mine", "orgs", "shared", "system"] as const) {
      const page = await fetchWorkflowBrowsePage(
        { ...DEFAULT_ENTITY_LIST_QUERY, scope: { kind } },
        { sort: "name", direction: "asc", favoritesFirst: false, pageSize: 200 },
      );
      for (const w of page.rows) {
        if (seen.has(w.id)) continue;
        seen.add(w.id);
        rows.push({
          id: `workflow:${w.id}`,
          source: "workflow",
          kind: SOURCE_LABEL.workflow,
          title: w.name || "Workflow",
          type: "workflow",
          subject: w.name || "Workflow",
          detail: w.organization_name || "",
          organizationId: w.organization_id ?? null,
          createdAt: w.created_at ?? null,
          hasScreenshot: false,
        });
      }
    }
  })().catch((e) => failures.push({ source: "Workflows", message: messageOf(e) }));

  const saved = (async () => {
    const { data, error } = await inspections().select(INSPECTION_COLUMNS).order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    rows.push(...groupInspections((data ?? []) as unknown as InspectionRow[]));
  })().catch((e) => failures.push({ source: "Saved inspections", message: messageOf(e) }));

  await Promise.all([workflows, saved]);
  return { rows, failures };
}

async function readJsonFile(fileId: string): Promise<unknown> {
  const blob = await fetchFileBlob(fileId);
  return JSON.parse(await blob.text());
}

/** The first inspection.v1 the measurements hold, with its key — the numbers a reader and the Copy for AI package use. */
export function firstInspection(measurements: unknown): { key: string; inspection: Record<string, unknown> } | null {
  if (!isJsonObject(measurements)) return null;
  if (measurements.schemaVersion === 1 && Array.isArray(measurements.text)) return { key: "", inspection: measurements };
  for (const [key, value] of Object.entries(measurements)) {
    if (isJsonObject(value) && value.schemaVersion === 1 && Array.isArray(value.text)) return { key, inspection: value };
  }
  return null;
}

function issueCountOf(diagnostics: unknown): number {
  return Array.isArray(diagnostics) ? diagnostics.length : 0;
}

async function loadSubject(id: string): Promise<LabSample> {
  const parsed = parseSubjectSampleId(id);
  if (!parsed) throw new Error("That test subject does not exist.");
  const { subject, variant } = parsed;
  const notes: LabLoadNote[] = [];
  const documents: LabDocument[] = [];
  const read = async (label: string, fileId: string | undefined) => {
    if (!fileId) return null;
    try {
      return await readJsonFile(fileId);
    } catch (e) {
      notes.push({ label, reason: messageOf(e) });
      return null;
    }
  };
  const [validate, layout, visualCheck] = await Promise.all([
    read("Engine diagnostics (validate)", variant.fileIds.validate),
    read("Layout receipt", variant.fileIds.layout),
    read("Browser measurements (visual check)", variant.fileIds.visualCheck),
  ]);
  if (layout != null) documents.push({ id: "layout", label: "Layout receipt", value: layout });
  if (visualCheck != null) documents.push({ id: "visual-check", label: "Visual check", value: visualCheck });
  if (variant.agentReport) documents.push({ id: "agent-report", label: "Agent report", value: variant.agentReport });
  if (subject.mermaidReport) documents.push({ id: "mermaid-report", label: "Mermaid report", value: subject.mermaidReport });
  const reportRounds = variant.agentReport && Array.isArray(variant.agentReport.rounds) ? variant.agentReport.rounds : [];
  const rounds: LabRound[] = reportRounds.map((r, i) => ({
    id: `report-${i + 1}`,
    round: isJsonObject(r) && typeof r.round === "number" ? r.round : i + 1,
    createdAt: "",
    spec: null,
    diagnostics: r,
    measurements: null,
    screenshotFileId: null,
    metadata: null,
  }));
  const ok = isJsonObject(validate) ? validate.ok === true : false;
  return {
    id,
    source: "subject",
    title: specTitle(variant.spec, subject.title),
    subject: `${subject.id} ${subject.title}`,
    type: diagramTypeOf(variant.spec),
    spec: variant.spec,
    receipt: layout,
    diagnostics: validate,
    measurements: isJsonObject(visualCheck) ? visualCheck : null,
    verified: ok,
    issues: isJsonObject(validate) && Array.isArray(validate.diagnostics) ? validate.diagnostics.length : 0,
    screenshotFileIds: [],
    mermaid: subject.mermaid ? { source: subject.mermaid, fileId: subject.mermaidFileId } : null,
    rounds,
    documents,
    nodeMap: null,
    organizationId: null,
    createdAt: null,
    notes,
  };
}

async function loadWorkflow(id: string, dispatch: AppDispatch): Promise<LabSample> {
  const definitionId = id.slice("workflow:".length);
  const notes: LabLoadNote[] = [];
  const result = await dispatch(
    callApi({ path: "/workflows/{definition_id}/overview", method: "GET", pathParams: { definition_id: definitionId } }),
  );
  const overview = result.error ? null : parseWorkflowOverview(result.data);
  if (!overview) notes.push({ label: "Overview", reason: result.error?.message || "The overview could not be read." });
  const raw = isJsonObject(result.data) ? result.data : {};
  let rounds: LabRound[] = [];
  try {
    const { data, error } = await inspections()
      .select(INSPECTION_COLUMNS)
      .like("subject_ref", `%${definitionId}%`)
      .order("created_at", { ascending: true });
    if (error) throw error;
    rounds = ((data ?? []) as unknown as InspectionRow[]).map(toRound);
  } catch (e) {
    notes.push({ label: "Saved inspections", reason: messageOf(e) });
  }
  const latest = rounds[rounds.length - 1];
  const documents: LabDocument[] = [];
  const meta = { structure_hash: raw.structure_hash, source: raw.source, regenerated: raw.regenerated };
  if (overview) documents.push({ id: "overview-meta", label: "Overview answer", value: meta });
  return {
    id,
    source: "workflow",
    title: overview ? specTitle(overview.spec, "Workflow overview") : "Workflow overview",
    subject: definitionId,
    type: overview ? "workflow" : null,
    spec: overview?.spec ?? null,
    receipt: null,
    diagnostics: latest?.diagnostics ?? null,
    measurements: latest?.measurements ?? null,
    verified: latest ? issueCountOf(latest.diagnostics) === 0 : false,
    issues: latest ? issueCountOf(latest.diagnostics) : 0,
    screenshotFileIds: rounds.flatMap((r) => (r.screenshotFileId ? [r.screenshotFileId] : [])),
    mermaid: null,
    rounds,
    documents,
    nodeMap: overview?.nodeMap ?? null,
    organizationId: null,
    createdAt: latest?.createdAt ?? null,
    notes,
  };
}

async function loadInspection(id: string): Promise<LabSample> {
  const rowId = id.slice("inspection:".length);
  const { data, error } = await inspections().select(INSPECTION_COLUMNS).eq("id", rowId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("That saved inspection is not readable by you, or it no longer exists.");
  const row = data as unknown as InspectionRow;
  const siblings = await inspections()
    .select(INSPECTION_COLUMNS)
    .eq("subject_type", row.subject_type)
    .eq("subject_ref", row.subject_ref)
    .order("created_at", { ascending: true })
    .limit(200);
  const notes: LabLoadNote[] = [];
  if (siblings.error) notes.push({ label: "Other saved rows of this subject", reason: siblings.error.message });
  const rounds = ((siblings.data ?? [row]) as unknown as InspectionRow[]).map(toRound);
  const spec = isJsonObject(row.spec) ? row.spec : null;
  const isMap = row.subject_type === "visual_map";
  const meta = isJsonObject(row.metadata) ? row.metadata : {};
  const issues = issueCountOf(row.diagnostics);
  return {
    id,
    source: "inspection",
    title: isMap ? specTitle(spec, row.subject_ref) : row.subject_ref,
    subject: row.subject_ref,
    type: isMap ? diagramTypeOf(spec) : null,
    spec,
    receipt: meta.receipt ?? null,
    diagnostics: row.diagnostics,
    measurements: row.measurements,
    verified: issues === 0,
    issues,
    screenshotFileIds: rounds.flatMap((r) => (r.screenshotFileId ? [r.screenshotFileId] : [])),
    mermaid: typeof meta.mermaid === "string" ? { source: meta.mermaid, fileId: null } : null,
    rounds,
    documents: Object.keys(meta).length ? [{ id: "metadata", label: "Row metadata", value: meta }] : [],
    nodeMap: null,
    organizationId: row.organization_id,
    createdAt: row.created_at,
    notes,
  };
}

export async function loadLabSample(id: string, dispatch: AppDispatch): Promise<LabSample> {
  if (id.startsWith("subject:")) return loadSubject(id);
  if (id.startsWith("workflow:")) return loadWorkflow(id, dispatch);
  if (id.startsWith("inspection:")) return loadInspection(id);
  throw new Error("That is not a sample address.");
}

