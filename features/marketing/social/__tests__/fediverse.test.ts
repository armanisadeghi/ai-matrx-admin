/**
 * MKT-102: a Mastodon profile on its own server is a Mastodon account, not a website. The shape alone is
 * never enough (Medium, TikTok use it); a free check of the host decides, and a proven host is learned.
 */
import { hostRunsFediverse, learnFediverseFromText } from "../fediverse";
import { parseSocialAccount } from "../link";
import { fediverseProfileShape, forgetFediverseHosts } from "../profile-sites";

const mastodonHost = (host: string) => async (url: string) => {
  if (url === `https://${host}/api/v1/accounts/lookup?acct=ben`) return { ok: true, json: async () => ({ acct: "ben", url: `https://${host}/@ben` }) };
  return { ok: false, json: async () => ({}) };
};
const plainSite = async () => ({ ok: false, json: async () => ({}) });

beforeEach(() => forgetFediverseHosts());

describe("fediverseProfileShape", () => {
  it("reads one /@user segment on an unclaimed host", () => {
    expect(fediverseProfileShape("https://werd.social/@ben")).toEqual({ host: "werd.social", user: "ben" });
    expect(fediverseProfileShape("fedi.example.org/@ana")).toEqual({ host: "fedi.example.org", user: "ana" });
  });
  it("never claims hosts or paths another network owns", () => {
    for (const t of ["https://tiktok.com/@x", "https://youtube.com/@x", "https://medium.com/@x", "https://hashnode.com/@x", "https://werd.social/@ben/123", "https://werd.social/ben", "https://werd.social/"]) {
      expect(fediverseProfileShape(t)).toBeNull();
    }
  });
});

describe("a Mastodon profile on its own server", () => {
  it("is not an account until the host is checked, and is one after", async () => {
    expect(parseSocialAccount("https://werd.social/@ben").status).toBe("invalid");
    expect(await learnFediverseFromText("https://werd.social/@ben", { fetchImpl: mastodonHost("werd.social") })).toBe(true);
    expect(parseSocialAccount("https://werd.social/@ben")).toMatchObject({ status: "ok", platform: "mastodon", handle: "ben@werd.social", url: "https://werd.social/@ben", detected: true });
  });
  it("a host that is no fediverse server stays a website, and nothing is learned", async () => {
    const learned = jest.fn();
    expect(await learnFediverseFromText("https://blog.example.org/@ben", { fetchImpl: plainSite, onLearned: learned })).toBe(false);
    expect(learned).not.toHaveBeenCalled();
    expect(parseSocialAccount("https://blog.example.org/@ben").status).toBe("invalid");
  });
  it("tells the registry once, with the profile address", async () => {
    const learned = jest.fn();
    await learnFediverseFromText("https://werd.social/@ben", { fetchImpl: mastodonHost("werd.social"), onLearned: learned });
    await learnFediverseFromText("https://werd.social/@ben", { fetchImpl: mastodonHost("werd.social"), onLearned: learned });
    expect(learned).toHaveBeenCalledTimes(1);
    expect(learned).toHaveBeenCalledWith("werd.social", "https://werd.social/@ben");
  });
  it("falls back to nodeinfo when the account lookup is closed", async () => {
    const fetchImpl = async (url: string) => {
      if (url.endsWith("/.well-known/nodeinfo")) return { ok: true, json: async () => ({ links: [{ href: "https://x.example/nodeinfo/2.0" }] }) };
      if (url === "https://x.example/nodeinfo/2.0") return { ok: true, json: async () => ({ software: { name: "mastodon" } }) };
      return { ok: false, json: async () => ({}) };
    };
    expect(await hostRunsFediverse("x.example", "ben", fetchImpl)).toBe(true);
  });
  it("known Mastodon hosts read without any check", () => {
    expect(parseSocialAccount("https://fosstodon.org/@ana")).toMatchObject({ status: "ok", platform: "mastodon", handle: "ana@fosstodon.org" });
  });
});
