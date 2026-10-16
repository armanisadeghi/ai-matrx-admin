/** @jest-environment jsdom */
import { renderToStaticMarkup } from "react-dom/server";
import { WelcomeSearchCards } from "../WelcomeSearchCards";

const sections: Record<string, unknown> = {};
jest.mock("@/features/marketing/seo/domain-research/useDomainSection", () => ({
  useDomainSection: (kind: string) => sections[kind],
}));
jest.mock("@/features/marketing/seo/domain-research/DomainResearchPage", () => ({
  seedKeywords: (rows: { keyword: string }[], max = 3) => rows.slice(0, max).map((r) => r.keyword),
}));
jest.mock("@/lib/web-domains/registry", () => ({ categoriesFor: () => [], liveKnownDomainRules: () => [] }));

const ready = (rows: unknown[]) => ({ state: { kind: "ready", data: { rows } }, buy: jest.fn(), approvalDialog: null });
const loading = { state: { kind: "loading" }, buy: jest.fn(), approvalDialog: null };

const slots = (html: string) => [...html.matchAll(/data-found-card="(\w+)" data-state="(\w+)"/g)].map((m) => `${m[1]}:${m[2]}`);

describe("the paid cards' slots are fixed from the first frame", () => {
  it("both slots wait while the reads run", () => {
    sections.ranked_keywords = loading;
    sections.serp_competitors = loading;
    const html = renderToStaticMarkup(<WelcomeSearchCards host="x.com" names={["x"]} />);
    expect(slots(html)).toEqual(["competitor:waiting", "buyers:waiting"]);
  });

  it("a buyers card that ends empty settles in its own slot instead of dropping out", () => {
    // every term names the owner: nothing to say about buyers
    sections.ranked_keywords = ready([{ keyword: "acme shoes" }]);
    sections.serp_competitors = ready([]);
    const html = renderToStaticMarkup(<WelcomeSearchCards host="acme.com" names={["acme"]} />);
    expect(slots(html)).toEqual(["competitor:retired", "buyers:retired"]);
  });
});
