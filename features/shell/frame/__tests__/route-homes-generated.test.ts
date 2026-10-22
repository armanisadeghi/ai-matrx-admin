/**
 * THE FRAME'S ROUTE TABLE STAYS TRUE (ROLLOUT-PLAN Layer 0).
 *
 * route-homes.generated.ts is built from the product flows, route-homes.tsv, products.ts and the
 * route manifest. This fails when any of them moved and the file was not regenerated
 * (`pnpm frame:route-homes`), when a sidebar row links to a page that does not exist, or when the
 * frame's browser code reaches for the raw sources (route-flow.json, the flows, the TSV).
 */
import fs from "node:fs";
import path from "node:path";
import {
  GO_TO_PAGES_GENERATED_PATH,
  linkableRoutes,
  renderGoToPages,
  renderRouteHomes,
  ROUTE_HOMES_GENERATED_PATH,
} from "../route-homes.build";
import { FRAME_ROUTE_HOMES } from "../route-homes.generated";
import { fillPattern, patternParams, patternScore, resolveRouteHome } from "../routeHomeLookup";
import { PRODUCTS } from "../products";

it("the generated table matches its sources (run `pnpm frame:route-homes`)", () => {
  expect(fs.readFileSync(ROUTE_HOMES_GENERATED_PATH, "utf8")).toBe(renderRouteHomes());
  expect(fs.readFileSync(GO_TO_PAGES_GENERATED_PATH, "utf8")).toBe(renderGoToPages());
});

it("every product has an entry and every sidebar row a real page", () => {
  const linkable = linkableRoutes();
  const problems: string[] = [];
  for (const p of PRODUCTS) {
    const home = FRAME_ROUTE_HOMES.products[p.id];
    if (!home) {
      problems.push(`NO TABLE ROW for product ${p.id}`);
      continue;
    }
    if (!linkable.has(home.entry)) problems.push(`${p.id}: entry ${home.entry} is not a live route`);
    for (const [, label, pattern, fallback] of home.items) {
      if (!linkable.has(pattern)) problems.push(`${p.id} › ${label}: ${pattern} is not a live route`);
      if (!linkable.has(fallback) || fallback.includes("[")) problems.push(`${p.id} › ${label}: fallback ${fallback} is not a live page`);
    }
  }
  expect(problems).toEqual([]);
});

it("the frame's browser code never imports the raw route sources", () => {
  const host = path.join(__dirname, "../../frame-host");
  const files = [
    path.join(__dirname, "../route-homes.generated.ts"),
    path.join(__dirname, "../routeHomeLookup.ts"),
    ...fs.readdirSync(host).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(host, f)),
  ];
  const offenders = files.filter((f) => /from\s+["'][^"']*(route-flow\.json|\/flows["'/]|route-homes\.build|route-homes\.tsv)/.test(fs.readFileSync(f, "utf8")));
  expect(offenders.map((f) => path.relative(path.join(__dirname, "../../../.."), f))).toEqual([]);
});

describe("route lookup", () => {
  it("matches static, dynamic and catch-all segments, static first", () => {
    expect(patternScore("/notes", "/notes")).toBeGreaterThan(0);
    expect(patternScore("/notes/[id]", "/notes/abc")).toBeGreaterThan(0);
    expect(patternScore("/notes/new", "/notes/new")).toBeGreaterThan(patternScore("/notes/[id]", "/notes/new"));
    expect(patternScore("/x/[...p]", "/x")).toBe(-1);
    expect(patternScore("/x/[[...p]]", "/x")).toBeGreaterThan(0);
    expect(patternScore("/notes", "/notes/abc")).toBe(-1);
  });
  it("fills a sidebar link from the current page's params, or says it cannot", () => {
    const params = patternParams("/marketing/brands/[brandId]/seo", "/marketing/b1/seo");
    expect(fillPattern("/marketing/brands/[brandId]/websites", params)).toBe("/marketing/b1/websites");
    expect(fillPattern("/marketing/brands/[brandId]/websites", {})).toBeNull();
  });
  it("puts known pages in their product", () => {
    expect(resolveRouteHome(FRAME_ROUTE_HOMES, "/marketing/brands").productId).toBe("marketing");
    expect(resolveRouteHome(FRAME_ROUTE_HOMES, "/notes").productId).toBe("docs");
    expect(resolveRouteHome(FRAME_ROUTE_HOMES, "/agents/all").productId).toBe("intelligence");
    expect(resolveRouteHome(FRAME_ROUTE_HOMES, "/hr/people").productId).toBe("hr");
  });
});
