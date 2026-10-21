/**
 * Review 5, G5/G6/G13: a block parser never invents data. A value the source does not state stays
 * empty and the block draws nothing for it: no default title, date, category, issue or finding.
 */
import { parseTimelineMarkdown } from "../timeline/parseTimelineMarkdown";
import { parseTroubleshootingMarkdown } from "../troubleshooting/parseTroubleshootingMarkdown";
import { parseProgressMarkdown } from "../progress/parseProgressMarkdown";
import { parseResourcesMarkdown } from "../resources/parseResourcesMarkdown";
import { parseResearchMarkdown } from "../research/parseResearchMarkdown";

describe("parsers never invent", () => {
  it("timeline: no title, no 'TBD' date", () => {
    const t = parseTimelineMarkdown("**Phase 1**\n- **Kickoff**\n  Everyone meets.\n")!;
    expect(t.title).toBe("");
    for (const e of t.periods.flatMap((p) => p.events)) expect(e.date).toBe("");
  });

  it("troubleshooting: a heading and bullets make no 'General Issue'", () => {
    const g = parseTroubleshootingMarkdown("### The app will not start\n- Check the cable\n- Restart the router\n");
    expect(g.issues).toEqual([]);
    expect(g.looseLines).toEqual(["Check the cable", "Restart the router"]);
    expect(JSON.stringify(g)).not.toMatch(/General Issue|Unknown|No specific symptoms|General Solution/);
    expect(parseTroubleshootingMarkdown("**Symptom:** Slow\n").title).toBe("");
  });

  it("progress and resources: no default title or category name", () => {
    const p = parseProgressMarkdown("- [x] Plan\n- [ ] Ship\n");
    expect([p.title, p.phases[0].name]).toEqual(["", ""]);
    const r = parseResourcesMarkdown("- [Docs](https://example.com/docs)\n");
    expect(r.title).toBe("");
    for (const c of r.categories) expect(c.name).toBe("");
  });

  it("research: no placeholder overview, introduction, conclusion, source or finding title", () => {
    const r = parseResearchMarkdown("## Findings\nSome plain text with no structure.\n")!;
    expect(r.title).toBe("");
    expect([r.overview, r.introduction, r.conclusion]).toEqual(["", "", ""]);
    expect(JSON.stringify(r)).not.toMatch(/No overview found|No introduction found|No conclusion found|Multiple Sources|General Research Content/);
  });
});
