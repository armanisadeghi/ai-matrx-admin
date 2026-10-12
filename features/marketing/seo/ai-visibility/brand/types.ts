/** One stored brand-level AI-visibility check (`seo.ai_visibility_brand_check`). */
export interface BrandCheckEntry {
  name: string;
  is_target: boolean;
  mentions: number | null;
  share_pct: number | null;
}

export interface BrandCheckRow {
  id: string;
  brand_id: string;
  checked_at: string;
  status: string;
  subject_kind: string;
  target_name: string;
  /** The brand's share of voice, 0-100; null when nothing could be compared. */
  score: number | null;
  total_mentions: number | null;
  entries: BrandCheckEntry[];
  platforms: { platform: string; status: string }[];
  queries: {
    name?: string;
    aliases?: string[];
    handles?: string[];
    expertise?: string[];
    domains?: string[];
  };
  competitors: string[];
  notices: string[];
  cost_usd: number | null;
}

export interface BrandCheckEstimate {
  brand_id: string;
  name: string;
  kind: string;
  /** What a fresh check costs now; 0 when a recent result is reused. */
  estimate_usd: number;
  competitors: string[];
  can_compare: boolean;
}
