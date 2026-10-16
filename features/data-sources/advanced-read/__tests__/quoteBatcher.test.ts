/** @jest-environment node */
import type { Quote, QuoteItem } from "../contract";
import { batchedQuote, resetQuoteBatcher } from "../quoteBatcher";

const item = (url: string, pointsUpTo: number | null = 12): QuoteItem => ({ url, coverage: [], wouldTry: ["unlocker"], pointsUpTo });
const quoteOf = (items: QuoteItem[]): Quote => ({ allow: "fast", items, pointsUpToTotal: null, limitApplied: null });

describe("quote batcher", () => {
  afterEach(() => resetQuoteBatcher());

  it("sends ONE request for every page that asks in the same tick, and answers each its own page", async () => {
    const ask = jest.fn(async ({ urls }: { urls: string[] }) => quoteOf(urls.map((u) => item(u))));
    resetQuoteBatcher(ask);
    const [a, b, c] = await Promise.all([
      batchedQuote({ organizationId: "o", urls: ["https://a.com"], allow: "fast" }),
      batchedQuote({ organizationId: "o", urls: ["https://b.com"], allow: "fast" }),
      batchedQuote({ organizationId: "o", urls: ["https://a.com", "https://c.com"], allow: "fast" }),
    ]);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0].urls.sort()).toEqual(["https://a.com", "https://b.com", "https://c.com"]);
    expect(a.items.map((i) => i.url)).toEqual(["https://a.com"]);
    expect(b.items.map((i) => i.url)).toEqual(["https://b.com"]);
    expect(c.items.map((i) => i.url)).toEqual(["https://a.com", "https://c.com"]);
    expect(c.pointsUpToTotal).toBe(24);
  });

  it("remembers an answered page by its address: asking again sends nothing", async () => {
    const ask = jest.fn(async ({ urls }: { urls: string[] }) => quoteOf(urls.map((u) => item(u))));
    resetQuoteBatcher(ask);
    await batchedQuote({ organizationId: "o", urls: ["https://a.com"], allow: "fast" });
    await batchedQuote({ organizationId: "o", urls: ["https://a.com"], allow: "fast" });
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("asks again for the pages the server's limit left out", async () => {
    const ask = jest.fn(async ({ urls }: { urls: string[] }) => quoteOf(urls.slice(0, 2).map((u) => item(u))));
    resetQuoteBatcher(ask);
    const q = await batchedQuote({ organizationId: "o", urls: ["https://a.com", "https://b.com", "https://c.com"], allow: "fast" });
    expect(ask).toHaveBeenCalledTimes(2);
    expect(q.items).toHaveLength(3);
  });

  it("rejects every waiting page when the request fails, and forgets so a retry asks again", async () => {
    const ask = jest.fn().mockRejectedValueOnce(new Error("down")).mockImplementation(async ({ urls }: { urls: string[] }) => quoteOf(urls.map((u) => item(u))));
    resetQuoteBatcher(ask);
    await expect(batchedQuote({ organizationId: "o", urls: ["https://a.com"], allow: "fast" })).rejects.toThrow("down");
    const q = await batchedQuote({ organizationId: "o", urls: ["https://a.com"], allow: "fast" });
    expect(q.items).toHaveLength(1);
    expect(ask).toHaveBeenCalledTimes(2);
  });
});
