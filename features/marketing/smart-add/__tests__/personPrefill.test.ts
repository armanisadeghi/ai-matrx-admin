import { parseSmartAddUrl } from "../smartAddUrl";
import { forgetFediverseHosts } from "@/features/marketing/social/profile-sites";
import { learnProfileLinkHosts, personExtraPrefill, profileLinkIn } from "../personPrefill";

describe("the Person start page reads social= like Company does (MKT-103)", () => {
  const a = parseSmartAddUrl("/marketing/brands/smart-add/person", "?name=Ben%20Werdmuller&social=https%3A%2F%2Fwerd.social%2F%40ben&platform=mastodon");
  it("the address keeps the name, the profile link and the platform", () => {
    expect(a.prefill).toEqual({ name: "Ben Werdmuller", social: "https://werd.social/@ben", platform: "mastodon" });
  });
  it("the profile link lands on the name card's anything-else row", () => {
    expect(personExtraPrefill(true, a.prefill)).toBe("https://werd.social/@ben");
  });
  it("a company start, or a person link with no name, leaves the row empty", () => {
    expect(personExtraPrefill(false, a.prefill)).toBe("");
    expect(personExtraPrefill(true, { social: "https://werd.social/@ben" })).toBe("");
    expect(personExtraPrefill(true, undefined)).toBe("");
  });
});

describe("a profile or link-in-bio link typed in any Person box is a source to read (MKT-110)", () => {
  it("a Beacons link in Anything else is the person's link page", () => {
    expect(profileLinkIn("Jane Doe", "Austin", "", "", "beacons.ai/janedoe")).toBe("beacons.ai/janedoe");
  });
  it("a link beside other words in a box is found", () => {
    expect(profileLinkIn("", "", "", "", "UT Austin, https://linktr.ee/janedoe")).toBe("https://linktr.ee/janedoe");
  });
  it("a social account address in the company box is found", () => {
    expect(profileLinkIn("", "", "", "https://www.instagram.com/janedoe/", "")).toBe("https://www.instagram.com/janedoe/");
  });
  it("plain words, a bare handle or a plain website are not a profile link", () => {
    expect(profileLinkIn("Jane Doe", "Austin", "Painter", "Acme", "Stanford")).toBeNull();
    expect(profileLinkIn("", "", "", "", "@janedoe")).toBeNull();
    expect(profileLinkIn("", "", "", "", "janedoe.com")).toBeNull();
  });
});

describe("a self-hosted Mastodon link typed in a Person box is kept (MKT-119)", () => {
  const LINK = "https://social.example.dev/@jane";
  beforeEach(() => forgetFediverseHosts());
  it("is dropped until its host is checked, then read as the social link", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ acct: "jane", url: LINK }) })) as unknown as typeof fetch;
    expect(profileLinkIn("Jane Doe", "", "", "", `find me ${LINK}`)).toBeNull();
    const learned = jest.fn();
    await learnProfileLinkHosts(["Jane Doe", `find me ${LINK}`], learned);
    expect(learned).toHaveBeenCalledWith("social.example.dev", LINK);
    expect(profileLinkIn("Jane Doe", "", "", "", `find me ${LINK}`)).toBe(LINK);
  });
  it("a plain website stays no link, and a failed check is a miss", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    await learnProfileLinkHosts([`see ${LINK}`, "https://example.com/about"]);
    expect(profileLinkIn(`see ${LINK}`, "https://example.com/about")).toBeNull();
  });
});
