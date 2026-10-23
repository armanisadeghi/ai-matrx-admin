import type { CloudFileRecord } from "@/features/files/types";
import { pdfFileRows, type PdfFileDoc } from "../pdfFileRows";

const file = (over: Partial<CloudFileRecord> & { id: string; fileName: string }): CloudFileRecord =>
  ({
    ownerId: "u1", filePath: `docs/${over.fileName}`, mimeType: "application/pdf", fileSize: 10,
    createdAt: "2026-10-22T10:00:00Z", updatedAt: "2026-10-22T10:00:00Z", deletedAt: null, ...over,
  }) as unknown as CloudFileRecord;

describe("pdfFileRows (Your PDFs lists PDF files, not processed documents)", () => {
  it("a just-uploaded PDF with no extraction appears, marked Not extracted", () => {
    const rows = pdfFileRows({ f1: file({ id: "f1", fileName: "fresh.pdf" }) }, new Map());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "f1", name: "fresh.pdf", textStatus: "none", docId: null, archived: false });
  });

  it("a PDF with a processed document is Text ready and carries its page count", () => {
    const docs = new Map<string, PdfFileDoc>([["f1", { id: "d1", name: "x", totalPages: 7 }]]);
    const rows = pdfFileRows({ f1: file({ id: "f1", fileName: "a.pdf" }), f2: file({ id: "f2", fileName: "b.pdf" }) }, docs);
    expect(rows.find((r) => r.id === "f1")).toMatchObject({ textStatus: "ready", docId: "d1", totalPages: 7 });
    expect(rows.find((r) => r.id === "f2")).toMatchObject({ textStatus: "none", docId: null });
  });

  it("lists only PDFs, newest first, and flags trashed ones archived; the active organization is not a filter", () => {
    const rows = pdfFileRows(
      {
        a: file({ id: "a", fileName: "old.pdf", createdAt: "2026-01-01T00:00:00Z" }),
        b: file({ id: "b", fileName: "new.pdf", createdAt: "2026-10-01T00:00:00Z", organizationId: "some-other-org" } as never),
        c: file({ id: "c", fileName: "pic.png", mimeType: "image/png" }),
        d: file({ id: "d", fileName: "gone.pdf", createdAt: "2026-05-01T00:00:00Z", deletedAt: "2026-10-02T00:00:00Z" }),
      },
      new Map(),
    );
    expect(rows.map((r) => r.id)).toEqual(["b", "d", "a"]);
    expect(rows.find((r) => r.id === "d")?.archived).toBe(true);
  });

  it("system files stay out unless the knob is on", () => {
    const sys = file({ id: "s", fileName: "sys.pdf", metadata: { system_artifact: true } } as never);
    expect(pdfFileRows({ s: sys }, new Map())).toHaveLength(0);
    expect(pdfFileRows({ s: sys }, new Map(), { showSystemFiles: true })).toHaveLength(1);
  });
});

describe("splitByArchive", () => {
  it("keeps archived rows out of the active list", async () => {
    const { splitByArchive } = await import("../pdfFileRows");
    const row = (id: string, archived: boolean) => ({ id, name: id, createdAt: "", updatedAt: "", fileSize: null, archived, textStatus: "none" as const, docId: null, totalPages: null });
    const { active, archived } = splitByArchive([row("a", false), row("b", true), row("c", false)]);
    expect(active.map((r) => r.id)).toEqual(["a", "c"]);
    expect(archived.map((r) => r.id)).toEqual(["b"]);
  });
});
