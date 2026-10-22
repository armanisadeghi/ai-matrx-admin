/**
 * Surface manifest — a pick list's own page (`matrx-user/pick-lists`).
 *
 * WHERE THIS MOUNTS: `/pick-lists/[id]` → `StoreListPage` mounts
 * `<SurfaceRuntimeProvider surfaceName="matrx-user/pick-lists">` around both views, with the scope
 * built by `features/data-tables/pick-lists/pickListPageScope.ts` from the list the page already
 * read (one read, shared by the Choices view and the scope). In the Table view the store's table
 * page mounts `matrx-user/data-tables` INSIDE it, so there the deeper table surface answers (the
 * registry resolves deepest-first) — the right surface for a grid.
 *
 * SAME TARGETS AS THE LIST MANAGER WINDOW (`matrx-user/pick-list-manager`): both import
 * `LIST_SURFACE_WRITE_TARGETS` and build handlers with `buildListSurfaceWriteHandlers`, so an agent
 * meets one vocabulary for one list. Removing a choice ARCHIVES it (`delete_list_items`), exactly as
 * the page's own Archive button does; a list is never deleted from here. Visibility stays
 * human-only (a permission change, not a content edit).
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import {
  LIST_SURFACE_WRITE_TARGETS,
  LIST_VISIBILITY_ENUM_TEXT,
} from "@/features/data-tables/pick-lists/surface-write-targets";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "active_list",
    label: "Active list",
    sortOrder: 200,
    description: "Identity and metadata of the list open at this route.",
  },
  {
    key: "list_items",
    label: "List items",
    sortOrder: 300,
    description: "The items of the list open at this route.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  // ── Active list ───────────────────────────────────────────────────────
  {
    name: "active_list_id",
    label: "Active list ID",
    description:
      "UUID of the list open at this route — the `[id]` segment of /pick-lists/[id]. Always present.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 36,
    sortOrder: 300,
    group: "active_list",
  },
  {
    name: "active_list_name",
    label: "Active list name",
    description: "Name of the list open at this route.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 80,
    sortOrder: 310,
    group: "active_list",
  },
  {
    name: "active_list_description",
    label: "Active list description",
    description:
      "Description of the list open at this route. Empty when the list has none.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 300,
    inlineUpTo: 2000,
    sortOrder: 320,
    group: "active_list",
  },
  {
    name: "active_list_url",
    label: "Link to this list",
    description:
      "The path of the list open at this route (/pick-lists/<id>). Use it when writing a reference to this list somewhere else.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 60,
    sortOrder: 315,
    group: "active_list",
  },
  {
    name: "active_list_item_count",
    label: "List item count",
    description:
      "Number of items in the list open at this route. Zero when the list is empty.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 5,
    sortOrder: 325,
    group: "active_list",
  },
  {
    name: "active_list_group_count",
    label: "List group count",
    description:
      "Number of distinct group headings the items are filed under, counting \"Ungrouped\". Zero when the list is empty.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    sortOrder: 326,
    group: "active_list",
  },
  {
    name: "active_list_created_at",
    label: "List created at",
    description:
      "ISO-8601 timestamp of when this list was created. Not shown on the page; available for an agent that needs to reason about age.",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: false,
    typicalCharCount: 30,
    sortOrder: 327,
    group: "active_list",
  },
  {
    name: "active_list_updated_at",
    label: "List last updated at",
    description:
      "ISO-8601 timestamp of the last edit to the list's own name/description. Absent when the list has never been edited since creation. Item edits do not move it.",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: false,
    typicalCharCount: 30,
    sortOrder: 328,
    group: "active_list",
  },
  {
    name: "list_visibility",
    label: "List visibility",
    description:
      // Interpolated from LIST_VISIBILITY_VALUES — the same constant
      // `getListVisibility` produces — so the vocabulary an agent reads is the
      // vocabulary this page emits, and the two cannot drift.
      `Who can reach this list: one of ${LIST_VISIBILITY_ENUM_TEXT}. "public" is readable by anyone, "authenticated" by any signed-in user, "private" by the owner alone. Read-only here — changing visibility is a permission change and stays human-only.`,
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 14,
    sortOrder: 330,
    group: "active_list",
  },
  {
    name: "list_is_owner",
    label: "Viewer owns this list",
    description:
      "True when the signed-in viewer created this list. Edits follow the viewer's access to the list, not ownership alone: when the store refuses a write, the refusal is reported back to you.",
    valueType: "boolean",
    alwaysAvailable: false,
    typicalCharCount: 5,
    sortOrder: 335,
    group: "active_list",
  },

  {
    name: "list_view",
    label: "Page view",
    description:
      'Which view of the list is showing: "choices" (one editable row per choice) or "table" (the list as a store table, where the data-tables surface answers).',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 7,
    sortOrder: 301,
    group: "active_list",
  },
  {
    name: "list_load_state",
    label: "List load state",
    description:
      'Whether the list has been read: "loading", "ready" or "error". Every list value below is absent until "ready".',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 7,
    sortOrder: 302,
    group: "active_list",
  },
  {
    name: "list_load_error",
    label: "List load error",
    description: 'Why the list could not be read — the same message the page shows. Present only when list_load_state is "error".',
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 160,
    sortOrder: 303,
    group: "active_list",
  },
  {
    name: "pick_list_bundle",
    label: "Pick list (up front)",
    description:
      "The list as one XML bundle: name, visibility, description and every choice (id, label, group, hint, description; first 60). Read this first; all_items holds every choice.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    sortOrder: 304,
    group: "active_list",
  },

  // ── List items ────────────────────────────────────────────────────────
  {
    name: "all_items",
    label: "All items",
    description:
      "Array of { id, label, description, help_text, group } for every item in the list. Empty array when the list has no items.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    sortOrder: 360,
    group: "list_items",
  },
  {
    name: "items_grouped",
    label: "Items grouped",
    description:
      "Object keyed by group name, each value an array of items in that group — the same items as all_items in their grouped shape. Ungrouped items file under \"Ungrouped\".",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    autoContext: false,
    sortOrder: 370,
    group: "list_items",
  },
  {
    name: "list_group_names",
    label: "Group names",
    description:
      'The group headings of this list, in the order they are rendered — the exact strings to reuse for an item\'s `group`. Includes "Ungrouped" when ungrouped items exist. Empty array when the list has no items.',
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 120,
    sortOrder: 355,
    group: "list_items",
  },
  {
    name: "selected_item_id",
    label: "Focused item ID",
    description:
      "ID of the choice the person last put the cursor in on the Choices view. Absent when none.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 36,
    sortOrder: 340,
    group: "list_items",
  },
  {
    name: "selected_item_label",
    label: "Focused item label",
    description:
      "Label of the focused choice. Absent when there is no focused choice.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 120,
    sortOrder: 345,
    group: "list_items",
  },
  {
    name: "selected_item_description",
    label: "Focused item description",
    description:
      "Description of the focused choice. Absent when there is no focused choice, or it has no description.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 500,
    inlineUpTo: 2000,
    sortOrder: 350,
    group: "list_items",
  },
];

export const listsManifest: SurfaceManifest = {
  surfaceName: "matrx-user/pick-lists",
  situation:
    "They have a pick list open: {active_list_name|name not loaded yet}, with {active_list_item_count|no} choices, shown in the {list_view} view. They can rename it, rewrite its description, and add, edit or archive its choices.",
  inheritsFrom: "matrx-default/data",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "A pick list's own page (/pick-lists/<id>): its name, description and choices; add, edit and archive choices, rename and re-describe the list.",
  readiness: "partial",
  readinessNote:
    "page-pass 2026-10-22: the route page now mounts this surface (it mounted nothing before), with the up-front bundle, load state, focused choice and delete_list_items (archive). Not yet proven with a live agent run on this route (probe pending the release carrying the window hooks); phone and dark looked at statically.",
  label: "Pick list",
  urlPattern: "/pick-lists/[id]",
  intro: `<surface_intro>
You are on ONE pick list's page (/pick-lists/[id]): a named set of choices people pick from in dropdowns, forms and agent variables. Read pick_list_bundle first; all_items has every choice with its id. If list_load_state is not "ready", the list has not been read yet (or list_load_error says why) and there is nothing to edit.

Changes go through these targets; each saves to the database once the person approves:
- active_list_name / active_list_description — rename the list or replace its description.
- add_list_items — add choices (array); read all_items first so nothing is added twice.
- update_list_item — change ONE choice by id (label, description, help_text, group).
- delete_list_items — archive choices by id (array). Archived choices stay restorable and records that hold one keep it.
You cannot delete the list itself or change who can see it (list_visibility); describe that and let the person do it.

list_view "table" means the person is on the Table view, where the data-tables surface answers for the grid.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(
    pickBaseline("selection", "content", "context"),
    surfaceSpecific,
  ),
  writeTargets: LIST_SURFACE_WRITE_TARGETS,
};

/** One item entry as emitted in the `all_items` surface value. */
export interface ListsItemEntry {
  id: string;
  label: string;
  description: string | null;
  help_text: string | null;
  group: string;
}

/**
 * Type-safe payload helper — the "a UI cannot lie" enforcement.
 * Required keys ↔ every `alwaysAvailable: true` value above; every list value
 * is optional because it is omitted until the list has been read.
 */
export function createListsScope(values: {
  active_list_id: string;
  active_list_url: string;
  list_view: "choices" | "table";
  list_load_state: "loading" | "ready" | "error";
  list_load_error?: string;
  pick_list_bundle?: string;
  active_list_name?: string;
  active_list_item_count?: number;
  active_list_group_count?: number;
  active_list_created_at?: string;
  list_visibility?: string;
  list_is_owner?: boolean;
  all_items?: ListsItemEntry[];
  items_grouped?: Record<string, unknown>;
  list_group_names?: string[];
  active_list_description?: string;
  active_list_updated_at?: string;
  selected_item_id?: string;
  selected_item_label?: string;
  selected_item_description?: string;
  selection?: string;
  text_before?: string;
  text_after?: string;
  content?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
