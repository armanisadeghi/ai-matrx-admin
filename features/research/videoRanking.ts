/**
 * Video ranking — how a topic's YouTube videos are ordered, the video twin of
 * `ranking.ts` (web sources).
 *
 * A video's score blends what the SEARCH said about it (the same pre-read
 * source score web pages get: search rank, keyword breadth, authority) with
 * what YouTube says about it (reach, engagement, channel size, freshness, and
 * whether its length suits learning). Search evidence dominates, as it does for
 * web pages: a viral video that ranked for nothing never beats an on-topic one.
 *
 * Pure + config-driven: tweak VIDEO_RANKING_CONFIG and every list re-orders.
 * A signal we could not measure scores its NEUTRAL value, never zero, so a
 * missing like count does not punish a video.
 */

export interface VideoRankingConfig {
  /** Weights sum to 1. */
  weights: {
    search: number;
    reach: number;
    engagement: number;
    channel: number;
    freshness: number;
    length: number;
  };
  /** log10(views) at which reach saturates (6 = 1M views). */
  reachSaturatesAtLog10: number;
  /** (likes + 2×comments) / views at which engagement saturates. */
  engagementSaturatesAt: number;
  /** log10(subscribers) at which channel size saturates (6 = 1M). */
  channelSaturatesAtLog10: number;
  /** Age in years at which freshness has halved. */
  freshnessHalfLifeYears: number;
  /** Importance (sum of per-keyword rank weights) that counts as full search evidence. */
  importanceSaturatesAt: number;
  /** Neutral value for a signal that could not be measured. */
  neutral: number;
}

export const VIDEO_RANKING_CONFIG: VideoRankingConfig = {
  weights: {
    search: 0.45,
    reach: 0.17,
    engagement: 0.13,
    channel: 0.1,
    freshness: 0.08,
    length: 0.07,
  },
  reachSaturatesAtLog10: 6,
  engagementSaturatesAt: 0.05,
  channelSaturatesAtLog10: 6,
  freshnessHalfLifeYears: 3,
  importanceSaturatesAt: 20,
  neutral: 0.5,
};

export interface VideoRankingInput {
  /** The source's pre-read score (0–100), the web-page algorithm's number. */
  preReadScore?: number | null;
  /** Sum of per-keyword rank weights (`ranking.ts` importance). */
  importance?: number | null;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  channelSubscriberCount?: number | null;
  publishedAt?: string | null;
  durationSeconds?: number | null;
}

export type VideoSignal = keyof VideoRankingConfig["weights"];

export interface VideoScore {
  /** 0–100. */
  score: number;
  /** Each signal 0–1, before weighting; null = not measured (scored neutral). */
  signals: Record<VideoSignal, number | null>;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function logScale(value: number | null | undefined, saturatesAt: number): number | null {
  if (value == null || value < 0) return null;
  return clamp01(Math.log10(value + 1) / saturatesAt);
}

/** Length fit for learning: Shorts are thin, 3–60 min is the sweet spot, very long fades a little. */
export function lengthFit(seconds: number | null | undefined): number | null {
  if (seconds == null || seconds <= 0) return null;
  const minutes = seconds / 60;
  if (minutes < 1) return 0.2;
  if (minutes < 3) return 0.55;
  if (minutes <= 60) return 1;
  if (minutes <= 120) return 0.8;
  return 0.6;
}

export function scoreVideo(
  input: VideoRankingInput,
  cfg: VideoRankingConfig = VIDEO_RANKING_CONFIG,
  now: Date = new Date(),
): VideoScore {
  const search =
    input.preReadScore != null
      ? clamp01(input.preReadScore / 100)
      : input.importance != null
        ? clamp01(input.importance / cfg.importanceSaturatesAt)
        : null;

  const reach = logScale(input.viewCount, cfg.reachSaturatesAtLog10);

  const engagement =
    input.viewCount && input.viewCount > 0 && (input.likeCount != null || input.commentCount != null)
      ? clamp01(
          ((input.likeCount ?? 0) + 2 * (input.commentCount ?? 0)) /
            input.viewCount /
            cfg.engagementSaturatesAt,
        )
      : null;

  const channel = logScale(input.channelSubscriberCount, cfg.channelSaturatesAtLog10);

  let freshness: number | null = null;
  if (input.publishedAt) {
    const published = new Date(input.publishedAt).getTime();
    if (!Number.isNaN(published)) {
      const years = Math.max(0, (now.getTime() - published) / (365.25 * 86_400_000));
      freshness = Math.pow(0.5, years / cfg.freshnessHalfLifeYears);
    }
  }

  const length = lengthFit(input.durationSeconds);

  const signals: Record<VideoSignal, number | null> = {
    search,
    reach,
    engagement,
    channel,
    freshness,
    length,
  };
  let total = 0;
  for (const key of Object.keys(cfg.weights) as VideoSignal[]) {
    total += cfg.weights[key] * (signals[key] ?? cfg.neutral);
  }
  return { score: Math.round(total * 100), signals };
}

export const VIDEO_SIGNAL_LABELS: Record<VideoSignal, string> = {
  search: "Search match",
  reach: "Reach",
  engagement: "Engagement",
  channel: "Channel size",
  freshness: "Freshness",
  length: "Length fit",
};
