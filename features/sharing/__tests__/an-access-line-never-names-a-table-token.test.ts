/**
 * The Access tab read "Every member of that organization can open this udt document" — the raw
 * entity token leaked into a sentence a person reads. It now names the record the way the share
 * dialog title does ("document", "workbook").
 */
import { accessReasonRows } from "@/features/sharing/format";
import type { AccessSummary } from "@/features/sharing/service/accessSummary";

const summary = {
  entityType: "udt_document",
  orgReadable: true,
  organizationName: "Holloway Creative",
  directGrantCount: 0,
  directGrants: [],
  containers: [],
} as unknown as AccessSummary;

describe("an access line never names a table token", () => {
  it("udt_document reads document", () => {
    const [row] = accessReasonRows(summary, "udt_document");
    expect(row.detail).toBe("Every member of that organization can open this document");
    expect(row.detail).not.toMatch(/udt/);
  });
  it("workbook reads workbook", () => {
    const [row] = accessReasonRows({ ...summary, entityType: "workbook" } as AccessSummary, "workbook");
    expect(row.detail).toMatch(/this workbook$/);
  });
});
