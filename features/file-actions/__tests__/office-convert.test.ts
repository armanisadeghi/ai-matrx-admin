import type { requestRaw } from "@/lib/python-client";
import { convertOpenXml } from "../office-convert";

jest.mock("@/lib/python-client", () => ({ requestRaw: jest.fn() }));
jest.mock("@ai-matrx/kit/download", () => ({ downloadFile: jest.fn() }));

describe("convertOpenXml", () => {
  it("posts the file and target as multipart through the canonical client (which adds the token and X-Organization-Id)", async () => {
    const seen: { path?: string; init?: RequestInit; opts?: unknown } = {};
    const request = (async (path: string, init: RequestInit, opts: unknown) => {
      seen.path = path;
      seen.init = init;
      seen.opts = opts;
      return new Response(new Uint8Array([80, 75]), { status: 200 });
    }) as unknown as typeof requestRaw;
    const blob = await convertOpenXml(new Uint8Array([1, 2]), "a.xlsx", "ods", request);
    expect(seen.path).toBe("/office/convert-document");
    expect(seen.init!.method).toBe("POST");
    // No hand-built headers: a bare fetch is what left out the organization and got a 400.
    expect(seen.init!.headers).toBeUndefined();
    const form = seen.init!.body as FormData;
    expect(form.get("target")).toBe("ods");
    expect((form.get("file") as File).name).toBe("a.xlsx");
    expect(blob.type).toBe("application/vnd.oasis.opendocument.spreadsheet");
    expect(blob.size).toBe(2);
  });
  it("says what the converter said when it refuses", async () => {
    const request = (async () => new Response(JSON.stringify({ detail: "no LibreOffice" }), { status: 503 })) as unknown as typeof requestRaw;
    await expect(convertOpenXml(new Uint8Array(), "a.xlsx", "ods", request)).rejects.toThrow("no LibreOffice");
  });
});
