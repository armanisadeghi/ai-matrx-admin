import { parseSmartAddUrl } from "../smartAddUrl";
import { personExtraPrefill } from "../personPrefill";

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
