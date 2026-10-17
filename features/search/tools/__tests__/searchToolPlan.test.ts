import { adaptInput, adaptInputs, detectReviewLane, isToolTab, laneOf, TOOL_LANES, TOOL_TABS } from "../searchToolPlan";

describe("which review lane a pasted link belongs to", () => {
  it.each([
    ["https://apps.apple.com/us/app/duolingo/id570060128", "appstore"],
    ["https://play.google.com/store/apps/details?id=com.spotify.music", "play"],
    ["https://www.google.com/maps/place/Epoch+Coffee/@30.3,-97.7", "maps"],
    ["https://maps.app.goo.gl/AbC123", "maps"],
    ["https://www.trustpilot.com/review/www.apple.com", "trustpilot"],
  ])("%s → %s", (text, lane) => {
    expect(detectReviewLane(text)).toBe(lane);
  });

  it("names no lane for plain words or a bare website", () => {
    expect(detectReviewLane("Epoch Coffee Austin")).toBeNull();
    expect(detectReviewLane("www.example.com")).toBeNull();
    expect(detectReviewLane("   ")).toBeNull();
  });
});

describe("what each Tool's input holds", () => {
  it("takes the app number out of a store link, or keeps the digits", () => {
    expect(adaptInput("app_store_reviews", "product_id", "https://apps.apple.com/us/app/duolingo/id570060128?uo=4")).toBe("570060128");
    expect(adaptInput("app_store_reviews", "product_id", "389801252")).toBe("389801252");
    expect(adaptInput("app_store_reviews", "product_id", "Duolingo")).toBe("Duolingo");
  });

  it("turns an app number into the store page the page-reading Tool wants", () => {
    expect(adaptInput("data_app_store_reviews", "url", "570060128")).toBe("https://apps.apple.com/us/app/id570060128");
    expect(adaptInput("data_app_store_reviews", "url", "https://apps.apple.com/us/app/x/id1")).toBe("https://apps.apple.com/us/app/x/id1");
  });

  it("reduces a Trustpilot page or a link to the website Trustpilot lists", () => {
    expect(adaptInput("customer_reviews", "domain", "https://www.trustpilot.com/review/www.apple.com")).toBe("www.apple.com");
    expect(adaptInput("customer_reviews", "domain", "https://www.example.com/about")).toBe("example.com");
    expect(adaptInput("customer_reviews", "domain", "example.com")).toBe("example.com");
  });

  it("builds the Trustpilot page for a bare website, and leaves a Trustpilot link alone", () => {
    expect(adaptInput("data_trustpilot_reviews", "url", "example.com")).toBe("https://www.trustpilot.com/review/example.com");
    const page = "https://www.trustpilot.com/review/www.apple.com";
    expect(adaptInput("data_trustpilot_reviews", "url", page)).toBe(page);
  });

  it("passes every other Tool's input through as typed, and non-text values untouched", () => {
    expect(adaptInput("web_search_results", "query", "  best bikes  ")).toBe("best bikes");
    expect(adaptInputs("customer_reviews", { domain: "https://shop.example.com/x", limit: 5 })).toEqual({ domain: "shop.example.com", limit: 5 });
  });
});

describe("the catalog tabs", () => {
  it("has lanes for every tab and falls back to the first lane for an unknown one", () => {
    for (const tab of TOOL_TABS) expect(TOOL_LANES[tab].length).toBeGreaterThan(0);
    expect(laneOf("reviews", "nope").id).toBe("maps");
    expect(laneOf("reviews", "appstore").id).toBe("appstore");
  });

  it("recognises a tab only by its own name", () => {
    expect(isToolTab("reviews")).toBe(true);
    expect(isToolTab("places")).toBe(false);
    expect(isToolTab(null)).toBe(false);
  });

  it("never names a vendor a person would not recognise as where the reviews live", () => {
    const labels = Object.values(TOOL_LANES).flat().map((l) => l.label);
    for (const vendor of ["DataForSEO", "Bright Data", "treg", "Apify", "Litescrape", "Cloro", "Crawl4ai"]) {
      expect(labels.join(" ").toLowerCase()).not.toContain(vendor.toLowerCase());
    }
  });
});
