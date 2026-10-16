/**
 * A link to a post, photo, story, video, reel, status, event or share is NEVER an account (live defect
 * 2026-10-16: Facebook story.php / photo.php permalinks were saved as a brand's accounts). One case table
 * per platform, the same file matrx-social runs (packages/matrx-social/tests/fixtures/post_link_cases.json).
 */
import cases from "./post_link_cases.json";
import { classifySocialLink, handleFromInput, looksLikePostUrl, parseSocialAccount, postOwnerFromUrl } from "../link";

type Case = [string, string, "post" | "account", string | null, string | null];

describe("post link vs account link case table (shared with matrx-social)", () => {
  it.each(cases.cases as Case[])("%s", (url, platform, kind, handle, owner) => {
    const link = classifySocialLink(url);
    const parsed = parseSocialAccount(url, null);
    if (kind === "post") {
      expect(looksLikePostUrl(url)).toBe(true);
      expect(link?.kind).toBe("post");
      expect(parsed.status).toBe("post");
      expect(parsed.status === "ok").toBe(false);
      expect(postOwnerFromUrl(url)?.handle ?? null).toBe(owner);
      expect(handleFromInput(url)).toBe(owner ?? "");
    } else {
      expect(looksLikePostUrl(url)).toBe(false);
      expect(link?.kind).toBe("profile");
      expect(link?.platform).toBe(platform);
      expect(link?.handle).toBe(handle);
      expect(postOwnerFromUrl(url)).toBeNull();
    }
  });
});
