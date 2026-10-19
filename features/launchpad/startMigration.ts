// features/launchpad/startMigration.ts — THE START PAGE MOVES INTO LAUNCHPADS (custom-experience §5.2: "this IS
// the Start system grown up").
//
// On a person's first launchpad visit, their Start page (`start_layout`, newest row across their
// organizations) is written as their `start` launchpad, same widgets in the same order. A person who never
// had one gets today's first-visit layout (plus the data page they once chose as their start page). The
// `start_layout` / `start_page` rows are left in the store untouched (data deletion is not this lane's);
// their table definitions live in ./start-move/ only so this move can read them. Announced in the console.
import { listAppRows, upsertAppRow, type useRecordsClient } from "@ai-matrx/records/react";
import { launchpadSlot, launchpadTable, personOwner } from "./launchpad.typed-table";
import { addWidget, launchpadFromStartDoc, readStartDoc, serializeLaunchpadDoc } from "./doc";
import { startLaunchpadDoc } from "./templates";
import { startLayoutTable } from "./start-move/startLayout.typed-table";
import { startPageChoice } from "./start-move/startPage.typed-table";

type RecordsClient = ReturnType<typeof useRecordsClient>;

const newest = <R extends { person: string | null }>(rows: readonly R[], userId: string, at: (r: R) => string | null) =>
  rows.filter((r) => r.person === userId).sort((a, b) => (at(b) ?? "").localeCompare(at(a) ?? ""))[0] ?? null;

/** Write the person's `start` launchpad from their Start page (or the first-visit layout). */
export async function moveStartPageOnce(args: { client: RecordsClient; userId: string; organizationId: string }): Promise<{ ok: boolean }> {
  const { client, userId, organizationId } = args;
  const [layouts, choices] = await Promise.all([listAppRows(client, startLayoutTable), listAppRows(client, startPageChoice)]);
  const layout = layouts.ok ? newest(layouts.data.rows, userId, (r) => r.saved_at ?? null) : null;
  const choice = choices.ok ? newest(choices.data.rows, userId, (r) => r.chosen_at ?? null) : null;
  const start = layout ? readStartDoc(layout.doc) : null;
  let doc = start ? launchpadFromStartDoc(start) : startLaunchpadDoc();
  if (!start && choice?.page_id) doc = addWidget(doc, { type: "page", config: { pageId: choice.page_id }, w: 12 });
  const note = start ? "Moved from your Start page" : "Starting launchpad";
  console.info(
    `[launchpad] ${start ? `moving your Start page (${start.widgets.length} widgets) into` : "writing your first"} launchpad "start"`,
    { from: layout ? { record: layout._id, organization: layout._organizationId } : null },
  );
  const owner = personOwner(userId);
  // org-filter: write-target — the Start row's own organization when it exists, else where new things are saved.
  const answer = await upsertAppRow(
    client,
    launchpadTable,
    { slot: launchpadSlot(owner, "start"), key: "start", title: "Start", owner, doc: serializeLaunchpadDoc(doc), note, saved_at: new Date().toISOString() },
    { organizationId: layout?._organizationId ?? organizationId },
  );
  if (!answer.ok) console.error("[launchpad] the Start move failed", answer.error);
  return { ok: answer.ok };
}
