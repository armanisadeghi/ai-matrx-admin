/**
 * Surface manifest — Term lists (`matrx-user/term-lists`), route `/resources/term-lists`
 * (`?id=` opens one list in the editor beside the list).
 *
 * Organization glossaries agents receive when they translate, speak or transcribe: how a term is
 * translated, kept as is, or pronounced. Emitters: `TermListsWorkspace` (provider: the lists) and
 * `TermListEditor` (contributes the open list as edited and registers the two draft targets) in
 * `features/agents/term-lists/components/TermListsWorkspace.tsx`.
 *
 * Parent: Agents — a term list attaches to an agent from its builder.
 * Write targets land in the editor only; NOTHING is saved until the person presses Save. NOT writable:
 * creating, renaming or archiving a list (the person's buttons), removing entries.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const TERM_LISTS_SURFACE_NAME = "matrx-user/term-lists";

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "term_lists_load_status",
    label: "Load status",
    description: '"loading", "loaded" or "failed".',
    valueType: "string",
    alwaysAvailable: true,
    autoContext: true,
    typicalCharCount: 7,
    sortOrder: 100,
  },
  {
    name: "term_lists",
    label: "Term lists",
    description: "The organization's term lists (first 50): { id, name, modalities (translation | pronunciation | transcription), entry_count }.",
    valueType: "array",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 1500,
    inlineUpTo: 1500,
    sortOrder: 110,
  },
  {
    name: "open_term_list_id",
    label: "Open list ID",
    description: "The list open in the editor, or null.",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 36,
    sortOrder: 120,
  },
  {
    name: "open_term_list",
    label: "Open list",
    description:
      "The open list as edited (unsaved edits included): { name, modalities, source_language, entries [{ term, kind (translate | do_not_translate | pronounce | …), value, language, case_sensitive }], unsaved_changes, problems (what stops Save) }.",
    valueType: "object",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 3000,
    inlineUpTo: 5000,
    sortOrder: 130,
  },
  {
    name: "term_list_notes",
    label: "Notes",
    description: "The open list's notes: audience and brand notes, never translated or spoken.",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 200,
    inlineUpTo: 1000,
    sortOrder: 140,
  },
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "add_term_entries",
    label: "Add terms",
    description:
      'Add entries to the open list for the person to review; NOTHING is saved until they press Save. Value is a JSON ARRAY of 1-200 objects, each { "term": string (required), "kind": "translate" | "do_not_translate" | "pronounce" | another kind the page lists (required), "value"?: the translation or pronunciation, "language"?: language code, "case_sensitive"?: boolean }. Entries are added at the end; the page flags duplicates and missing values. Refused (nothing changes): no list open, a missing term, an unknown kind.',
    valueType: "array",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "open_term_list",
    sortOrder: 300,
  },
  {
    name: "term_list_notes",
    label: "Write the notes",
    description:
      "Fill the open list's notes (audience and brand notes agents read; never translated or spoken). NOTHING is saved until the person presses Save. Refused: no list open.",
    valueType: "string",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "term_list_notes",
    patchable: true,
    sortOrder: 310,
  },
];

const declared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: TERM_LISTS_SURFACE_NAME,
  situation:
    "They are managing their organization's term lists for agents; {open_term_list_id|no list} is open. You can add terms or write the notes of the open list; they save it.",
  inheritsFrom: "matrx-default/agents",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Term lists",
  description: "Organization glossaries agents use to translate, pronounce or transcribe terms.",
  urlPattern: "/resources/term-lists",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

/** No typed `readiness` (D2: earned, never typed). The installed `@ai-matrx/chat` type still
 * requires the key until the D2 package change ships, hence the one cast. */
export const termListsManifest = declared as SurfaceManifest;

export function createTermListsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
