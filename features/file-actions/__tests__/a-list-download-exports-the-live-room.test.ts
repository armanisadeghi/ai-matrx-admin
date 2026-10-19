import { DOCUMENT_ADAPTER } from "../adapters";
import { readCurrentDocumentMarkdown } from "@/lib/collab/current-record";

jest.mock("@/lib/collab/current-record", () => ({
  readCurrentDocumentMarkdown: jest.fn(),
  readCurrentWorkbook: jest.fn(),
}));
const exportContent = jest.fn();
jest.mock("@ai-matrx/rich-content/copy/content-export", () => ({ exportContent: (...a: unknown[]) => exportContent(...a) }), { virtual: true });
jest.mock("@ai-matrx/office/docs", () => ({}));
jest.mock("@ai-matrx/office/sheets", () => ({}));
jest.mock("@/features/presentations/presentation-service", () => ({}));
jest.mock("@/features/presentations/deck-export", () => ({ deckDownloads: () => [] }));

describe("a list menu download", () => {
  it("exports the room's current text, not the last save", async () => {
    (readCurrentDocumentMarkdown as jest.Mock).mockResolvedValue("last save plus new typing");
    const word = DOCUMENT_ADAPTER.downloads("doc-1", "Notes").find((d) => d.label === "Word")!;
    await word.run();
    expect(exportContent).toHaveBeenCalledWith("last save plus new typing", "docx", "Notes");
  });

  it("says there is nothing to export when the document has no content", async () => {
    (readCurrentDocumentMarkdown as jest.Mock).mockResolvedValue(null);
    const word = DOCUMENT_ADAPTER.downloads("doc-1", "Notes").find((d) => d.label === "Word")!;
    await expect(word.run()).rejects.toThrow("no saved content");
  });
});
