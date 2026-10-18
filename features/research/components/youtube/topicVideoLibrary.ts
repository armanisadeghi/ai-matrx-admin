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
    return {
      video,
      importance: imp,
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
