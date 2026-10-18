import { lengthFit, scoreVideo } from "../videoRanking";

const NOW = new Date("2026-10-17T00:00:00Z");

describe("scoreVideo", () => {
  it("lets search evidence beat raw popularity", () => {
    const onTopic = scoreVideo(
      { preReadScore: 90, viewCount: 5_000, likeCount: 200, channelSubscriberCount: 3_000, publishedAt: "2025-06-01", durationSeconds: 600 },
      undefined,
      NOW,
    );
    const viralOffTopic = scoreVideo(
      { preReadScore: 5, viewCount: 20_000_000, likeCount: 900_000, channelSubscriberCount: 40_000_000, publishedAt: "2025-06-01", durationSeconds: 600 },
      undefined,
      NOW,
    );
    expect(onTopic.score).toBeGreaterThan(viralOffTopic.score);
  });

  it("scores an unmeasured signal as neutral, never zero", () => {
    const missing = scoreVideo({ preReadScore: 50 }, undefined, NOW);
    expect(missing.signals.reach).toBeNull();
    expect(missing.score).toBe(50);
  });

  it("uses keyword importance when no pre-read score exists", () => {
    const s = scoreVideo({ importance: 20 }, undefined, NOW);
    expect(s.signals.search).toBe(1);
  });

  it("stays within 0-100", () => {
    const max = scoreVideo(
      { preReadScore: 100, viewCount: 1e9, likeCount: 1e9, commentCount: 1e9, channelSubscriberCount: 1e9, publishedAt: NOW.toISOString(), durationSeconds: 900 },
      undefined,
      NOW,
    );
    expect(max.score).toBe(100);
  });
});

describe("lengthFit", () => {
  it("treats Shorts as thin and 3-60 min as the sweet spot", () => {
    expect(lengthFit(40)).toBeLessThan(lengthFit(600) ?? 0);
    expect(lengthFit(600)).toBe(1);
    expect(lengthFit(null)).toBeNull();
  });
});
