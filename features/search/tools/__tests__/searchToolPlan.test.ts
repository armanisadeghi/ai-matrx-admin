import {
  adaptInput,
  adaptInputs,
  detectReviewLane,
  finderQuery,
  finderSource,
  isToolTab,
  laneCanFind,
  laneOf,
  needsFinder,
  pickCandidates,
  pickPlaces,
  TOOL_LANES,
  TOOL_TABS,
} from "../searchToolPlan";

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

  it("takes the package name out of a Google Play link, or builds the link a page-reading Tool wants", () => {
    expect(adaptInput("play_store_reviews", "product_id", "https://play.google.com/store/apps/details?id=com.duolingo&hl=en")).toBe("com.duolingo");
    expect(adaptInput("play_store_reviews", "product_id", "com.duolingo")).toBe("com.duolingo");
    expect(adaptInput("data_google_play_reviews", "url", "com.spotify.music")).toBe("https://play.google.com/store/apps/details?id=com.spotify.music");
  });

  it("reduces a Trustpilot page or a link to the website Trustpilot lists", () => {
    expect(adaptInput("customer_reviews", "domain", "https://www.trustpilot.com/review/www.apple.com")).toBe("www.apple.com");
    expect(adaptInput("customer_reviews", "domain", "https://www.example.com/about")).toBe("example.com");
    expect(adaptInput("customer_reviews", "domain", "example.com")).toBe("example.com");
  });

  it("gives the Maps Tool a full link, and reads the app number out of id916819108", () => {
    expect(adaptInput("place_reviews", "place", "maps.app.goo.gl/AbC123")).toBe("https://maps.app.goo.gl/AbC123");
    expect(adaptInput("place_reviews", "place", "ChIJG-gJw2vKRIYROWi2uwOp8QE")).toBe("ChIJG-gJw2vKRIYROWi2uwOp8QE");
    expect(adaptInput("app_store_reviews", "product_id", "id916819108")).toBe("916819108");
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

describe("finding an app or a business by its name", () => {
  it("asks for choices only when words stand where a link or id was wanted", () => {
    expect(needsFinder("appstore", "Gumroad")).toBe(true);
    expect(needsFinder("appstore", "916819108")).toBe(false);
    expect(needsFinder("appstore", "https://apps.apple.com/us/app/gumroad/id916819108")).toBe(false);
    expect(needsFinder("play", "com.spotify.music")).toBe(false);
    expect(needsFinder("play", "Spotify")).toBe(true);
    expect(needsFinder("trustpilot", "example.com")).toBe(false);
    expect(needsFinder("trustpilot", "Ten Thousand")).toBe(true);
    expect(needsFinder("maps", "Epoch Coffee Austin")).toBe(true);
    expect(needsFinder("maps", "ChIJG-gJw2vKRIYROWi2uwOp8QE")).toBe(false);
    expect(needsFinder("maps", "https://www.google.com/maps/place/Epoch+Coffee")).toBe(false);
    expect(needsFinder("appstore", "   ")).toBe(false);
    // a link pasted without its https://, and the id as the store prints it, are not names
    expect(needsFinder("appstore", "apps.apple.com/us/app/gumroad/id916819108")).toBe(false);
    expect(needsFinder("appstore", "id916819108")).toBe(false);
    expect(needsFinder("play", "play.google.com/store/apps/details?id=com.duolingo")).toBe(false);
    expect(needsFinder("maps", "maps.app.goo.gl/AbC123")).toBe(false);
  });

  it("looks only where the thing lives", () => {
    expect(laneCanFind("appstore")).toBe(true);
    expect(laneCanFind("maps")).toBe(true);
    expect(finderSource("maps")).toBe("places");
    expect(finderSource("appstore")).toBe("web");
    expect(finderQuery("appstore", " Gumroad ")).toBe("Gumroad app site:apps.apple.com");
    expect(finderQuery("nope", "x")).toBeNull();
  });

  it("keeps only the pages that are the app itself, once each, with the site's own suffix dropped", () => {
    const hits = [
      { title: "Gumroad on the App Store", url: "https://apps.apple.com/us/app/gumroad/id916819108" },
      { title: "Gumroad on the App Store", url: "https://apps.apple.com/us/app/gumroad/id916819108?uo=4" },
      { title: "Top creator apps", url: "https://apps.apple.com/us/charts/iphone" },
      { title: "Linktree: Link in Bio Creator on the App Store", url: "https://apps.apple.com/us/app/linktree/id1593515263" },
      { title: "Not a store", url: "https://example.com/id12345" },
    ];
    expect(pickCandidates("appstore", hits)).toEqual([
      { label: "Gumroad", caption: "App Store", value: "https://apps.apple.com/us/app/gumroad/id916819108" },
      { label: "Linktree: Link in Bio Creator", caption: "App Store", value: "https://apps.apple.com/us/app/linktree/id1593515263" },
    ]);
    expect(pickCandidates("trustpilot", [{ title: "Apple Reviews | Read Customer Service Reviews of apple.com", url: "https://www.trustpilot.com/review/apple.com" }])).toEqual([
      { label: "Apple", caption: "Trustpilot", value: "https://www.trustpilot.com/review/apple.com" },
    ]);
    expect(pickCandidates("maps", hits)).toEqual([]);
  });

  it("offers the businesses Google knows, each with the id the reviews Tool takes", () => {
    const places = [
      { name: "Epoch Coffee", place_id: "ChIJG-gJw2vKRIYROWi2uwOp8QE", address: { display: "221 W North Loop Blvd, Austin, TX 78751, United States" } },
      { name: "Epoch Coffee", place_id: "ChIJG-gJw2vKRIYROWi2uwOp8QE" },
      { name: "A cafe", place_id: "brave-123" },
      { name: "No id" },
    ];
    expect(pickPlaces(places)).toEqual([
      { label: "Epoch Coffee", caption: "221 W North Loop Blvd, Austin, TX 78751", value: "ChIJG-gJw2vKRIYROWi2uwOp8QE" },
    ]);
  });
});
