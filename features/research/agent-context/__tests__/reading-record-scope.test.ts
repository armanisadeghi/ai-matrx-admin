import { buildResearchContextData } from "../buildResearchContextData";
import type { ResearchReadingRecord } from "../readingRecord";

const record: ResearchReadingRecord = {
  type: "research_synthesis",
  id: "aa849199-3e90-4c54-9209-e88e8b595649",
  title: "Topic Report",
  version: 3,
  kind: "topic report",
  body: "# Wage and hour\nCalifornia maintains one of the most employee-protective regimes.",
  comments: [
    {
      id: "5c6a3673-610f-4b5e-8bff-d6e853ea4181",
      quote: "California maintains one of the most emp",
      body: "Cite the specific Labor Code section for this claim.",
      suggested_text: null,
      author: "Dana Whitfield",
      mine: true,
      resolved: false,
      attached: true,
      created_at: "2026-10-12T04:15:20Z",
      replies: [],
    },
  ],
  notes: [],
};

describe("research scope carries the record open in the reader", () => {
  it("hands agents the record, its comment threads and the person's highlights", () => {
    const scope = buildResearchContextData({ readingRecord: record });
    expect(scope.open_record).toEqual({ type: "research_synthesis", id: record.id, title: "Topic Report", version: 3, kind: "topic report" });
    expect(scope.record_comments).toEqual(record.comments);
    expect(scope.my_record_notes).toEqual([]);
    // Its body is what the agent acts on when nothing else is named.
    expect(scope.content).toBe(record.body);
  });

  it("says nothing about a record when none is open", () => {
    const scope = buildResearchContextData({});
    expect(scope.open_record).toBeUndefined();
    expect(scope.record_comments).toBeUndefined();
  });

  it("omits the lists (never an empty claim) while the reading set is still loading", () => {
    const { comments: _c, notes: _n, ...loading } = record;
    const scope = buildResearchContextData({ readingRecord: loading });
    expect(scope.open_record).toBeDefined();
    expect(scope.record_comments).toBeUndefined();
    expect(scope.my_record_notes).toBeUndefined();
  });
});

describe("records read in place reach the agent too", () => {
  it("lists each in-place record with its comments", () => {
    const inline = [{ record: { type: "research_analysis" as const, id: "0479b3b6-1d6e-4c55-9b7e-2f0b7b1f8a10", title: "Analysis of dir.ca.gov" }, comments: record.comments!, notes: [] }];
    expect(buildResearchContextData({ inlineRecords: inline }).page_record_comments).toEqual(inline);
    expect(buildResearchContextData({ inlineRecords: [] }).page_record_comments).toBeUndefined();
  });
});

