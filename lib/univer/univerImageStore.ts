/**
 * univerImageStore — images on a sheet or in a document live in OUR file
 * store; the Univer snapshot holds only a reference (`matrx-file:<fileId>`).
 *
 * Why: Univer's stock image service inlines every picture as base64 into the
 * snapshot, so one 2 MB photo made every autosave, history row and collab
 * mutation ~2 MB. Here `saveImage` uploads the file and hands Univer a URL-type
 * source; Univer's URL-image downloader turns the reference back into bytes
 * (`getBlob` → object URL) when it paints. Images already inline (BASE64
 * sources) are untouched and keep rendering.
 */

import {
  IImageIoService,
  IURLImageService,
  ImageSourceType,
  ImageUploadStatusType,
  generateRandomId,
} from "@univerjs/core";

export const MATRX_IMAGE_PREFIX = "matrx-file:";

export const isMatrxImageSource = (source: string): boolean =>
  source.startsWith(MATRX_IMAGE_PREFIX);

export const matrxImageFileId = (source: string): string =>
  source.slice(MATRX_IMAGE_PREFIX.length);

export type ImageStorePorts = {
  upload(file: File): Promise<{ fileId: string }>;
  getBlob(fileId: string): Promise<Blob>;
  /** Called when an upload fails, so the person is told (never silent). */
  onUploadError(error: unknown): void;
};

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp", "image/webp"];

type ImageIo = {
  saveImage(file: File): Promise<unknown>;
};
type UrlImages = {
  registerURLImageDownloader(d: (url: string) => Promise<string>): { dispose(): void };
};
type InjectorLike = { get(id: unknown): unknown };

/** Pure core: the two replacements, given ports. */
export function createMatrxImageStore(ports: ImageStorePorts) {
  const blobUrls = new Map<string, Promise<string>>();
  return {
    /** Revoke every object URL this store made (the editor is going away). */
    dispose() {
      for (const pending of blobUrls.values()) void pending.then((url) => URL.revokeObjectURL(url), () => undefined);
      blobUrls.clear();
    },
    async saveImage(file: File) {
      if (!ALLOWED.includes(file.type)) throw new Error("ERROR_IMAGE_TYPE");
      let fileId: string;
      try {
        ({ fileId } = await ports.upload(file));
      } catch (error) {
        ports.onUploadError(error);
        throw error;
      }
      const source = MATRX_IMAGE_PREFIX + fileId;
      // Univer measures the picture from base64Cache before it inserts (an empty one throws, nothing is
      // inserted). A blob URL of the file just chosen serves that and paints it; it is never saved.
      const localUrl = URL.createObjectURL(file);
      blobUrls.set(fileId, Promise.resolve(localUrl));
      return {
        imageId: generateRandomId(6),
        imageSourceType: ImageSourceType.URL,
        source,
        base64Cache: localUrl,
        status: ImageUploadStatusType.SUCCUSS,
      };
    },
    async download(url: string): Promise<string> {
      if (!isMatrxImageSource(url)) return url;
      const fileId = matrxImageFileId(url);
      let pending = blobUrls.get(fileId);
      if (!pending) {
        pending = ports.getBlob(fileId).then((blob) => URL.createObjectURL(blob));
        blobUrls.set(fileId, pending);
        pending.catch(() => blobUrls.delete(fileId));
      }
      return pending;
    },
  };
}

const stores = new WeakMap<object, { dispose(): void }>();

/** Release the object URLs of the store wired into this Univer instance (call as the instance is disposed). */
export function releaseMatrxImageStore(injector: object | null | undefined): void {
  if (!injector) return;
  stores.get(injector)?.dispose();
  stores.delete(injector);
}

/** Wire the store into one Univer instance's image services. */
export function registerMatrxImageStore(injector: InjectorLike, ports: ImageStorePorts): void {
  const store = createMatrxImageStore(ports);
  stores.set(injector, store);
  const io = injector.get(IImageIoService) as ImageIo;
  io.saveImage = store.saveImage as ImageIo["saveImage"];
  const urls = injector.get(IURLImageService) as UrlImages;
  urls.registerURLImageDownloader(store.download);
}
