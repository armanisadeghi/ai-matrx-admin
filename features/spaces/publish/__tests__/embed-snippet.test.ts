// J3: a published Space goes onto somebody else's website — one snippet, the page in embed mode.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isEmbedQuery, spaceEmbedSnippet } from "../embed-snippet";

const ROOT = join(__dirname, "../../../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("spaceEmbedSnippet", () => {
  it("is an iframe of the public link in embed mode, named after the page", () => {
    const html = spaceEmbedSnippet("https://www.aimatrx.com/site/team-handbook", 'Team "Handbook"');
    expect(html).toMatch(/^<iframe /);
    expect(html).toContain('src="https://www.aimatrx.com/site/team-handbook?embed=1"');
    expect(html).toContain('aria-label="Team &quot;Handbook&quot;"');
    expect(html).toContain("height:720px");
  });

  it("an untitled page still gets a name", () => {
    expect(spaceEmbedSnippet("https://x.test/site/abc", null)).toContain('aria-label="Page"');
  });

  it("reads ?embed=1 and nothing else", () => {
    expect(isEmbedQuery("1")).toBe(true);
    expect(isEmbedQuery(["1"])).toBe(true);
    expect(isEmbedQuery("true")).toBe(false);
    expect(isEmbedQuery(undefined)).toBe(false);
  });
});

describe("the embed reaches the real page and the Share menu", () => {
  it("/site/<link> reads ?embed=1 and draws the page in embed mode", () => {
    const page = read("app/(link)/site/[slug]/page.tsx");
    expect(page).toMatch(/isEmbedQuery\(/);
    expect(page).toMatch(/<PublicSpace view=\{view\} embedded=\{embedded\}/);
    const space = read("features/spaces/public/PublicSpace.tsx");
    expect(space).toMatch(/data-public-embed=/);
  });

  it("Share > Publish offers the embed code", () => {
    const panel = read("features/spaces/collab/PublishPanel.tsx");
    expect(panel).toMatch(/spaceEmbedSnippet\(/);
    expect(panel).toContain('data-testid="publish-embed-copy"');
  });
});
