import { siteNameOf } from "../siteName";

describe("the business name behind a web result (MKT-041)", () => {
  it("takes the brand segment of a page title, not the whole title", () => {
    expect(siteNameOf({ title: "Staffing Solutions | Stone Bridge Personnel | Tyler, Fort Worth ...", host: "stonebridgepersonnel.com" })).toBe("Stone Bridge Personnel");
  });
  it("prefers the site's own name when the result has it", () => {
    expect(siteNameOf({ title: "Home | whatever", siteName: "Stone Bridge Personnel", host: "sbp.example" })).toBe("Stone Bridge Personnel");
  });
  it("falls back to the domain when no segment reads like the site", () => {
    expect(siteNameOf({ title: "Best Staffing Agencies in Texas | Top Picks", host: "www.example.org" })).toBe("example.org");
    expect(siteNameOf({ title: null, host: "www.example.org" })).toBe("example.org");
  });
});
