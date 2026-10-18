/**
 * NARROW-FIXES item 3: a form archived from the Data home was never listed again. The archived read now
 * follows the portals with `custom.forms_archived_everywhere`; each form is a row of its own kind with Restore.
 * Break named: before, readArchivedDataHomePage ended with tables and portals only.
 */
import { archivedFormRow } from "../dataHomeRows";
import { readArchivedDataHomePage } from "../dataHomeArchived";

const form = (over = {}) => ({
  form_id: "f1", table_id: "t1", table_name: "Interactions", kind: "form" as const, title: "Summer hours request",
  archived_at: "2026-10-02T06:00:00Z", table_archived: false, can_restore: true, organization_id: "o1", organization_name: "Cedar Ridge", ...over,
});

it("a form row is a form, archived, in its organization, opening its table's forms rail", () => {
  const row = archivedFormRow(form());
  expect(row).toMatchObject({ kind: "form", archived: true, itemId: "f1", tableId: "t1", organizationId: "o1", name: "Summer hours request", parentName: "Interactions" });
  expect(row.href).toBe("/data/t1?rail=forms");
  expect(archivedFormRow(form({ kind: "booking", title: null })).name).toBe("Book a time");
});

it("the archived read lists archived forms after tables and portals, newest first", async () => {
  const rpc = async (fn: string) => {
    if (fn === "archived_tables_everywhere") return { data: { tables: [] }, error: null };
    if (fn === "list_portals_everywhere") return { data: { portals: [] }, error: null };
    if (fn === "forms_archived_everywhere")
      return { data: { forms: [form({ form_id: "old", archived_at: "2026-10-01T00:00:00Z" }), form({ form_id: "new", archived_at: "2026-10-09T00:00:00Z" })] }, error: null };
    return { data: null, error: { message: `unexpected ${fn}` } };
  };
  const page = await readArchivedDataHomePage({ rpc } as never, { offset: 0, limit: 100 });
  expect(page.ended).toBe(true);
  expect(page.rows.map((r) => r.itemId)).toEqual(["new", "old"]);
});

import { formRestoreBlockedReason } from "../dataHomeRows";

it("a form the store will not restore says why instead of offering a Restore that refuses", () => {
  expect(formRestoreBlockedReason(form())).toBeNull();
  expect(formRestoreBlockedReason(form({ can_restore: false, table_archived: true }))).toBe("Restore its table first");
  expect(formRestoreBlockedReason(form({ can_restore: false, table_archived: false }))).toBe("Only an admin of its table can restore it");
  expect(archivedFormRow(form({ can_restore: false, table_archived: true })).restoreBlockedReason).toBe("Restore its table first");
  expect(archivedFormRow(form()).restoreBlockedReason).toBeUndefined();
});
