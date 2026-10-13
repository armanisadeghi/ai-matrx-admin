/**
 * "TRY BOTH" ASKS THE AIDREAM SERVER, NEVER THE FRONTEND PAGE.
 *
 * The use case: a person on /data/library/unlock tries nytimes.com and expects the scraper and the
 * unlocker side by side. The call must leave through the app's one server client (the same one
 * `features/data-sources/server.ts` uses) toward POST /data-sources/unlock/compare, naming the board's
 * organization. A request to the page's own origin answers 200 with nothing and the row never shows an outcome.
 */
const postJson = jest.fn();
jest.mock("@/lib/python-client", () => ({ postJson: (...args: unknown[]) => postJson(...args) }));

import { compareUrl } from "../server";

beforeEach(() => postJson.mockReset());

describe("compareUrl", () => {
  it("posts the address to the server's compare door for the named organization", async () => {
    postJson.mockResolvedValue({
      data: {
        url: "https://nytimes.com",
        verdict: "unlocked",
        ours: { ok: false, status: 403, text_chars: 0, preview: "", elapsed_s: 1 },
        unlocker: { ok: true, status: 200, text_chars: 8533, preview: "Top stories", elapsed_s: 1.9, points: 30 },
      },
    });
    const result = await compareUrl({ organizationId: "org-1", url: "https://nytimes.com" });
    expect(postJson).toHaveBeenCalledWith("/data-sources/unlock/compare", { url: "https://nytimes.com" }, { organizationId: "org-1", signal: undefined });
    expect(result.verdict).toBe("unlocked");
    expect(result.unlocker?.text_chars).toBe(8533);
  });

  it("lets a refusal reach the row (it is shown in place), never swallows it", async () => {
    postJson.mockRejectedValue(new Error("Not enough points"));
    await expect(compareUrl({ organizationId: "org-1", url: "https://x.test" })).rejects.toThrow("Not enough points");
  });
});
