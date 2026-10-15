/**
 * A slow database at build time must not fail the release: v0.4.3266 died on
 * Vercel because generateStaticParams for /education/learn/[...slug] threw a
 * 9s restDeadline. The page pre-renders nothing and renders on demand instead.
 */

jest.mock("server-only", () => ({}));
jest.mock("@/lib/seo/search-engine-indexed.server", () => ({ searchEngineRobots: jest.fn() }));
jest.mock("@/features/education/components/LearnArticle", () => ({ LearnArticle: () => null }));
jest.mock("@/features/education/publishing/queries", () => ({
  listPublishedLearnDocs: jest.fn(),
  getPublishedLearnDoc: jest.fn(),
}));

import { listPublishedLearnDocs } from "@/features/education/publishing/queries";
import { generateStaticParams } from "@/app/(core)/education/learn/[...slug]/page";

const list = listPublishedLearnDocs as jest.Mock;

describe("learn doc static params", () => {
  it("survives a database that does not answer at build time", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    list.mockRejectedValueOnce(new Error("[learn_doc] published list failed: AbortError: database did not answer within the 9000ms server deadline"));
    await expect(generateStaticParams()).resolves.toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("pre-renders every published doc when the database answers", async () => {
    list.mockResolvedValueOnce([{ slug: "biology/cells" }, { slug: "math" }]);
    await expect(generateStaticParams()).resolves.toEqual([
      { slug: ["biology", "cells"] },
      { slug: ["math"] },
    ]);
  });
});
