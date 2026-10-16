/**
 * Smart Add never turns a post link into an account (live defect 2026-10-16: Facebook story.php / photo.php
 * permalinks became a brand's "accounts"). The same per-platform case table the social link rule and
 * matrx-social run; Smart Add's own identity must agree with it.
 */
import cases from "../../social/__tests__/post_link_cases.json";
import { accountOfPost, socialIdentity } from "../validate/fold";
import { webProfileAsAccount } from "../ownAccountRows";
import type { EvidenceItem } from "../evidence";

type Case = [string, string, "post" | "account", string | null, string | null];
const ALL = cases.cases as Case[];
const POSTS = ALL.filter((c) => c[2] === "post");
// Smart Add keys Facebook's numeric profile.php?id= and LinkedIn people separately; the table's other accounts must key.
const ACCOUNTS = ALL.filter((c) => c[2] === "account" && !/profile\.php|\/photos\/$/.test(c[0]) && c[1] !== "reddit" && c[1] !== "snapchat" && c[1] !== "pinterest" && c[1] !== "threads");

describe("Smart Add post links are never accounts", () => {
  it.each(POSTS)("%s", (url, platform, _kind, _h, owner) => {
    const id = socialIdentity(url);
    expect(id.key).toBeNull();
    // A post still folds into the account that owns it, when the address names one.
    const under = accountOfPost(url);
    if (owner && platform !== "linkedin" && ["facebook", "instagram", "x", "tiktok", "threads"].includes(platform)) {
      expect(under).toBe(`acct:${platform}:${owner.toLowerCase()}`);
    } else {
      expect(under).toBeNull();
    }
    // A found web page that is a post is never promoted to an account candidate.
    const item = { key: `web:${url}`, field: "web_page", value: url, url, label: "x" } as unknown as EvidenceItem;
    expect(webProfileAsAccount(item)).toBe(item);
  });

  it.each(ACCOUNTS)("%s stays an account", (url, platform, _kind, handle) => {
    const id = socialIdentity(url);
    expect(id.post).toBe(false);
    expect(id.key).not.toBeNull();
    if (platform !== "linkedin" && platform !== "youtube") expect(id.key?.toLowerCase()).toBe(`acct:${platform}:${handle?.toLowerCase()}`);
  });
});
