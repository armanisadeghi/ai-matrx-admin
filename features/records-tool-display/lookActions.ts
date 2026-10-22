/**
 * lookActions — what a background `notion_sync` look IS, from the run itself (lane W2, 2026-10-21).
 *
 * A records `notion_sync` call that cannot answer inside the dispatch ceiling (a whole-Notion preview, a find,
 * Sync now …) runs on as a run of the Notion IMPORT workflow. The run records which action it does: its input
 * `root` is `look:<action>` (aidream `notion_import.look_action`). Before this, the card and the run window
 * called every one of them "Notion import · Bring Notion in as tables · 0 tables moved". Pure: no React, no Redux.
 *
 * The server's finished output carries its own `look_summary` (title + counts); this table is the words for a run
 * that is still going, and for a run that predates the summary.
 */

export type LookAction =
  | "preview" | "import_start" | "import" | "find" | "table_sync" | "page_sync" | "mapping_preview" | "mapping" | "sync";

export const LOOK_ACTIONS: Record<LookAction, { title: string; movesSomething: boolean }> = {
  preview: { title: "Mapping your Notion", movesSomething: false },
  import_start: { title: "Starting the whole-Notion import", movesSomething: true },
  import: { title: "Starting a Notion import", movesSomething: true },
  find: { title: "Searching your Notion", movesSomething: false },
  table_sync: { title: "Syncing a table from Notion", movesSomething: true },
  page_sync: { title: "Syncing a page from Notion", movesSomething: true },
  mapping_preview: { title: "Previewing a copy from Notion", movesSomething: false },
  mapping: { title: "Copying from Notion", movesSomething: true },
  sync: { title: "Syncing from Notion", movesSomething: true },
};

/** The action a run's input names, or null when the run is not a look (a real import, a copy, anything else). */
export function lookActionOf(input: Record<string, unknown> | null | undefined): LookAction | null {
  const root = typeof input?.root === "string" ? input.root.trim() : "";
  if (root === "look") return "sync"; // started before the run recorded its action
  if (!root.startsWith("look:")) return null;
  const action = root.slice("look:".length);
  return action in LOOK_ACTIONS ? (action as LookAction) : "sync";
}

/** The step's name in the run window for a look run; null for any run that really is an import. */
export function lookStepTitle(input: Record<string, unknown> | null | undefined): string | null {
  const action = lookActionOf(input);
  if (!action) return null;
  return lookTitle(input, action);
}

/** The run's title: the action's own words; for a run started before the action was recorded, the label it was given. */
export function lookTitle(input: Record<string, unknown> | null | undefined, action: LookAction): string {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  return input?.root === "look" && name ? name : LOOK_ACTIONS[action].title;
}
