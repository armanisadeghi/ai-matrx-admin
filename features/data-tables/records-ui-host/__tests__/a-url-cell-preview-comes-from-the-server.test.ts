// AT-SHARE — URL preview: the host turns the SERVER's link-preview answer into the hover card, and never fetches a page itself.
import { cardFromPreview } from "../linkPreviewPort";

const base = { url: "https://example.com/", final_url: null, fetched_at: "2026-10-15T00:00:00Z", reason: null };

describe("a URL cell's preview card", () => {
  it("is the server's title, description, site, icon and image", () => {
    expect(
      cardFromPreview({ ...base, available: true, title: "Example", description: "A page", site_name: "Example", favicon_url: "https://example.com/f.ico", image_url: "https://example.com/i.png" }),
    ).toEqual({ title: "Example", description: "A page", siteName: "Example", faviconUrl: "https://example.com/f.ico", imageUrl: "https://example.com/i.png" });
  });
  it("is nothing for a page the server could not preview, or one with nothing to show", () => {
    expect(cardFromPreview({ ...base, available: false, reason: "unreachable", title: null, description: null, site_name: null, favicon_url: null, image_url: null })).toBeNull();
    expect(cardFromPreview({ ...base, available: true, title: null, description: null, site_name: "x", favicon_url: null, image_url: null })).toBeNull();
    expect(cardFromPreview(null)).toBeNull();
  });
});
