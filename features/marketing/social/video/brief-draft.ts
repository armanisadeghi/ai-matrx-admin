/** The clone brief's typed fields, kept as one JSON string so a Board tile can save them and bring them back after a reload. */

import type { MusicChoice } from "./music";

export interface BriefDraft {
  productKey?: string;
  productName?: string;
  productImage?: unknown;
  aboutText?: string | null;
  priceText?: string | null;
  presenter?: string;
  presenterText?: string;
  script?: string | null;
  hookLine?: string;
  hookTouched?: boolean;
  aiRewrite?: boolean;
  captionLook?: string;
  aspect?: string;
  takes?: unknown[];
  music?: MusicChoice;
}

export function parseBriefDraft(raw: string | null | undefined): BriefDraft {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as BriefDraft) : {};
  } catch {
    return {};
  }
}

export const serializeBriefDraft = (d: BriefDraft): string => JSON.stringify(d);
