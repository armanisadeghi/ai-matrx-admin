import { personPartyInput } from "../personParty";

// crm.party `party_org_facet` refuses a person row that carries any organization-only column;
// the Founder / Key person answer on a website result hit it live (2026-10-14) and saved nothing.
const ORG_ONLY = ["primaryDomain", "legalName"] as const;

describe("personPartyInput", () => {
  it("never sends an organization-only column for a person, even for a website result", () => {
    const input = personPartyInput("org-1", "Jane Founder", "Founder / owner", {
      url: "https://example.com/about",
      platform: "website",
      bio: "Founded it.",
    });
    expect(input.kind).toBe("person");
    for (const key of ORG_ONLY) expect(input).not.toHaveProperty(key);
    expect(input.attributes).toEqual({ website: "https://example.com/about" });
    expect(input.headline).toBe("Founded it.");
    expect(input.sourceDetail).toBe("Founder / owner: https://example.com/about");
  });

  it("keeps a social account's person free of any page attribute", () => {
    const input = personPartyInput("org-1", "@jane", "Key person", { url: "https://x.com/jane", platform: "x" });
    expect(input.attributes).toBeUndefined();
    for (const key of ORG_ONLY) expect(input).not.toHaveProperty(key);
  });
});

import { personNameOnPage } from "../personParty";

describe("the person's name a web page names (MKT-040)", () => {
  it("never reads a page title as a person's name", () => {
    expect(personNameOnPage({ title: "Ritual Coffee Roasters — San Francisco… | day9.coffee" }, "Ritual Coffee Roasters")).toBeNull();
  });
  it("prefills a name the title or snippet gives", () => {
    expect(personNameOnPage({ title: "Outdoor Supply Hardware | Tools" }, "California Hot Sauce Solutions", "https://outdoorsupplyhardware.com")).toBeNull();
    expect(personNameOnPage({ title: "Acme Widgets | Home" }, "Zed", "https://acmewidgets.com")).toBeNull();
    expect(personNameOnPage({ title: "Eric Rivera | Founder, Ritual" }, "Ritual Coffee Roasters")).toBe("Eric Rivera");
    expect(personNameOnPage({ title: "About", snippet: "Ritual was founded by Jane Smith in 2005." }, "Ritual")).toBe("Jane Smith");
  });
});
