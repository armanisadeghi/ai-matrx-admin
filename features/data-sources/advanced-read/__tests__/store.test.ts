/** @jest-environment node */
import { AdvancedReadRefusal, type AdvancedItem } from "../contract";

jest.mock("../server", () => ({ runAdvancedRead: jest.fn(), quoteAdvancedRead: jest.fn() }));
import { runAdvancedRead } from "../server";
import { clearRead, readEntry, startAdvancedRead } from "../store";

const run = runAdvancedRead as jest.Mock;
const item = (url: string, ok: boolean): AdvancedItem => ({ url, ok, service: "unlocker", reader: "advanced reader", seconds: 7, points: 12, title: null, text: "t", markdown: "# t", recordCount: null, message: ok ? "Read." : "No.", tried: [] });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("advanced-read store", () => {
  afterEach(() => {
    ["https://a.com", "https://b.com"].forEach(clearRead);
    run.mockReset();
  });

  it("lands each page as it answers and calls the host once per page", async () => {
    run.mockImplementation(async (o: { onItem: (i: AdvancedItem) => void }) => {
      await Promise.resolve();
      o.onItem(item("https://a.com", true));
      o.onItem(item("https://b.com", false));
      return [];
    });
    const seen: string[] = [];
    startAdvancedRead({ organizationId: "org", urls: ["https://a.com", "https://b.com"], allow: "fast", onItem: (i) => seen.push(i.url) });
    expect(readEntry("https://a.com")?.status).toBe("running");
    await flush();
    expect(readEntry("https://a.com")).toMatchObject({ status: "done", item: { ok: true } });
    expect(readEntry("https://b.com")).toMatchObject({ status: "done", item: { ok: false } });
    expect(seen).toEqual(["https://a.com", "https://b.com"]);
  });

  it("says a dropped stream plainly on every page that had no answer, and keeps the ones that did", async () => {
    run.mockImplementation(async (o: { onItem: (i: AdvancedItem) => void }) => {
      o.onItem(item("https://a.com", true));
      throw new Error("network");
    });
    startAdvancedRead({ organizationId: "org", urls: ["https://a.com", "https://b.com"], allow: "fast" });
    await flush();
    expect(readEntry("https://a.com")?.status).toBe("done");
    expect(readEntry("https://b.com")).toEqual({ status: "failed", message: "The connection dropped before this page answered. Try again." });
  });

  it("carries a refusal's own sentence and never starts a page twice", async () => {
    run.mockRejectedValue(new AdvancedReadRefusal("usage_limit", "You are out of points."));
    startAdvancedRead({ organizationId: "org", urls: ["https://a.com"], allow: "fast" });
    startAdvancedRead({ organizationId: "org", urls: ["https://a.com"], allow: "fast" });
    expect(run).toHaveBeenCalledTimes(1);
    await flush();
    expect(readEntry("https://a.com")).toEqual({ status: "failed", message: "You are out of points." });
  });
});
