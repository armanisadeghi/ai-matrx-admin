/**
 * A picture added to a sheet or document goes to the file store and the
 * snapshot keeps only a reference; the reference turns back into pixels when
 * Univer paints. Inline (base64) pictures are left alone.
 */
jest.mock("@univerjs/core", () => ({
  IImageIoService: Symbol("io"),
  IURLImageService: Symbol("url"),
  ImageSourceType: { URL: "URL", BASE64: "BASE64" },
  ImageUploadStatusType: { SUCCUSS: "SUCCUSS" },
  generateRandomId: () => "abc123",
}));

import {
  createMatrxImageStore,
  registerMatrxImageStore,
  MATRX_IMAGE_PREFIX,
} from "@/lib/univer/univerImageStore";
import { IImageIoService, IURLImageService } from "@univerjs/core";

const png = (size: number) => new File([new Uint8Array(size)], "p.png", { type: "image/png" });

function ports() {
  return {
    upload: jest.fn(async () => ({ fileId: "f-1" })),
    getBlobUrl: jest.fn(async (id: string) => `blob:${id}`),
    onUploadError: jest.fn(),
  };
}

describe("univer image store", () => {
  it("stores a 2 MB picture as a reference, not as bytes in the snapshot", async () => {
    const p = ports();
    const saved = (await createMatrxImageStore(p).saveImage(png(2_000_000))) as {
      source: string;
      imageSourceType: string;
    };
    expect(p.upload).toHaveBeenCalledTimes(1);
    expect(saved.imageSourceType).toBe("URL");
    expect(saved.source).toBe(`${MATRX_IMAGE_PREFIX}f-1`);
    expect(JSON.stringify(saved).length).toBeLessThan(500);
  });

  it("paints a reference through the file store, and leaves other URLs alone", async () => {
    const p = ports();
    const store = createMatrxImageStore(p);
    expect(await store.download(`${MATRX_IMAGE_PREFIX}f-1`)).toBe("blob:f-1");
    await store.download(`${MATRX_IMAGE_PREFIX}f-1`);
    expect(p.getBlobUrl).toHaveBeenCalledTimes(1);
    expect(await store.download("https://x.test/a.png")).toBe("https://x.test/a.png");
  });

  it("tells the person when the upload fails, and adds nothing", async () => {
    const p = ports();
    p.upload.mockRejectedValueOnce(new Error("offline"));
    await expect(createMatrxImageStore(p).saveImage(png(10))).rejects.toThrow("offline");
    expect(p.onUploadError).toHaveBeenCalledTimes(1);
  });

  it("replaces Univer's inline image service on the instance", async () => {
    const p = ports();
    const io = { saveImage: jest.fn() };
    const urls = { registerURLImageDownloader: jest.fn() };
    registerMatrxImageStore(
      { get: (id) => (id === IImageIoService ? io : id === IURLImageService ? urls : null) },
      p,
    );
    await (io.saveImage as (f: File) => Promise<unknown>)(png(10));
    expect(p.upload).toHaveBeenCalled();
    expect(urls.registerURLImageDownloader).toHaveBeenCalledTimes(1);
  });
});
