/**
 * EVERY CRUMB IS A DOOR (Arman, 2026-10-22): on /pdf/<file> the PDF's crumb opens the person's other
 * PDFs — the picker's own list (PDFs only, system files hidden, newest first, capped), each opening in
 * the workspace. Before: the record crumb had no door at all (`record-without-siblings`).
 */
import { describe, expect, it } from "@jest/globals";
import type { CloudFileRecord } from "@/features/files/types";
import { SIBLINGS_MAX } from "@/features/shell/breadcrumbs/record-siblings";
import { pdfSiblings } from "../pdfSiblings";

function file(i: number, name: string, mimeType: string, metadata: Record<string, unknown> | null = null): CloudFileRecord {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    fileName: name,
    filePath: `My Files/${name}`,
    mimeType,
    fileSize: 120_000,
    updatedAt: new Date(Date.UTC(2026, 9, 1) + i * 60_000).toISOString(),
    deletedAt: null,
    metadata,
    organizationId: null,
    source: { kind: "real" },
  } as unknown as CloudFileRecord;
}

describe("the PDF record crumb's door", () => {
  const lease = file(1, "Lease 2026.pdf", "application/pdf");
  const invoice = file(2, "Invoice 0042.pdf", "application/pdf");
  const photo = file(3, "Storefront.jpg", "image/jpeg");
  const system = file(4, "extracted-page-3.pdf", "application/pdf", { system_artifact: true });

  it("lists only the person's PDFs, newest first, each opening in the workspace", () => {
    const options = pdfSiblings([lease, photo, invoice, system, undefined], lease.id);
    expect(options.map((o) => o.label)).toEqual(["Invoice 0042.pdf", "Lease 2026.pdf"]);
    expect(options[0].href).toBe(`/pdf/${invoice.id}`);
    expect(options.find((o) => o.active)?.label).toBe("Lease 2026.pdf");
  });

  it("is capped like every door", () => {
    const many = Array.from({ length: SIBLINGS_MAX + 20 }, (_, i) => file(100 + i, `Scan ${i}.pdf`, "application/pdf"));
    expect(pdfSiblings(many, many[0].id)).toHaveLength(SIBLINGS_MAX);
  });
});
