/**
 * On a public share page a picture from the owner's own files draws (through the link's token);
 * a picture from another website is never fetched there — the page counts it and says so.
 * Proven failing first: the old pass-through returned foreign URLs, so a tracking pixel in a
 * shared document loaded for every visitor.
 */
jest.mock("@/features/files/handler/utils/python-base", () => ({
  shareChildFileUrls: (token: string, id: string) => ({ inline: `https://files.test/share/${token}/files/${id}` }),
}));
jest.mock("@ai-matrx/rich-content/levels/RichContentStandardImpl", () => ({ __esModule: true, default: () => null }));
jest.mock("@/features/documents/univer-doc-to-markdown", () => ({ univerDocToMarkdown: () => "" }));
jest.mock("@/features/workbooks/univer-snapshot-rows", () => ({ univerSnapshotToRows: () => [] }));

import { sharedImageUrl } from "../file-record-lens";

describe("sharedImageUrl", () => {
  it("routes our own picture through the share token", () => {
    expect(sharedImageUrl("tok", "matrx-file:a7257bae-ccfe-429d-a546-60af8079cad8#120x80")).toBe(
      "https://files.test/share/tok/files/a7257bae-ccfe-429d-a546-60af8079cad8",
    );
  });
  it("leaves a foreign picture out (the page names it)", () => {
    expect(sharedImageUrl("tok", "https://pixel.example/p.gif")).toBeNull();
    expect(sharedImageUrl("tok", "data:image/png;base64,AAAA")).toBeNull();
  });
});
