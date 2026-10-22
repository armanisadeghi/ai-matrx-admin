import { createThumbnailQueue } from "../pdfThumbnails";

describe("the thumbnail queue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = jest.fn(() => "blob:x");
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = jest.fn();
  });
  afterEach(() => jest.useRealTimers());

  it("opens the document once for every page asked for in the same moment, and only for those pages", async () => {
    const rasterize = jest.fn(async (_input: unknown, opts: { pages?: number[] }) => ({
      pages: (opts.pages ?? []).map(() => new Blob(["x"])),
      firstPageSizePt: null,
    }));
    const q = createThumbnailQueue("https://files.example/a.pdf", rasterize as never);
    const asks = [3, 1, 2, 1].map((p) => q.request(p));
    await jest.advanceTimersByTimeAsync(60);
    await Promise.all(asks);
    expect(rasterize).toHaveBeenCalledTimes(1);
    expect(rasterize.mock.calls[0]![1].pages).toEqual([1, 2, 3]);
    // Asking again is answered from what was drawn.
    await q.request(2);
    expect(rasterize).toHaveBeenCalledTimes(1);
    q.dispose();
  });

  it("a page that failed may be asked for again", async () => {
    const rasterize = jest.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ pages: [new Blob(["x"])], firstPageSizePt: null });
    const q = createThumbnailQueue("u", rasterize as never);
    const first = q.request(1).catch((e: Error) => e.message);
    await jest.advanceTimersByTimeAsync(60);
    expect(await first).toBe("boom");
    const second = q.request(1);
    await jest.advanceTimersByTimeAsync(60);
    await expect(second).resolves.toBe("blob:x");
  });
});
