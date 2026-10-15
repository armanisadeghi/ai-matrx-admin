import { convertOpenXml } from "../office-convert";

jest.mock("@/lib/python-client", () => ({ resolveBaseUrl: () => "https://server.example/" }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => ({ getState: () => ({}) }) }));
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectAccessToken: () => "tok" }));
jest.mock("@ai-matrx/kit/download", () => ({ downloadFile: jest.fn() }));

describe("convertOpenXml", () => {
  it("posts the file and target as multipart to /office/convert-document with the bearer token", async () => {
    const seen: { url?: string; init?: RequestInit } = {};
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen.url = url;
      seen.init = init;
      return new Response(new Uint8Array([80, 75]), { status: 200 });
    }) as unknown as typeof fetch;
    const blob = await convertOpenXml(new Uint8Array([1, 2]), "a.xlsx", "ods", fetchImpl);
    expect(seen.url).toBe("https://server.example/office/convert-document");
    expect((seen.init!.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    const form = seen.init!.body as FormData;
    expect(form.get("target")).toBe("ods");
    expect((form.get("file") as File).name).toBe("a.xlsx");
    expect(blob.type).toBe("application/vnd.oasis.opendocument.spreadsheet");
    expect(blob.size).toBe(2);
  });
  it("says what the converter said when it refuses", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ detail: "no LibreOffice" }), { status: 503 })) as unknown as typeof fetch;
    await expect(convertOpenXml(new Uint8Array(), "a.xlsx", "ods", fetchImpl)).rejects.toThrow("no LibreOffice");
  });
});
