/**
 * /shape-preview must have a store: the shape components it renders read Redux, and the `(link)` group gives
 * routes no providers of their own. Without this layout the live page crashed before it fetched the bundle, so
 * aidream's shape preview and inspection saw "never ready" for every component (2026-10-21, found on live).
 */
import fs from "node:fs";
import path from "node:path";

describe("/shape-preview layout", () => {
  const dir = __dirname;

  it("exists and wraps the page in the link providers", () => {
    const layout = fs.readFileSync(path.join(dir, "layout.tsx"), "utf8");
    expect(layout).toContain('import { LinkProviders } from "@/components/public-link/LinkProviders"');
    expect(layout).toMatch(/<LinkProviders>\{children\}<\/LinkProviders>/);
  });

  it("is a server layout (no client directive) so the page keeps its metadata", () => {
    const layout = fs.readFileSync(path.join(dir, "layout.tsx"), "utf8");
    expect(layout).not.toMatch(/^["']use client["']/m);
  });
});
