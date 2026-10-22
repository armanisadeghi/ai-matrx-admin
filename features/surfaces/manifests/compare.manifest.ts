/**
 * Surface manifest — Compare (`/compare`, `matrx-user/compare`).
 *
 * The comparison engine's workspace: what kind of thing is compared, the
 * one-line ask, the lineup of contenders, found candidates, a run's progress
 * and its side-by-side result. Emitter + handlers: `CompareBody` in
 * `features/comparison/ComparePage.tsx` (also the guest workspace on the same
 * address).
 *
 * Writes only change the lineup being built (mode `ui`). Running a comparison
 * spends points and stays the person's button: there is no target for it, and
 * cards an agent fills wait for their own lookup.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const COMPARE_SURFACE_NAME = "matrx-user/compare" as const;
/** Mirrors `MAX_ROWS` in `features/comparison/rows.ts` (a manifest stays import-light). */
export const COMPARE_MAX_LINEUP = 5;

const groups: SurfaceValueGroup[] = [
  { key: "compare_setup", label: "Setup", sortOrder: 100, description: "What is compared and how it was asked." },
  { key: "compare_lineup", label: "Lineup", sortOrder: 200, description: "The contenders and found candidates." },
  { key: "compare_run", label: "Run", sortOrder: 300, description: "A run's progress and its result." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("phase", "Stage", "string", "compare_setup", 100, '"build" (making the lineup), "running", "result" or "failed".', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("compare_kind", "Comparing", "string", "compare_setup", 110, "The key of what is compared (one of kind_choices)."),
  v("compare_kind_label", "Comparing (name)", "string", "compare_setup", 111, "What is compared, in words."),
  v("kind_choices", "Kinds", "array", "compare_setup", 112, "The kinds that can be compared now: { key, label }.", {
    typicalCharCount: 200,
  }),
  v("ask_text", "Ask", "string", "compare_setup", 120, "The one-line ask as typed: a list of names, or a request like best bike shops in Bend.", {
    alwaysAvailable: true,
    typicalCharCount: 60,
    inlineUpTo: 1000,
  }),
  v("ask_mode", "Ask reads as", "string", "compare_setup", 121, '"find" (look for candidates) or "compare" (a list of names).'),
  v("near", "Near", "string", "compare_setup", 122, "The shared place every card without its own city uses.", { typicalCharCount: 20, inlineUpTo: 200 }),
  v("search_scope", "Search area", "string", "compare_setup", 123, '"auto", "local" or "nationwide".'),
  v("lineup", "Lineup", "array", "compare_lineup", 200, 'Each card: { name, city, website, state ("idle" | "resolving" | "found" | "choose" | "not_found" | "error"), matched_name (the real thing it found), message }.', {
    typicalCharCount: 500,
  }),
  v("found_candidates", "Found candidates", "array", "compare_lineup", 210, "Candidates found for a request, shown to pick from: { rank, name, detail, in_lineup }.", {
    typicalCharCount: 800,
  }),
  v("run_id", "Run ID", "string", "compare_run", 300, "The id of the run on screen (also in the address as ?run=).", { typicalCharCount: 36 }),
  v("progress", "Progress", "array", "compare_run", 310, "While running, each item: { label, stage, done, error }.", { typicalCharCount: 400 }),
  v("result_fields", "Compared on", "array", "compare_run", 320, "The facts the result compares: { key, label }.", { typicalCharCount: 300 }),
  v("result_items", "Result", "array", "compare_run", 330, "Ranked items: { rank, name, website, error, values: { fact label: shown value } }.", {
    typicalCharCount: 2500,
  }),
  v("result_notices", "Result notes", "array", "compare_run", 340, "Notes the result shows.", { typicalCharCount: 200 }),
  v("failure", "Failure", "string", "compare_run", 350, "Why the run failed, as the page says it.", { typicalCharCount: 80 }),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "ask_text",
    label: "Ask",
    description:
      "Replaces the one-line ask. Value: a plain string: names separated by commas or \"vs\", or a request like \"best bike shops in Bend\". Nothing runs: the person presses Find or Fill. Refused unless the page is building a lineup (phase \"build\").",
    valueType: "string",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: "ask_text",
    mode: "ui",
    applyPolicy: "ask",
    group: "compare_setup",
    sortOrder: 400,
  },
  {
    name: "near",
    label: "Near",
    description:
      "Sets the shared place every card without its own city uses. Value: a plain string (an empty string clears it). Refused unless the page is building a lineup.",
    valueType: "string",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: "near",
    mode: "ui",
    applyPolicy: "ask",
    group: "compare_setup",
    sortOrder: 410,
  },
  {
    name: "compare_kind",
    label: "Comparing",
    description:
      "Switches what is compared. Value: a key from kind_choices. It empties the lineup. Refused unless the page is building a lineup.",
    valueType: "string",
    updatesValue: "compare_kind",
    mode: "ui",
    applyPolicy: "ask",
    group: "compare_setup",
    sortOrder: 420,
  },
  {
    name: "lineup",
    label: "Lineup",
    description: `Replaces the lineup cards. Value: a JSON ARRAY of 2-${COMPARE_MAX_LINEUP} objects, each { "name": string (required unless website is given), "city"?: string, "website"?: string }. Each card then waits for its lookup; nothing is compared or spent until the person presses Compare. Refused (nothing changes): fewer than 2 or more than ${COMPARE_MAX_LINEUP} cards, a card with neither name nor website, or a page not building a lineup.`,
    valueType: "array",
    updatesValue: "lineup",
    mode: "ui",
    applyPolicy: "ask",
    group: "compare_lineup",
    sortOrder: 430,
  },
];

const declared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: COMPARE_SURFACE_NAME,
  situation:
    "They are comparing {compare_kind_label|things} side by side (stage: {phase|build}); the ask is \"{ask_text|empty}\".",
  inheritsFrom: "matrx-default/knowledge",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Compare",
  description: "Lines up companies, places or products and compares their real facts side by side.",
  urlPattern: "/compare",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

/** No typed `readiness` (D2: earned, never typed). The installed `@ai-matrx/chat` type still
 * requires the key until the D2 package change ships, hence the one cast. */
export const compareManifest = declared as SurfaceManifest;

export function createCompareScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

/** Parse a lineup write: 2-5 cards, each naming a thing. */
export function parseCompareLineup(value: unknown): { name: string; city: string; website: string }[] {
  if (!Array.isArray(value)) throw new Error("Send a JSON array of cards.");
  if (value.length < 2 || value.length > COMPARE_MAX_LINEUP) {
    throw new Error(`Send between 2 and ${COMPARE_MAX_LINEUP} cards.`);
  }
  return value.map((card, index) => {
    if (typeof card !== "object" || card === null || Array.isArray(card)) throw new Error(`Card ${index + 1} must be an object.`);
    const { name, city, website } = card as Record<string, unknown>;
    for (const [key, field] of Object.entries({ name, city, website })) {
      if (field !== undefined && field !== null && typeof field !== "string") throw new Error(`Card ${index + 1}: "${key}" must be a string.`);
    }
    const out = { name: (name as string | undefined)?.trim() ?? "", city: (city as string | undefined)?.trim() ?? "", website: (website as string | undefined)?.trim() ?? "" };
    if (!out.name && !out.website) throw new Error(`Card ${index + 1} needs a name or a website.`);
    return out;
  });
}
