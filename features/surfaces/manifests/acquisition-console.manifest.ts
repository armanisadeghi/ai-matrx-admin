/**
 * Surface manifest — Acquisition console (`matrx-user/acquisition-console`), route `/acquisition`.
 *
 * One screen per expert being onboarded: what we already have from them, what they are connected
 * through, and what is stuck with the one thing that unsticks it. Every number is counted on the page
 * from existing registers (nothing stored). Emitter: `AcquisitionConsolePage`
 * (`features/acquisition-console/`).
 *
 * Parent: Knowledge (domain tree: knowledge › ingestion (acquisition-console)).
 * Write target: `acquisition_rulebook` — a VIEW change (narrow to one rulebook's sources); nothing is
 * saved. Connecting accounts and unsticking rows open their own screens and stay the person's.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ACQUISITION_SURFACE_NAME = "matrx-user/acquisition-console";

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  autoContext: true,
  typicalCharCount: 30,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("acquisition_load_status", "Load status", "string", 100, '"loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 7 }),
  v("acquisition_failure", "Why it failed", "string", 105, "The database's refusal, when the read failed.", { autoContext: false, typicalCharCount: 120 }),
  v("acquisition_org_filter", "Organization filter", "string", 110, "The organization the console is narrowed to; null = all organizations.", { autoContext: false, typicalCharCount: 36 }),
  v("acquisition_rulebook", "Rulebook", "object", 120, "The rulebook the console is narrowed to: { id, name }; null = every source.", { typicalCharCount: 60 }),
  v("acquisition_rulebooks", "Rulebooks", "array", 130, "The rulebooks it can narrow to: { id, name, source_count }.", { typicalCharCount: 500 }),
  v("acquisition_have_count", "Sources we have", "number", 140, "How many sources we already have from the expert.", { typicalCharCount: 3 }),
  v("acquisition_have", "What we have", "array", 150, "The sources we already have (first 40): { id, origin (library | rulebook), kind, … as the table shows }.", {
    typicalCharCount: 2500,
    inlineUpTo: 4000,
  }),
  v("acquisition_connected", "Connected through", "array", 160, "Their connections (first 30): { id, provider, ownerScope, status, account, lastSync, action, href, note }.", {
    typicalCharCount: 1500,
    inlineUpTo: 3000,
  }),
  v("acquisition_blocked_count", "Stuck", "number", 170, "How many things are stuck.", { typicalCharCount: 3 }),
  v("acquisition_blocked", "What is stuck", "array", 180, "Stuck rows (first 30): { id, origin (block | handoff), what, where, … and the one action that unsticks it }.", {
    typicalCharCount: 1500,
    inlineUpTo: 3000,
  }),
  v("acquisition_problems", "Problems", "array", 190, "One sentence per row the page refused to render, plus any read cap hit.", { typicalCharCount: 200 }),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "acquisition_rulebook",
    label: "Narrow to a rulebook",
    description:
      'Show only one rulebook\'s sources (a view change; nothing is saved). Value is an id from acquisition_rulebooks, or "all" for every source. Refused: an id that is not listed.',
    valueType: "string",
    mode: "ui",
    applyPolicy: "ask",
    updatesValue: "acquisition_rulebook",
    sortOrder: 300,
  },
];

const declared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: ACQUISITION_SURFACE_NAME,
  situation:
    "They are onboarding an expert on the acquisition console: {acquisition_have_count|no} sources so far, {acquisition_blocked_count|nothing} stuck. You can narrow it to one rulebook.",
  inheritsFrom: "matrx-default/knowledge",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Acquisition console",
  description: "What we have from an expert, what they are connected through, and what is stuck.",
  urlPattern: "/acquisition",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

/** No typed `readiness` (D2: earned, never typed). The installed `@ai-matrx/chat` type still
 * requires the key until the D2 package change ships, hence the one cast. */
export const acquisitionConsoleManifest = declared as SurfaceManifest;

export function createAcquisitionConsoleScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
