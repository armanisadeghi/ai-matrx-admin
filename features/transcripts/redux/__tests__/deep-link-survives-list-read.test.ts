/**
 * A transcript opened by id (the processor's `?focus=<id>`, a board tile) that is NOT in the person's
 * "mine" list must survive the list read that lands after it. Red before the fix: the list read
 * replaced `items`, dropped the deep-linked row and moved the selection to the first row of the list,
 * so the link opened whatever transcript came first.
 */
import reducer, {
  activeTranscriptChanged,
  transcriptUpserted,
  transcriptsFetched,
} from "../transcriptsSlice";
import type { Transcript } from "../../types";

const row = (id: string, title = id) => ({ id, title }) as unknown as Transcript;

describe("transcripts slice: a deep-linked row outlives the list read", () => {
  it("keeps the opened row and its selection when the list does not carry it", () => {
    let s = reducer(undefined, { type: "init" });
    s = reducer(s, transcriptUpserted(row("linked")));
    s = reducer(s, activeTranscriptChanged("linked"));
    s = reducer(s, transcriptsFetched([row("a"), row("b")]));
    expect(s.activeId).toBe("linked");
    expect(s.items.map((t) => t.id)).toContain("linked");
    expect(s.items.map((t) => t.id)).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("a board tile's row stays readable by id after the list read", () => {
    let s = reducer(undefined, { type: "init" });
    s = reducer(s, transcriptUpserted(row("tile")));
    s = reducer(s, transcriptsFetched([row("a")]));
    expect(s.items.some((t) => t.id === "tile")).toBe(true);
  });

  it("still falls back to the first row when nothing was selected", () => {
    let s = reducer(undefined, { type: "init" });
    s = reducer(s, transcriptsFetched([row("a"), row("b")]));
    expect(s.activeId).toBe("a");
  });

  it("does not duplicate a linked row once the list carries it", () => {
    let s = reducer(undefined, { type: "init" });
    s = reducer(s, transcriptUpserted(row("x")));
    s = reducer(s, transcriptsFetched([row("x"), row("a")]));
    expect(s.items.filter((t) => t.id === "x")).toHaveLength(1);
  });
});
