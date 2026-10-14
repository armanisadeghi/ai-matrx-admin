import {
  hasSmartAddPrefill,
  parseSmartAddPath,
  parseSmartAddUrl,
  patchSmartAddSearch,
  smartAddEnrichHref,
  smartAddHref,
} from "../smartAddUrl";

const RUN_A = "0f8fad5b-d9cb-469f-a165-70867728950e";
const RUN_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("smartAddUrl — paths", () => {
  it("reads each mode path, with or without the base", () => {
    expect(parseSmartAddPath("/marketing/brands/smart-add/company").mode).toBe("company");
    expect(parseSmartAddPath("/marketing/brands/smart-add/person").mode).toBe("person");
    expect(parseSmartAddPath("/person").mode).toBe("person");
    expect(parseSmartAddPath("/marketing/brands/smart-add/enrich/abc-123")).toEqual({ mode: null, enrichBrandId: "abc-123" });
  });

  it("ignores an unknown mode and a brand segment that could escape the path", () => {
    expect(parseSmartAddPath("/marketing/brands/smart-add/robots")).toEqual({ mode: null, enrichBrandId: null });
    expect(parseSmartAddPath("/marketing/brands/smart-add/enrich/..%2F")).toEqual({ mode: null, enrichBrandId: null });
    expect(parseSmartAddPath("/marketing/brands/smart-add")).toEqual({ mode: null, enrichBrandId: null });
  });

  it("builds the canonical links", () => {
    expect(smartAddHref()).toBe("/marketing/brands/smart-add/company");
    expect(smartAddHref({ mode: "person" })).toBe("/marketing/brands/smart-add/person");
    expect(smartAddHref({ website: "ritualcoffee.com" })).toBe("/marketing/brands/smart-add/company?website=ritualcoffee.com");
    expect(smartAddEnrichHref("brand 1")).toBe("/marketing/brands/smart-add/enrich/brand%201");
  });
});

describe("smartAddUrl — query", () => {
  it("round-trips a person deep link with readable params", () => {
    const href = smartAddHref({ mode: "person", name: "Ana Ruiz", occupation: "Chef", company: "Ruiz Kitchen", city: "Austin" });
    const url = new URL(href, "http://x");
    const a = parseSmartAddUrl(url.pathname, url.search);
    expect(a.mode).toBe("person");
    expect(a.prefill).toEqual({ name: "Ana Ruiz", occupation: "Chef", company: "Ruiz Kitchen", city: "Austin" });
    expect(a.via).toBe("name");
    expect(hasSmartAddPrefill(a)).toBe(true);
  });

  it("a social prefill implies the social way in; a profile URL survives encoding", () => {
    const href = smartAddHref({ social: "https://instagram.com/ritualcoffee?x=1" });
    const url = new URL(href, "http://x");
    const a = parseSmartAddUrl(url.pathname, url.search);
    expect(a.prefill.social).toBe("https://instagram.com/ritualcoffee?x=1");
    expect(a.via).toBe("social");
  });

  it("drops invalid values safely and reads names case-insensitively", () => {
    const a = parseSmartAddUrl(
      "/marketing/brands/smart-add/company",
      `?Website=ritualcoffee.com&via=nonsense&view=grid&run=not-a-uuid&run=${RUN_A}&platform=myspace&name=${"x".repeat(400)}`,
    );
    expect(a.prefill).toEqual({ website: "ritualcoffee.com" });
    expect(a.via).toBe("website");
    expect(a.view).toBeNull();
    expect(a.runs).toEqual([RUN_A]);
  });

  it("platform only counts beside a social value", () => {
    expect(parseSmartAddUrl("/company", "?platform=tiktok").prefill.platform).toBeUndefined();
    expect(parseSmartAddUrl("/company", "?social=ritual&platform=TikTok").prefill.platform).toBe("tiktok");
  });

  it("/person opens the name fields; /company opens the chooser", () => {
    expect(parseSmartAddUrl("/marketing/brands/smart-add/person", "").via).toBe("name");
    expect(parseSmartAddUrl("/marketing/brands/smart-add/person", "?social=@ana").via).toBe("social");
    expect(parseSmartAddUrl("/marketing/brands/smart-add/company", "").via).toBeNull();
  });

  it("no prefill means no auto-start", () => {
    expect(hasSmartAddPrefill(parseSmartAddUrl("/company", "?via=website"))).toBe(false);
    expect(hasSmartAddPrefill(parseSmartAddUrl("/person", "?city=Austin"))).toBe(false);
  });
});

describe("smartAddUrl — patch keeps what it does not own", () => {
  it("keeps ?panels= and other keys while writing runs and fields", () => {
    const next = patchSmartAddSearch("panels=smart_add_helper:linkedin&website=old.com", { website: "new.com", runs: [RUN_A, RUN_B] });
    expect(next.get("panels")).toBe("smart_add_helper:linkedin");
    expect(next.get("website")).toBe("new.com");
    expect(next.getAll("run")).toEqual([RUN_A, RUN_B]);
  });

  it("null removes a key; undefined leaves it", () => {
    const next = patchSmartAddSearch(`website=a.com&social=@a&run=${RUN_A}`, { social: null, runs: [] });
    expect(next.get("website")).toBe("a.com");
    expect(next.has("social")).toBe(false);
    expect(next.has("run")).toBe(false);
  });

  it("equal states give equal strings (canonical order)", () => {
    const a = patchSmartAddSearch("social=@a&website=a.com", {}).toString();
    const b = patchSmartAddSearch("website=a.com&social=@a", {}).toString();
    expect(a).toBe(b);
  });

  it("only an explicit via is written; an implied one stays implied", () => {
    expect(patchSmartAddSearch("", { via: "social" }).get("via")).toBe("social");
    expect(patchSmartAddSearch("website=a.com", {}).has("via")).toBe(false);
    expect(patchSmartAddSearch("via=website&website=a.com", { via: null }).has("via")).toBe(false);
    const a = parseSmartAddUrl("/company", "website=a.com");
    expect([a.via, a.viaParam]).toEqual(["website", null]);
  });
});
