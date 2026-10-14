const mockOperations: Array<[string, ...unknown[]]> = [];

function mockQuery(table: string) {
  const result = table === "associations"
    ? { data: [{ source_id: "doc-1" }], error: null }
    : { data: [{ id: "doc-1", updated_at: "2026-10-09T21:00:00Z", social: { schema: "social_capture.v1", status: "parsed", profile: {}, posts: [], notes: [] } }], error: null };
  const query = {
    select: (...args: unknown[]) => (mockOperations.push([`${table}.select`, ...args]), query),
    eq: (...args: unknown[]) => (mockOperations.push([`${table}.eq`, ...args]), query),
    is: (...args: unknown[]) => (mockOperations.push([`${table}.is`, ...args]), query),
    in: (...args: unknown[]) => (mockOperations.push([`${table}.in`, ...args]), query),
    order: (...args: unknown[]) => (mockOperations.push([`${table}.order`, ...args]), query),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ schema: () => ({ from: (table: string) => mockQuery(table) }) }),
}));

import { capturePollInterval, fetchBrowserCaptures, parseBrowserCapture } from "../browserCaptures";
import { instagramIdToShortcode, instagramShortcodeToId, samePost } from "../postMatch";

const social = {
  schema: "social_capture.v1",
  status: "parsed",
  profile: { display_name: "La Jolla Kayak", follower_count: 7801, post_count: 523 },
  posts: [
    { platform_post_id: "Cseuqn0AFkd", url: "https://www.instagram.com/reel/Cseuqn0AFkd/", format: "reel", text: "Video by La Jolla Kayak" },
    { platform_post_id: "Das6jaZmsJl", url: "https://www.instagram.com/p/Das6jaZmsJl/", format: "image" },
  ],
  notes: [],
};

describe("browser captures", () => {
  it("parses the stored social block and refuses an unknown schema", () => {
    const c = parseBrowserCapture("doc-1", "2026-10-09T21:00:00Z", social);
    expect(c?.profile.followerCount).toBe(7801);
    expect(c?.posts.map((p) => p.platformPostId)).toEqual(["Cseuqn0AFkd", "Das6jaZmsJl"]);
    expect(parseBrowserCapture("doc-1", "x", { ...social, schema: "other" })).toBeNull();
  });

  it("excludes deleted and archived source records from current capture evidence", async () => {
    mockOperations.length = 0;
    await expect(fetchBrowserCaptures([{ type: "social_profile", id: "profile-1" }])).resolves.toHaveLength(1);
    expect(mockOperations).toContainEqual(["processed_documents.is", "deleted_at", null]);
    expect(mockOperations).toContainEqual(["processed_documents.is", "archived_at", null]);
  });

});

describe("post matching (numeric media id vs shortcode)", () => {
  it("is the same base-64 id both ways, on live @lajollakayak pairs", () => {
    expect(instagramShortcodeToId("DbBetyXguAG")).toBe("3945569836406595590");
    expect(instagramIdToShortcode("3107126032038123805")).toBe("Cseuqn0AFkd");
    expect(samePost("instagram", { platformPostId: "DdC6aVWj8_n" }, { platformPostId: "3982001916880080871" })).toBe(true);
    expect(samePost("instagram", { platformPostId: "DdC6aVWj8_n" }, { platformPostId: "3107126032038123805" })).toBe(false);
  });
});

describe("images landing after the capture", () => {
  it("polls only while the newest capture's images are pending and fresh", () => {
    const pending = parseBrowserCapture("d", "2026-10-09T21:00:00Z", { ...social, images_pending: true })!;
    const t = new Date("2026-10-09T21:00:30Z").getTime();
    expect(capturePollInterval([pending], t)).toBe(4000);
    expect(capturePollInterval([pending], t + 300_000)).toBe(false);
    expect(capturePollInterval([parseBrowserCapture("d", "2026-10-09T21:00:00Z", social)!], t)).toBe(false);
  });
});
