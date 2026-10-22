/**
 * Lane L4 (owner ruling 2026-10-22): every data source opens on what a person knows — search fields
 * in plain words, a name box for a link-only source — with the page address under Advanced; and the
 * results open on a short, plainly named column set with developer fields never shown first.
 */
import { buildInput, type DataSource } from "../contract";
import { plainField, plainOption } from "../inputWords";
import { answerOf, lookupItemFor, nameFinderFor } from "../nameFinders";
import { isDeveloperField, openingHiddenFields, sourceColumns } from "../openingColumns";
import { LINK_OPTION, modeOf } from "../SourceInputFields";
import { LIBRARY_TASKS } from "../library/tasks";

jest.mock("@/components/official/ProInput", () => ({ ProInput: () => null }));
jest.mock("@/features/comparison/server", () => ({ lookupItems: jest.fn() }));

const zillow: DataSource = {
  key: "zillow_listing",
  label: "Zillow homes",
  group: "Real estate",
  verified: true,
  usd_per_record: null,
  input: {
    kind: "url",
    fields: [
      { name: "url", label: "Page address", required: true, type: "url" },
      { name: "listingCategory", label: "For sale, for rent or sold", required: false },
      { name: "HomeType", label: "Home type", required: false },
    ],
    discover_options: { input_filters: ["location", "listingCategory", "HomeType"] },
  },
};

describe("search first, link under Advanced", () => {
  it("opens a search-capable source on its search, never the link", () => {
    expect(modeOf(zillow, null)).toEqual({ mode: "search", option: "input_filters" });
  });
  it("keeps the link when the person chose it or a link is already in the form", () => {
    expect(modeOf(zillow, LINK_OPTION).mode).toBe("link");
    expect(modeOf(zillow, null, { url: "https://www.zillow.com/homedetails/x/1_zpid/" }).mode).toBe("link");
  });
  it("sends Where + status + home type as the provider's own values", () => {
    const built = buildInput(zillow, { location: "Tacoma, WA", listingCategory: "House for sale", HomeType: "Houses" }, modeOf(zillow, null).option);
    expect(built.input).toEqual({ inputs: [{ location: "Tacoma, WA", listingCategory: "House for sale", HomeType: "Houses" }] });
  });
  it("names options and fields in plain words", () => {
    expect(plainOption("input_filters")).toEqual({ label: "By place", advanced: false });
    expect(plainOption("search_url").advanced).toBe(true);
    expect(plainOption("best_sellers_url").advanced).toBe(true);
    expect(plainOption("category_url").label).toBe("By category page");
    expect(plainField({ name: "location", label: "Location", required: true }).label).toBe("Where");
    expect(plainField({ name: "keyword", label: "Search words", required: false }, "linkedin_jobs_search").label).toBe("Company or role");
    expect(plainField({ name: "category_url", label: "Category url", required: true }).advanced).toBe(true);
  });
  it("offers Zillow's status and home type as fixed choices", () => {
    expect(plainField({ name: "listingCategory", label: "x", required: false }).choices?.map((c) => c.value)).toEqual(["House for sale", "House for rent", "Sold"]);
    expect(plainField({ name: "HomeType", label: "x", required: false }).choices?.map((c) => c.label)).toContain("Condos");
  });
});

describe("name → page through compare's lookup", () => {
  it("asks for a page on the source's own site", () => {
    expect(lookupItemFor(nameFinderFor("g2_reviews")!, "Slack")).toEqual({ label: "Slack", inputs: { name: "Slack", site: "g2.com/products" } });
    expect(lookupItemFor(nameFinderFor("trustpilot_reviews")!, "apple.com")).toMatchObject({ website: "apple.com" });
    expect(lookupItemFor(nameFinderFor("tiktok_posts")!, "@nasa")).toEqual({ url: "https://www.tiktok.com/@nasa" });
    expect(lookupItemFor(nameFinderFor("tiktok_posts")!, "two words")).toBeNull();
  });
  it("uses the page when certain, asks 'Is this them?' when not", () => {
    const m = (url: string, name = "Slack") => ({ item: { url }, name, detail: "", logo_url: null, website: null, url, rating: null, reviews_count: null });
    const found = answerOf(nameFinderFor("g2_reviews")!, { index: 0, query: "Slack", status: "found", match: m("https://g2.com/products/slack"), candidates: [], message: null });
    expect(found).toMatchObject({ status: "found", page: "https://g2.com/products/slack/reviews" });
    const choose = answerOf(nameFinderFor("linkedin_company")!, { index: 0, query: "Acme", status: "choose", match: null, candidates: [m("https://linkedin.com/company/acme"), m("https://linkedin.com/company/acme-co")], message: null });
    expect(choose.status === "choose" && choose.candidates.length).toBe(2);
  });
  it("keeps a store product to the source's own store", () => {
    const walmart = { item: { url: "https://www.walmart.com/ip/x/1" }, name: "Tumbler", detail: "", logo_url: null, website: null, url: "https://www.walmart.com/ip/x/1", rating: null, reviews_count: null };
    expect(answerOf(nameFinderFor("amazon_product")!, { index: 0, query: "Tumbler", status: "found", match: walmart, candidates: [], message: null }).status).toBe("not_found");
  });
});

describe("one column registry", () => {
  const out = ["zpid", "city", "state", "homeStatus", "address", "isListingClaimedByCurrentSignedInUser", "bedrooms", "bathrooms", "price", "yearBuilt", "isCurrentSignedInUserVerifiedOwner"];
  it("opens on the curated plain-named set, developer fields last", () => {
    const cols = sourceColumns("zillow_listing", out);
    expect(cols.opening.map((c) => c.label)).toEqual(["Address", "Price", "Beds", "Baths", "Status", "Built", "City"]);
    expect(cols.all.slice(-2).map((c) => c.field)).toEqual(["isListingClaimedByCurrentSignedInUser", "isCurrentSignedInUserVerifiedOwner"]);
    expect(isDeveloperField("Is listing claimed by current signed in user")).toBe(true);
    expect(isDeveloperField("price")).toBe(false);
  });
  it("starts the fetched table with developer fields hidden", () => {
    const fields = out.map((k) => ({ key: k, name: k }));
    const hidden = openingHiddenFields(fields, out, 8, "zillow_listing")!;
    expect(hidden).toContain("isListingClaimedByCurrentSignedInUser");
    expect(hidden).not.toContain("price");
  });
});

describe("task cards fit the job", () => {
  const task = (id: string) => LIBRARY_TASKS.find((t) => t.id === id)!;
  it("puts the keyword searches on their own card", () => {
    expect(task("find-products").sourceKeys).toEqual(["amazon_product_search", "walmart_product_search", "google_shopping_search", "facebook_marketplace_search"]);
    expect(task("product-price").sourceKeys).not.toContain("amazon_product_search");
  });
  it("top posts returns posts, hiring takes a company", () => {
    expect(task("creator-posts").sourceKeys.every((k) => k.endsWith("_posts"))).toBe(true);
    expect(task("competitor-hiring").sourceKeys).not.toContain("linkedin_job");
  });
});
