// Opening a workbook must never write a snapshot (2026-10-10: every open saved a new row, and the extra
// rows made Google linking report "both changed"). These are the mutation ids Univer fires BY ITSELF
// while a workbook opens and recalculates, recorded from a real open; a real edit must still count.
import { isWorkbookSnapshotMutation } from "../isSnapshotMutation";

const MUTATION = 2;
const mutation = (id: string) => ({ id, type: MUTATION });

describe("the workbook's dirty filter", () => {
  test.each([
    "formula.mutation.set-trigger-formula-calculation-start",
    "formula.mutation.set-formula-calculation-start",
    "formula.mutation.set-formula-calculation-notification",
    "formula.mutation.set-formula-calculation-result",
    "doc.mutation.rich-text-editing",
  ])("%s on open does not mark the workbook dirty", (id) => {
    expect(isWorkbookSnapshotMutation(mutation(id))).toBe(false);
  });

  test.each([
    "sheet.mutation.set-range-values",
    "sheet.mutation.set-worksheet-name",
    "sheet.mutation.insert-row",
    "sheet.mutation.set-worksheet-col-width",
  ])("%s, a real edit, still does", (id) => {
    expect(isWorkbookSnapshotMutation(mutation(id))).toBe(true);
  });

  test("a command that is not a mutation never does", () => {
    expect(isWorkbookSnapshotMutation({ id: "sheet.command.set-range-values", type: 0 })).toBe(false);
  });
});
