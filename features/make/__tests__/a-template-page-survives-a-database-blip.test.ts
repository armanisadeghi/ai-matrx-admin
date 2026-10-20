// features/make/__tests__/a-template-page-survives-a-database-blip.test.ts — ADVERSARIAL-5 F3 (2026-10-20).
//
// THE USE CASE. PostgREST restarted 18 times in 22 minutes and answered PGRST002 ("Could not query the database for
// the schema cache"); /templates/spaces-plumbing-company-hq answered 500 four times in a row. A passing blip must
// never become an error page: ask once more, then show the last good read; a real missing template still 404s.
//
// SUT: the real page reader (createTemplatePageReader) over a mocked public.template_public_page rpc.

jest.mock("../gallery/templatePage", () => ({
  shapeTemplatePage: (data: unknown) => (data && typeof data === "object" && "card" in data ? (data as object) : null),
}));

import { createTemplatePageReader, isTransientDoorError } from "../gallery/templatePageRead";

const PAGE = { card: { slug: "spaces-plumbing-company-hq" }, spec: {} };
const PGRST002 = { code: "PGRST002", message: "Could not query the database for the schema cache. Retrying.", details: null };
const noWait = { sleep: async () => undefined };

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("a template page read survives a passing database blip", () => {
  it("a PGRST002 is asked once more and the retry's answer is the page", async () => {
    const rpc = jest.fn().mockResolvedValueOnce({ data: null, error: PGRST002 }).mockResolvedValueOnce({ data: PAGE, error: null });
    const read = createTemplatePageReader(rpc, noWait);
    await expect(read("spaces-plumbing-company-hq")).resolves.toEqual({ state: "open", page: PAGE });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("when the retry fails too, the last good read of that template answers — never an error", async () => {
    const rpc = jest.fn().mockResolvedValueOnce({ data: PAGE, error: null }).mockResolvedValue({ data: null, error: PGRST002 });
    const read = createTemplatePageReader(rpc, noWait);
    await read("spaces-plumbing-company-hq");
    await expect(read("spaces-plumbing-company-hq")).resolves.toEqual({ state: "open", page: PAGE, stale: true });
  });

  it("with no earlier read it says unavailable (the page shows it in place), and does not throw", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: PGRST002 });
    const read = createTemplatePageReader(rpc, noWait);
    await expect(read("spaces-home-inventory")).resolves.toMatchObject({ state: "unavailable" });
  });

  it("a dropped connection (the rpc rejects) is the same transient class", async () => {
    const rpc = jest.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce({ data: PAGE, error: null });
    const read = createTemplatePageReader(rpc, noWait);
    await expect(read("x")).resolves.toEqual({ state: "open", page: PAGE });
  });

  it("a real missing template is still missing (the page 404s), asked once", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const read = createTemplatePageReader(rpc, noWait);
    await expect(read("no-such-template")).resolves.toEqual({ state: "missing" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("classifies: schema cache, pool and timeouts are transient; a refusal or a bad argument is not", () => {
    expect(isTransientDoorError(PGRST002)).toBe(true);
    expect(isTransientDoorError({ code: "PGRST003", message: "Timed out acquiring connection from connection pool." })).toBe(true);
    expect(isTransientDoorError({ code: "57014", message: "canceling statement due to statement timeout" })).toBe(true);
    expect(isTransientDoorError({ code: "22P02", message: "invalid input syntax for type uuid" })).toBe(false);
  });
});
