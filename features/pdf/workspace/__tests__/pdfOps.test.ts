/**
 * The wiring of every PDF workspace tool: each ready tool in the rail becomes the right
 * `/utilities/pdf/*` call with the keystone source (`media.file_id`), and each unbuilt tool has a row in
 * the Coming-soon registry. These fail when a tool is added to the rail without a server call, when a
 * call names an endpoint the API table does not have, or when an unbuilt tool has no registered promise.
 */
import { ENDPOINTS } from "@ai-matrx/api";
import { PDF_COMING_SOON, PDF_TOOLS, comingSoonIdOf, type PdfRunRequest } from "@ai-matrx/office/pdf-model";
import { COMING_SOON } from "@/lib/coming-soon/registry";
import { callsFor, fileIdOf, type PdfCall } from "../pdfOps";

const FILE = "11111111-1111-4111-8111-111111111111";

const REQUEST_FOR_TOOL: Record<string, PdfRunRequest[]> = {
  organize: [
    { tool: "apply-pages", ops: [{ kind: "rotate", pages: [1, 3], rotation: 90 }, { kind: "delete", pages: [2] }, { kind: "reorder", newOrder: [2, 1] }] },
  ],
  "extract-pages": [{ tool: "extract-pages", pages: [1, 2] }],
  split: [{ tool: "split", maxPagesPerPart: 5 }],
  crop: [{ tool: "crop", pages: [1], box: { x0: 10, y0: 10, x1: 500, y1: 700 } }],
  redact: [{ tool: "redact", pattern: "ssn", reason: "privacy" }],
  compress: [{ tool: "compress", level: 3 }],
  "extract-data": [{ tool: "extract-text" }, { tool: "extract-tables", pages: [1] }],
};

describe("every ready panel tool maps to a server call", () => {
  const panelTools = PDF_TOOLS.filter((t) => t.status === "ready" && t.opens === "panel");
  it("covers every panel tool in the rail", () => {
    expect(Object.keys(REQUEST_FOR_TOOL).sort()).toEqual(panelTools.map((t) => t.id).sort());
  });

  for (const tool of panelTools) {
    it(`${tool.id} sends the file by id and names a real endpoint`, () => {
      for (const request of REQUEST_FOR_TOOL[tool.id]!) {
        const calls = callsFor(FILE, request);
        expect(calls.length).toBeGreaterThan(0);
        for (const call of calls) {
          if (call.kind === "json") {
            expect(typeof (ENDPOINTS.pdf as Record<string, unknown>)[call.endpoint]).toBe("string");
            expect(call.body["media"]).toEqual({ file_id: FILE });
            expect(call.body).not.toHaveProperty("cld_id");
          }
          if (call.kind === "stream-text" || call.kind === "stream-tables") expect(call.body["media"]).toEqual({ file_id: FILE });
        }
      }
    });
  }

  it("page changes save a new version of the same file; everything else makes a new file and never overwrites", () => {
    const all = Object.values(REQUEST_FOR_TOOL).flat().flatMap((r) => callsFor(FILE, r)) as PdfCall[];
    for (const call of all) {
      if (call.kind !== "json") continue;
      const mode = call.body["output_mode"];
      if (["rotatePages", "deletePages", "reorderPages"].includes(call.endpoint)) expect(mode).toBe("replace");
      else expect(mode).toBe("derivative");
    }
  });

  it("applies page operations in the order that keeps the numbering true: turns, then deletions, then the reorder", () => {
    const calls = callsFor(FILE, REQUEST_FOR_TOOL["organize"]![0]!);
    expect(calls.map((c) => (c.kind === "json" ? c.endpoint : c.kind))).toEqual(["rotatePages", "deletePages", "reorderPages"]);
    expect((calls[0] as Extract<PdfCall, { kind: "json" }>).body).toMatchObject({ pages: [1, 3], rotation: 90 });
    expect((calls[2] as Extract<PdfCall, { kind: "json" }>).body).toMatchObject({ new_order: [2, 1] });
  });
});

describe("the tools that are other pages, and the ones not built", () => {
  it("Scan and Sign open pages that exist", () => {
    const pages = PDF_TOOLS.filter((t) => t.opens === "page").map((t) => t.capability);
    expect(pages.sort()).toEqual(["route:/esign/new", "route:/tools/scanner"]);
  });

  it("every unbuilt tool and the layers panel is registered in the app's Coming-soon registry, with its promise", () => {
    for (const t of PDF_TOOLS.filter((x) => x.status === "soon")) {
      const row = COMING_SOON[comingSoonIdOf(t.id)];
      expect(row).toBeTruthy();
      expect(row!.owner).toBe("pdf");
    }
    expect(COMING_SOON["pdf.layers"]).toBeTruthy();
    for (const id of Object.keys(PDF_COMING_SOON)) expect(COMING_SOON[id]).toEqual(PDF_COMING_SOON[id]);
  });
});

describe("fileIdOf", () => {
  it("reads a persisted single file, a split's parts, and says nothing for anything else", () => {
    expect(fileIdOf({ file_id: "a" })).toBe("a");
    expect(fileIdOf({ parts: [{ file_id: "p1" }, { file_id: "p2" }] })).toBe("p1");
    expect(fileIdOf({})).toBeNull();
    expect(fileIdOf(null)).toBeNull();
  });
});
