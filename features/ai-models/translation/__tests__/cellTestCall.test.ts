/** @jest-environment node */
/**
 * Test now's wire call and its error sentence: the server's own words for a
 * refusal, an honest line for a 404 / network failure / malformed body.
 */
import { BackendApiError } from "@ai-matrx/api";
import { testErrorSentence, testTranslationCell } from "../cellDetail";

const AUTH = { baseUrl: "https://server.example.test", accessToken: "t", organizationId: "5dc930e9-bd65-44a1-8369-af773f6e1a5b" };
const CELL = "2104f671-64b9-497d-a563-b79d93538f5d";

function respond(status: number, body: string, type = "application/json") {
  global.fetch = jest.fn().mockResolvedValue(new Response(body, { status, headers: { "content-type": type } })) as unknown as typeof fetch;
}

async function sentenceOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return testErrorSentence(e);
  }
  throw new Error("expected a refusal");
}

describe("testTranslationCell", () => {
  it("200: posts an empty body to the cell's test route and normalizes the reply", async () => {
    respond(200, JSON.stringify({ summary: "ok", budget: { per_day: 150 }, outcomes: [] }));
    const r = await testTranslationCell(AUTH, CELL);
    expect(r.summary).toBe("ok");
    expect(r.problems).toEqual([]);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${AUTH.baseUrl}/admin/ai-catalog/translation-cells/${CELL}/test`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({});
  });
  it("409: shows the server's detail verbatim with its status", async () => {
    respond(409, JSON.stringify({ detail: "This cell is archived; nothing to test." }));
    expect(await sentenceOf(testTranslationCell(AUTH, CELL))).toBe("409: This cell is archived; nothing to test.");
  });
  it("404 (endpoint not deployed yet): says 404, never a mock", async () => {
    respond(404, JSON.stringify({ detail: "Not Found" }));
    expect(await sentenceOf(testTranslationCell(AUTH, CELL))).toBe("404: Not Found");
  });
  it("network failure: the error's own message", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    expect(await sentenceOf(testTranslationCell(AUTH, CELL))).toMatch(/fetch failed|network/i);
  });
  it("malformed 200 body: refused with a sentence, not a crash", async () => {
    respond(200, "<html>oops</html>", "text/html");
    expect((await sentenceOf(testTranslationCell(AUTH, CELL))).length).toBeGreaterThan(0);
  });
  it("200 with a junk shape: rendered honestly via problems", async () => {
    respond(200, JSON.stringify([1, 2]));
    expect((await testTranslationCell(AUTH, CELL)).problems).toEqual(["The server's reply is not an object."]);
  });
  it("refuses before the wire with no server address or session", async () => {
    await expect(testTranslationCell({ ...AUTH, baseUrl: null }, CELL)).rejects.toThrow("No AI Matrx server address");
    await expect(testTranslationCell({ ...AUTH, accessToken: null }, CELL)).rejects.toThrow("Sign in again");
  });
});

describe("testErrorSentence", () => {
  it("prefers the server detail, prefixes the status", () => {
    const e = new BackendApiError({ code: "conflict" as never, detail: "Busy", userMessage: "Try later", status: 409 });
    expect(testErrorSentence(e)).toBe("409: Busy");
  });
  it("falls back to the user message, and to plain errors / values", () => {
    const e = new BackendApiError({ code: "x" as never, detail: "", userMessage: "Try later", status: null });
    expect(testErrorSentence(e)).toBe("Try later");
    expect(testErrorSentence(new Error("boom"))).toBe("boom");
    expect(testErrorSentence("raw")).toBe("raw");
  });
});
