import { groupReadingSets, readingSetCounts, renderReadingSetForAgent } from "../record-annotations-batch";
import { annotationInclusion } from "@/features/research/resources/types";

const rec = "c3185dd8-4dea-470b-9a64-8435fdc6f90d";
const rows = [
  { entity_id: rec, item_kind: "comment" as const, id: "c1", parent_id: null, body: "Cite the specific Labor Code section.", quote: "California maintains", suggested_text: null, resolved: false, author: "Dana Whitfield", mine: false, created_at: "2026-10-12T04:00:00Z" },
  { entity_id: rec, item_kind: "reply" as const, id: "r1", parent_id: "c1", body: "Section 510 covers it.", quote: null, suggested_text: null, resolved: false, author: "Luis Ortega", mine: true, created_at: "2026-10-12T04:05:00Z" },
  { entity_id: rec, item_kind: "comment" as const, id: "c2", parent_id: null, body: "Done already.", quote: null, suggested_text: null, resolved: true, author: "Dana Whitfield", mine: false, created_at: "2026-10-12T04:06:00Z" },
  { entity_id: rec, item_kind: "comment" as const, id: "c3", parent_id: null, body: "Tighten this.", quote: "heavily corroborated", suggested_text: "well corroborated", resolved: false, author: "Dana Whitfield", mine: false, created_at: "2026-10-12T04:07:00Z" },
  { entity_id: rec, item_kind: "reply" as const, id: "r9", parent_id: "gone", body: "orphan", quote: null, suggested_text: null, resolved: false, author: null, mine: false, created_at: "2026-10-12T04:08:00Z" },
  { entity_id: rec, item_kind: "note" as const, id: "n1", parent_id: null, body: "key point", quote: "the framework", suggested_text: null, resolved: false, author: null, mine: true, created_at: "2026-10-12T04:09:00Z" },
];

describe("a record's reading set for an agent", () => {
  const set = groupReadingSets(rows).get(rec);

  it("groups replies under their thread and drops orphans", () => {
    expect(set?.comments.map((c) => [c.id, c.replies.map((r) => r.id)])).toEqual([["c1", ["r1"]], ["c2", []], ["c3", []]]);
    expect(readingSetCounts(set)).toEqual({ open: 2, resolved: 1, notes: 1 });
  });

  it("hands over only open threads, with passage, author, replies and suggestions", () => {
    expect(renderReadingSetForAgent(set, { comments: true, notes: false })).toBe([
      "### Reader comments (open — address each one)",
      '1. On the passage: "California maintains"',
      "   Comment (Dana Whitfield): Cite the specific Labor Code section.",
      "   Reply (Luis Ortega): Section 510 covers it.",
      '2. On the passage: "heavily corroborated"',
      "   Comment (Dana Whitfield): Tighten this.",
      "   Suggested replacement: well corroborated",
    ].join("\n"));
  });

  it("adds the person's own notes only when asked, and nothing when both are off", () => {
    expect(renderReadingSetForAgent(set, { comments: false, notes: true })).toBe('### My highlights and notes\n1. Highlighted: "the framework" — key point');
    expect(renderReadingSetForAgent(set, { comments: false, notes: false })).toBe("");
  });

  it("defaults comments ON and notes OFF for a saved selector", () => {
    expect(annotationInclusion({})).toEqual({ comments: true, notes: false });
    expect(annotationInclusion({ annotations: { comments: false, notes: true } })).toEqual({ comments: false, notes: true });
  });
});
