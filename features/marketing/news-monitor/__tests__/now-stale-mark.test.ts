/**
 * Seven surfaced stories (2026-10-22) read `freshness_status = 'stale'` while the
 * surfaced list showed them like fresh news. The server marks a story that
 * surfaced on an earlier run and later read stale (`metadata.now_stale_at`);
 * the surfaced row shows "Now stale" from this reader.
 */
import { nowStaleAt } from "../run-document";

describe("nowStaleAt", () => {
  it("reads the mark on a surfaced story", () => {
    expect(
      nowStaleAt({ status: "surfaced", metadata: { now_stale_at: "2026-10-07T14:10:01Z", last_seen_at: "x" } }),
    ).toBe("2026-10-07T14:10:01Z");
  });

  it("is null for a fresh surfaced story, a story that is not surfaced, or no row", () => {
    expect(nowStaleAt({ status: "surfaced", metadata: { last_seen_at: "x" } })).toBeNull();
    expect(nowStaleAt({ status: "watching", metadata: { now_stale_at: "2026-10-07T14:10:01Z" } })).toBeNull();
    expect(nowStaleAt({ status: "surfaced", metadata: null })).toBeNull();
    expect(nowStaleAt(undefined)).toBeNull();
  });
});
