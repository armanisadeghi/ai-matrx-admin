/**
 * Video studio (video cloning, wave one) — server shapes of the aidream doors (`/video-projects`,
 * `/social/posts/{id}/words`) and the rows read directly under RLS. The composition document itself
 * is typed by `@ai-matrx/media/video` (`Composition`); here it stays the door's JSON until parsed.
 */

/** `social.video_project` (Entity). Typed here until `types/database.types.ts` is regenerated with it. */
export interface VideoProjectRow {
  id: string;
  name: string;
  status: string;
  head_version: number;
  organization_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** `social.video_variant` (Detail of a project): one pinned override. */
export interface VideoVariantRow {
  id: string;
  project_id: string;
  label: string;
  base_version: number;
  status: string;
  created_at: string;
}

/** A list row: the project + its reference post's thumbnail and the variant count. */
export interface VideoProjectListItem {
  project: VideoProjectRow;
  postId: string | null;
  thumbnailUrl: string | null;
  hasStoredThumbnail: boolean;
  platform: string | null;
  variantCount: number;
}

export type JsonDoc = Record<string, unknown>;

export interface VideoProjectAnswer {
  project_id: string;
  organization_id: string;
  name: string;
  status: string;
  head_version: number;
  created_by: string;
  composition: { version: number; document: JsonDoc } | null;
  reference_post_ids: string[];
  brand_ids: string[];
  output_file_ids: string[];
  render_run_ids: string[];
}

export interface VariantAnswer {
  id: string;
  baseCompositionId: string;
  baseVersion: number;
  label: string;
  ops: JsonDoc[];
  status: string;
}

export interface EstimateLine {
  media_id: string;
  capability: string;
  model: string;
  unit: string;
  quantity: number;
  unit_price_usd: number | null;
  cost_usd: number | null;
  points: number | null;
  note: string | null;
}

export interface EstimateAnswer {
  lines: EstimateLine[];
  cached: string[];
  unsupported: Array<{ media_id: string; capability: string; alias: string; reason: string }>;
  warnings: string[];
  total_usd: number;
  total_points: number;
  confirm_over_points: number | null;
}

export type PostWordsStatus = "ok" | "no_stored_video" | "no_speech" | "words_unavailable";

export interface PostWordsAnswer {
  status: PostWordsStatus;
  words: Array<{ text: string; start: number; end: number }>;
  reason: string;
}

/** `/social/posts/{id}/media` row, with the file facts the clone seed needs. */
export interface PostVideoMedia {
  file_id: string;
  role: string;
  mime_type: string | null;
  door: string;
  checksum?: string | null;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
}
