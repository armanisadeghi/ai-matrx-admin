/**
 * features/pdf/workspace/pdfThumbnails.ts — page thumbnails for the workspace's page panel.
 *
 * ONE batching queue per document: thumbnails ask for their page when they scroll into view, the
 * queue gathers the asks of one frame-ish (40 ms) and opens the document ONCE through
 * `rasterizePdfPages` (the media package's single PDF.js door), so a 500-page file never opens 500
 * documents and never draws pages nobody looked at. Object URLs are revoked on `dispose`.
 */
import type { PdfDocumentInput, RasterizePdfPagesOptions, RasterizedPdfPages } from "@ai-matrx/media/viewers/pdf";

const BATCH_MS = 40;
/** Pixels per PDF point: a 612 pt page draws about 130 px wide, sharp in the 88 px cell. */
const THUMB_SCALE = 0.22;

export interface ThumbnailQueue {
  request(page: number): Promise<string>;
  dispose(): void;
}

type Rasterize = (input: PdfDocumentInput, options?: RasterizePdfPagesOptions) => Promise<RasterizedPdfPages>;

/** PDF.js loads on the first thumbnail, not with the page (the engine is multi-megabyte). */
const rasterizeLazily: Rasterize = (input, options) => import("@ai-matrx/media/viewers/pdf").then((m) => m.rasterizePdfPages(input, options));

export function createThumbnailQueue(input: PdfDocumentInput, rasterize: Rasterize = rasterizeLazily): ThumbnailQueue {
  const urls = new Map<number, Promise<string>>();
  let pending = new Map<number, { resolve(url: string): void; reject(e: unknown): void }>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const flush = async () => {
    timer = null;
    const batch = pending;
    pending = new Map();
    const pages = [...batch.keys()].sort((a, b) => a - b);
    try {
      const { pages: blobs } = await rasterize(typeof input === "object" && "data" in input ? { data: input.data.slice() } : input, { scale: THUMB_SCALE, pages });
      blobs.forEach((blob, i) => {
        const page = pages[i]!;
        if (disposed) return batch.get(page)?.reject(new Error("closed"));
        batch.get(page)?.resolve(URL.createObjectURL(blob));
      });
    } catch (e) {
      for (const { reject } of batch.values()) reject(e);
      for (const page of pages) urls.delete(page); // a failed page may ask again
    }
  };

  return {
    request(page) {
      const known = urls.get(page);
      if (known) return known;
      const p = new Promise<string>((resolve, reject) => {
        pending.set(page, { resolve, reject });
      });
      urls.set(page, p);
      if (!timer) timer = setTimeout(() => void flush(), BATCH_MS);
      return p;
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      for (const p of urls.values()) void p.then((u) => URL.revokeObjectURL(u), () => undefined);
      urls.clear();
    },
  };
}

/**
 * The file's bytes read PAST every cache, for after a page change saved a new version under the same id: the same
 * URL may still be served from the browser's or CDN's copy of the old bytes, which is why thumbnails stayed
 * unrotated until a reload. `cache: "reload"` goes to the network and refreshes the stored copy.
 */
export async function fetchFreshPdfBytes(
  url: string,
  httpHeaders: Record<string, string>,
  withCredentials: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  const res = await fetchImpl(url, { headers: httpHeaders, credentials: withCredentials ? "include" : "same-origin", cache: "reload" });
  if (!res.ok) throw new Error("The new version of the file could not be read.");
  return new Uint8Array(await res.arrayBuffer());
}
