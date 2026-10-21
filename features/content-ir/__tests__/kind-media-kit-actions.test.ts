/**
 * Lane M1 — the media kit's actions: `fetch_image` (web image or saved file
 * bytes, image-only, size-capped), `download` (content or saved file through
 * the download door) and `print` (through @ai-matrx/print). Each handler is
 * pure over the capability-scoped context.
 */
import type { KindActionContext, KindActionDefinition } from "../react/actions/kind-action-context";
import { fetchImageAction, MAX_IMAGE_BYTES, parseFetchImage } from "../react/actions/handlers/fetch-image";
import { downloadAction, downloadMime, parseDownload, safeDownloadName } from "../react/actions/handlers/download";
import { parsePrint, printAction } from "../react/actions/handlers/print";

const KIND_ACTIONS: KindActionDefinition[] = [fetchImageAction, downloadAction, printAction];

const base: KindActionContext = {
  launchAgent: async () => ({}) as never,
  userId: "u1",
  openShortcut: async () => ({ conversationId: "c" }),
  runShortcut: async () => ({ ok: true, data: null }),
  itemState: null,
  openFile: () => undefined,
  shareFile: () => undefined,
  openUrl: () => undefined,
};

function run(key: string, input: unknown, ctx: Partial<KindActionContext>) {
  const def = KIND_ACTIONS.find((d) => d.key === key);
  if (!def) throw new Error(`no action ${key}`);
  return def.handler(input, { ...base, ...ctx });
}

describe("fetch_image", () => {
  it("accepts a web address or a saved file; refuses anything else with a sentence", () => {
    expect(parseFetchImage({ url: "https://example.com/a.png" })).toEqual({ url: "https://example.com/a.png" });
    expect(parseFetchImage({ file_id: " f1 " })).toEqual({ fileId: "f1" });
    expect(parseFetchImage({ url: "javascript:alert(1)" })).toHaveProperty("error");
    expect(parseFetchImage({ url: "data:image/png;base64,xx" })).toHaveProperty("error");
    expect(parseFetchImage({})).toHaveProperty("error");
  });

  it("hands back the image Blob from the host's image door", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const fetchImage = jest.fn(async () => blob);
    const out = await run("fetch_image", { url: "https://example.com/a.png" }, { fetchImage });
    expect(fetchImage).toHaveBeenCalledWith({ url: "https://example.com/a.png" });
    expect(out).toEqual({ ok: true, result: { blob, mime_type: "image/png", size: 3 } });
  });

  it("refuses bytes that are not an image, or are over the cap", async () => {
    const html = await run("fetch_image", { url: "https://example.com/page" }, {
      fetchImage: async () => new Blob(["<html>"], { type: "text/html" }),
    });
    expect(html).toEqual({ ok: false, error: "That address is not an image." });
    const huge = { type: "image/png", size: MAX_IMAGE_BYTES + 1 } as Blob;
    const big = await run("fetch_image", { url: "https://example.com/big.png" }, { fetchImage: async () => huge });
    expect(big.ok).toBe(false);
  });

  it("a saved file whose bytes come back untyped still loads; a failed read says so", async () => {
    const untyped = new Blob(["x"]);
    const ok = await run("fetch_image", { file_id: "f1" }, { fetchImage: async () => untyped });
    expect(ok.ok).toBe(true);
    const failed = await run("fetch_image", { file_id: "f1" }, { fetchImage: async () => Promise.reject(new Error("401")) });
    expect(failed).toEqual({ ok: false, error: "This image couldn't be loaded." });
  });
});

describe("download", () => {
  it("names files safely and picks the mime type from the extension", () => {
    expect(safeDownloadName("../../etc/passwd")).toBe("etc-passwd");
    expect(safeDownloadName("")).toBe("download");
    expect(safeDownloadName(`${"a".repeat(200)}.csv`)).toMatch(/^a+\.csv$/);
    expect(safeDownloadName(`${"a".repeat(200)}.csv`).length).toBe(120);
    expect(downloadMime("rows.csv", undefined)).toBe("text/csv");
    expect(downloadMime("x.bin", "application/pdf")).toBe("application/pdf");
    expect(downloadMime("x.unknown", "not a mime")).toBe("application/octet-stream");
  });

  it("saves content the shape built through the download door", async () => {
    const downloadContent = jest.fn();
    const out = await run("download", { filename: "rows.csv", content: "a,b\n1,2\n" }, { downloadContent });
    expect(downloadContent).toHaveBeenCalledWith("rows.csv", "a,b\n1,2\n", "text/csv");
    expect(out).toEqual({ ok: true, result: { downloaded: true, filename: "rows.csv" } });
  });

  it("decodes base64 and accepts a Blob (the frame sends big text as one)", async () => {
    const parsed = parseDownload({ filename: "hi.txt", base64: btoa("hi") });
    expect(parsed).toMatchObject({ kind: "content", filename: "hi.txt", mime: "text/plain", size: 2 });
    const blob = new Blob(["x".repeat(10)]);
    expect(parseDownload({ filename: "big.md", content: blob })).toMatchObject({ content: blob, size: 10, mime: "text/markdown" });
    expect(parseDownload({ filename: "x.txt", base64: "%%%" })).toHaveProperty("error");
    expect(parseDownload({ filename: "x.txt" })).toHaveProperty("error");
  });

  it("downloads a saved file by identity through the file handler", async () => {
    const downloadSavedFile = jest.fn(async () => undefined);
    const out = await run("download", { file_id: "f9", filename: "Q3.pdf" }, { downloadSavedFile });
    expect(downloadSavedFile).toHaveBeenCalledWith("f9", "Q3.pdf");
    expect(out.ok).toBe(true);
  });

  it("refuses honestly where the page has no download door", async () => {
    const out = await run("download", { filename: "a.txt", content: "a" }, {});
    expect(out).toEqual({ ok: false, error: "Downloads aren't available on this page." });
  });
});

describe("print", () => {
  it("prints markdown or html with a title; refuses an empty document", async () => {
    expect(parsePrint({ markdown: "# Hi" })).toEqual({ title: "Document", markdown: "# Hi" });
    expect(parsePrint({ title: "Plan", html: "<p>x</p>" })).toEqual({ title: "Plan", html: "<p>x</p>" });
    expect(parsePrint({ markdown: "  " })).toHaveProperty("error");
    const printDocument = jest.fn(async () => "opened" as const);
    const out = await run("print", { title: "Plan", markdown: "# Plan" }, { printDocument });
    expect(printDocument).toHaveBeenCalledWith({ title: "Plan", markdown: "# Plan" });
    expect(out).toEqual({ ok: true, result: { outcome: "opened" } });
  });
});
