import { foldForSearch, readEntity } from "../people/entityOffers";

describe("the box understands things as well as jobs", () => {
  it("a business name offers compare, reviews and people", () => {
    const r = readEntity("Spring Creek Nursery Tulsa");
    expect(r?.kind).toBe("business");
    expect(r?.offers.map((o) => o.label)).toEqual(["Compare this business", "Find its reviews", "Find people at it"]);
    expect(r?.offers[0]?.href).toBe("/compare?q=Spring%20Creek%20Nursery%20Tulsa");
  });
  it("an accented or misspelled name is still a business, matched on folded text", () => {
    expect(readEntity("Café Pasqual's Santa Fe")?.kind).toBe("business");
    expect(foldForSearch("Café Pasqual’s")).toBe("Cafe Pasqual's");
    expect(readEntity("Spirng Creek Nurserry")?.kind).toBe("business");
  });
  it("handles, dotted handles, mastodon and profile links open the social account", () => {
    expect(readEntity("@nest.studio")?.offers[0]).toMatchObject({ jobKey: "social_profile", inputs: { account: "@nest.studio" } });
    expect(readEntity("name.surname")?.kind).toBe("handle");
    expect(readEntity("@gargron@mastodon.social")?.kind).toBe("handle");
    expect(readEntity("gargron@mastodon.social")?.kind).toBe("handle");
    expect(readEntity("https://www.instagram.com/nest.studio/")?.kind).toBe("social_link");
  });
  it("a website offers the strength check; an email is not a handle", () => {
    expect(readEntity("zingermans.com")?.offers[0]).toMatchObject({ jobKey: "seo_domain_authority", inputs: { domain: "zingermans.com" } });
    expect(readEntity("ari@zingermans.com")?.kind).toBe("email");
  });
  it("nothing typed, nothing offered", () => {
    expect(readEntity("  ")).toBeNull();
    expect(readEntity("1234")).toBeNull();
  });
});
