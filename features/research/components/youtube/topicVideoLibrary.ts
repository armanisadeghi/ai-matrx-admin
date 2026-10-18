import { readAllRows } from "@ai-matrx/data/db";
import { supabase } from "@/utils/supabase/client";
import { getTopicYouTubeVideos } from "@/features/marketing/discovery/youtube/service";
import type { YouTubeVideoLibraryRecord } from "@/features/marketing/discovery/youtube/types";
import type { SourceImportance } from "../../ranking";
import { getSourceImportance } from "../../service";
import { scoreVideo, type VideoScore } from "../../videoRanking";

export interface RankedTopicVideo {
  video: YouTubeVideoLibraryRecord;
  score: VideoScore;
  /** Which keywords found it and at what search rank; null when none recorded. */
  importance: SourceImportance | null;
  /** 1-based position in the topic's best-first order. */
  rank: number;
  /** YouTube's own answer (research.youtube_video.media_kind): "short" | "long" | null when unknown. */
  mediaKind: string | null;
  /** The channel's photo, from the stored channel record; null when YouTube gave none. */
  channelThumbnail: string | null;
}

export type VideoReadState = "analyzed" | "partial" | "analyzing" | "failed" | "found";

export function videoReadState(video: YouTubeVideoLibraryRecord): VideoReadState {
  switch (video.processing_status) {
    case "completed":
      return "analyzed";
    case "partial":
      return "partial";
    case "processing":
      return "analyzing";
    case "failed":
      return "failed";
    default:
      return "found";
  }
}

/**
 * Every video this topic holds, scored and ordered best-first. The videos come
 * from the server's topic library; the search evidence (pre-read score and
 * per-keyword ranks) is read straight from the topic's sources.
 */
export async function loadTopicVideoLibrary(topicId: string): Promise<RankedTopicVideo[]> {
  const [videos, importance, sourceRows] = await Promise.all([
    getTopicYouTubeVideos(topicId),
    getSourceImportance(topicId),
    readAllRows<{ id: string; pre_read_score: number | null }>(
      ({ from, to }) =>
        supabase
          .schema("research")
          .from("rs_source")
          .select("id, pre_read_score", { count: "exact" })
          .eq("topic_id", topicId)
          .eq("source_type", "youtube")
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .range(from, to),
      { label: "research.rs_source youtube scores" },
    ),
  ]);
  const preRead = new Map(sourceRows.map((row) => [row.id, row.pre_read_score]));
  // Fields the library record does not carry: YouTube's Short/regular verdict and
  // the channel photo. Read straight from the canonical rows, in pages of 200 ids.
  const extras = new Map<string, { media_kind: string | null; channel_thumb: string | null }>();
  const ids = videos.map((v) => v.youtube_video_id);
  // A JSON-path select is typed by a string parser that recurses too deep; the
  // column list goes in as a plain string and each row is checked by hand.
  const columns: string =
    "youtube_video_id, media_kind, channel_thumb:provider_data->channel->snippet->thumbnails->default->>url";
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .schema("research")
      .from("youtube_video")
      .select(columns)
      .in("youtube_video_id", ids.slice(i, i + 200));
    if (error) throw error;
    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      if (typeof row.youtube_video_id !== "string") continue;
      extras.set(row.youtube_video_id, {
        media_kind: typeof row.media_kind === "string" ? row.media_kind : null,
        channel_thumb: typeof row.channel_thumb === "string" ? row.channel_thumb : null,
      });
    }
  }
  // Search evidence is RELATIVE to this topic's videos (aidream research/video_ranking.py
  // does the same): video pre-read scores sit on the web scale, median ~3.6 of 100,
  // so an absolute /100 would flatten the strongest signal.
  const bestPreRead = Math.max(0, ...sourceRows.map((row) => row.pre_read_score ?? 0));

  const scored = videos.map((video) => {
    const sourceId = video.topic_source_id ?? null;
    const imp = sourceId ? (importance.get(sourceId) ?? null) : null;
    const rawPreRead = sourceId ? (preRead.get(sourceId) ?? null) : null;
    const relativePreRead =
      rawPreRead == null || bestPreRead <= 0 ? null : (rawPreRead / bestPreRead) * 100;
    const extra = extras.get(video.youtube_video_id);
    return {
      video,
      importance: imp,
      mediaKind: extra?.media_kind ?? null,
      channelThumbnail: extra?.channel_thumb ?? null,
      score: scoreVideo({
        preReadScore: relativePreRead,
        importance: imp?.score ?? null,
        viewCount: video.view_count,
        likeCount: video.like_count,
        commentCount: video.comment_count,
        channelSubscriberCount: video.channel_subscriber_count,
        publishedAt: video.published_at,
        durationSeconds: video.duration_seconds,
      }),
    };
  });
  scored.sort((a, b) => b.score.score - a.score.score);
  return scored.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
