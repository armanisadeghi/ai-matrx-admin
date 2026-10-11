import { capturePollInterval, parseBrowserCapture } from "../browserCaptures";
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
