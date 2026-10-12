/**
 * GUARD: a picture in a document is never dropped silently.
 *
 * THE FINDING (2026-10-11 review B1/B2): the snapshot -> markdown reader had no
 * picture handling, so "Push to Google Docs" said "Pushed" while every picture
 * stayed behind, and the signed-out share page showed none of them.
 */
import { univerDocToMarkdown } from "@/features/documents/univer-doc-to-markdown";
import { markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";

jest.mock("@/features/files/handler/utils/python-base", () => ({
  pythonShareUrl: (t: string) => `https://files.example/share/${t}`,
  shareChildFileUrls: (t: string, id: string) => ({ inline: `https://files.example/share/${t}/files/${id}` }),
}));
jest.mock("@/utils/permissions/shareLinks", () => ({ createShareLink: jest.fn() }));

import { googleImageNote, googleReadyMarkdown } from "@/features/google-workspace/linked/doc-images";

const FILE = "34601f87-e6cf-4481-a033-dfa47fd03aba";

const kilnLog = {
  id: "doc-kiln",
  body: {
    dataStream: "\bKiln firing log\rCone 6 reached at 2 pm.\r\n",
    customBlocks: [{ blockId: "pic1", startIndex: 0 }],
  },
  drawings: {
    pic1: {
      drawingId: "pic1",
      source: `matrx-file:${FILE}`,
      imageSourceType: "URL",
      title: "Kiln shelf",
      docTransform: { size: { width: 120, height: 60 } },
    },
  },
  drawingsOrder: ["pic1"],
};

it("reads a picture back as markdown with its size", () => {
  const md = univerDocToMarkdown(kilnLog);
  expect(md).toContain(`![Kiln shelf](matrx-file:${FILE}#120x60)`);
  expect(md).toContain("Cone 6 reached at 2 pm.");
});

it("a caller can point pictures elsewhere, or leave them out", () => {
  expect(univerDocToMarkdown(kilnLog, { imageUrl: () => "https://x/y.png" })).toContain("![Kiln shelf](https://x/y.png)");
  expect(univerDocToMarkdown(kilnLog, { imageUrl: () => null })).not.toContain("![");
});

it("markdown -> document keeps our picture as a real drawing with its size", () => {
  const doc = markdownToUniverDoc(`![Kiln shelf](matrx-file:${FILE}#120x60)\n\nCone 6 reached.`) as unknown as typeof kilnLog & {
    drawings: Record<string, { source: string; unitId: string; docTransform: { size: { width: number } } }>;
  };
  expect(doc.body.dataStream.startsWith("\b")).toBe(true);
  const [id] = Object.keys(doc.drawings);
  expect(doc.drawings[id].source).toBe(`matrx-file:${FILE}`);
  expect(doc.drawings[id].docTransform.size.width).toBe(120);
  expect(doc.drawings[id].unitId).toBe(doc.id);
  // and back again, unchanged
  expect(univerDocToMarkdown(doc)).toContain(`(matrx-file:${FILE}#120x60)`);
});

it("someone else's picture becomes a visible link, never nothing", () => {
  const md = "![chart](https://lh3.googleusercontent.com/abc)";
  const doc = markdownToUniverDoc(md);
  expect(doc.body?.dataStream).toContain("chart");
  expect(univerDocToMarkdown(doc)).toContain("[chart](https://lh3.googleusercontent.com/abc)");
  expect(googleImageNote(md)).toMatch(/1 picture/);
});

it("Google gets a fetchable link for each picture; one it cannot get is named", async () => {
  const md = `![a](matrx-file:${FILE}#120x60)\n\n![b](matrx-file:11111111-2222-3333-4444-555555555555)`;
  const ok = await googleReadyMarkdown(md, async (id) => `https://files.example/share/t-${id}`);
  expect(ok.markdown).toContain(`![a](https://files.example/share/t-${FILE})`);
  expect(ok.notes).toEqual([]);
  const half = await googleReadyMarkdown(md, async (id) => (id === FILE ? "https://ok" : null));
  expect(half.markdown).toContain("![a](https://ok)");
  expect(half.markdown).not.toContain("matrx-file:");
  expect(half.notes.join(" ")).toMatch(/1 picture\(s\) not sent/);
});

it("the share page reaches our pictures through the link's own token", async () => {
  const { sharedImageUrl } = await import("@/features/sharing/lenses/file-record-lens");
  expect(sharedImageUrl("tok", `matrx-file:${FILE}#120x60`)).toBe(`https://files.example/share/tok/files/${FILE}`);
});
