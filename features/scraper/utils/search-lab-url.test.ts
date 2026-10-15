import { buildSearchLabQuery, parseSearchLabParams } from "./search-lab-url";
import {
  DEFAULT_KEYWORD_SEARCH_OPTIONS,
  countChangedOptions,
  kindToSearchItems,
} from "@/features/scraper/hooks/useScraperKeywordSearchForm";

jest.mock("@/hooks/useBackendApi", () => ({ useBackendApi: () => ({}) }));
jest.mock("@/features/search/service", () => ({
  runKindSearch: jest.fn(),
  runSearchDoor: jest.fn(),
  socialDoorBody: jest.fn(),
  SEARCH_DOORS: {},
}));
jest.mock("@/hooks/brokers/useGeolocation", () => ({ useGeolocation: () => async () => null }));

describe("search lab URL", () => {
  it("omits every default, so a plain search is just ?q=", () => {
    const state = parseSearchLabParams(new URLSearchParams("q=coffee"));
    expect(state.engine).toBe("brave");
    expect(state.vertical).toBe("web");
    expect(state.options).toEqual(DEFAULT_KEYWORD_SEARCH_OPTIONS);
    expect(buildSearchLabQuery(state)).toBe("q=coffee");
  });

  it("round-trips every non-default option", () => {
    const qs =
      "q=pizza&engine=compare&type=places&n=20&country=gb&lang=fr&safe=strict&time=week&page=2&loc=Austin%2C+Texas&device=mobile&ai=1&near=me";
    const state = parseSearchLabParams(new URLSearchParams(qs));
    expect(state.engine).toBe("compare");
    expect(state.vertical).toBe("places");
    expect(state.count).toBe(20);
    expect(state.options.location).toBe("Austin, Texas");
    expect(state.options.nearMe).toBe(true);
    expect(countChangedOptions(state.options)).toBe(9);
    expect(parseSearchLabParams(new URLSearchParams(buildSearchLabQuery(state)))).toEqual(state);
  });

  it("never turns location on from anything but near=me", () => {
    expect(parseSearchLabParams(new URLSearchParams("q=x&near=1")).options.nearMe).toBe(false);
    expect(parseSearchLabParams(new URLSearchParams("q=x&near=40.1,-73.2")).options.nearMe).toBe(false);
  });

  it("drops values outside the contract instead of sending them", () => {
    const state = parseSearchLabParams(
      new URLSearchParams("q=x&engine=bing&type=maps&n=900&country=usa&page=50"),
    );
    expect(state.engine).toBe("brave");
    expect(state.vertical).toBe("web");
    expect(state.count).toBe(10);
    expect(state.options.country).toBe("us");
    expect(state.options.page).toBe(1);
  });
});

describe("search URL — the newer tabs", () => {
  it("carries the social platform only on the social tab", () => {
    const state = parseSearchLabParams(new URLSearchParams("q=nike&type=social&sp=tiktok"));
    expect(state.vertical).toBe("social");
    expect(state.socialPlatform).toBe("tiktok");
    expect(buildSearchLabQuery(state)).toBe("q=nike&type=social&sp=tiktok");
    expect(buildSearchLabQuery({ ...state, vertical: "web" })).toBe("q=nike");
  });

  it("accepts every tab and refuses an unknown platform", () => {
    for (const type of ["shopping", "jobs", "trends"]) {
      expect(parseSearchLabParams(new URLSearchParams(`q=x&type=${type}`)).vertical).toBe(type);
    }
    expect(parseSearchLabParams(new URLSearchParams("q=x&type=social&sp=myspace")).socialPlatform).toBe("all");
  });
});

describe("kindToSearchItems — the newer kinds", () => {
  it("flattens products, jobs, posts and profiles", () => {
    const items = kindToSearchItems("q", {
      __kind: "shopping_results",
      source: "google",
      products: [{ __kind: "product_result", title: "Shoe", url: "https://s.test", price_text: "$90", position: 1 }],
      jobs: [{ __kind: "job_result", title: "Barista", company_name: "Cafe", location: "Austin", apply_url: "https://j.test" }],
      posts: [{ __kind: "social_post", caption: "hello", url: "https://t.test/p", platform: "tiktok" }],
      profiles: [{ __kind: "social_profile", handle: "nike", display_name: "Nike", url: "https://t.test/@nike" }],
    });
    expect(items.map((i) => [i.type, i.title, i.url])).toEqual([
      ["product", "Shoe", "https://s.test"],
      ["job", "Barista", "https://j.test"],
      ["social_post", "hello", "https://t.test/p"],
      ["social_profile", "Nike", "https://t.test/@nike"],
    ]);
    expect(items[1].description).toBe("Cafe · Austin");
  });
});

describe("kindToSearchItems", () => {
  it("flattens every section of the kind into workspace hits", () => {
    const items = kindToSearchItems("q", {
      __kind: "web_search_results",
      source: "google",
      results: [{ __kind: "web_result", title: "A", url: "https://a.test", snippet: "s", position: 1 }],
      images: [{ __kind: "image_result", title: "I", image_url: "https://i.test/x.jpg", page_url: "https://i.test", position: 1 }],
      places: [{ __kind: "local_place", name: "P", website_url: "https://p.test", address: { display: "1 Main St" }, position: 1 }],
    });
    expect(items.map((i) => [i.type, i.title, i.url, i.source])).toEqual([
      ["web", "A", "https://a.test", "google"],
      ["image", "I", "https://i.test", "google"],
      ["place", "P", "https://p.test", "google"],
    ]);
    expect(items[2].description).toBe("1 Main St");
  });
});
