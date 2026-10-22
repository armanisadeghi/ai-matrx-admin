/**
 * Photos of one thing a brand owns — a product/service (offering) or a person (spokesperson).
 *
 * Stored as ordinary brand assets (`web.brand_asset`), linked by `data.offering_id` / `data.party_id` — the exact link the
 * video director reads (aidream `services/video_director/brand_facts.py`). The first photo (lowest `sort_order`, flagged
 * `is_primary`) is the hero. No new table: this is a view over the brand library.
 */

import {
  createBrandAsset,
  deleteBrandAsset,
  listBrandAssets,
  updateBrandAsset,
} from "@/features/marketing/data/service";
import type { BrandAsset } from "@/features/marketing/types";

export type PhotoSubject =
  | { brandId: string; organizationId: string; kind: "offering"; id: string }
  | { brandId: string; organizationId: string; kind: "person"; id: string };

const LINK_KEY = { offering: "offering_id", person: "party_id" } as const;
const ASSET_KIND = { offering: "image", person: "headshot" } as const;
const READ_KINDS = { offering: ["image", "hero_image"], person: ["headshot", "image"] } as const;

export interface SubjectPhoto {
  asset: BrandAsset;
  fileId: string;
}

function linked(asset: BrandAsset, subject: PhotoSubject): boolean {
  const data = asset.data;
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    String((data as Record<string, unknown>)[LINK_KEY[subject.kind]] ?? "") === subject.id
  );
}

export function photosOf(assets: BrandAsset[], subject: PhotoSubject): SubjectPhoto[] {
  const kinds: readonly string[] = READ_KINDS[subject.kind];
  return assets
    .filter((a) => a.file_id && kinds.includes(a.kind) && linked(a, subject))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map((asset) => ({ asset, fileId: asset.file_id as string }));
}

export async function listSubjectPhotos(subject: PhotoSubject, signal?: AbortSignal): Promise<SubjectPhoto[]> {
  return photosOf(await listBrandAssets(subject.brandId, signal), subject);
}

/** Make the stored order and the hero flag match `ordered` (first = hero). Writes only what differs. */
async function settle(ordered: SubjectPhoto[]): Promise<void> {
  for (let i = 0; i < ordered.length; i += 1) {
    const a = ordered[i]!.asset;
    const primary = i === 0;
    if (a.sort_order === i && a.is_primary === primary) continue;
    await updateBrandAsset({ assetId: a.id, expectedVersion: a.version, patch: { sort_order: i, is_primary: primary } });
  }
}

export async function addSubjectPhoto(subject: PhotoSubject, fileId: string, title: string | null): Promise<void> {
  const existing = await listSubjectPhotos(subject);
  await createBrandAsset({
    organizationId: subject.organizationId,
    brandId: subject.brandId,
    kind: ASSET_KIND[subject.kind],
    sourceUrl: null,
    fileId,
    title,
    notes: null,
    isPrimary: existing.length === 0,
    source: "uploaded",
    data: { [LINK_KEY[subject.kind]]: subject.id },
    sortOrder: existing.length,
  });
}

export async function removeSubjectPhoto(subject: PhotoSubject, assetId: string): Promise<void> {
  await deleteBrandAsset(assetId);
  await settle((await listSubjectPhotos(subject)));
}

/** Move one photo to `toIndex` (0 = hero). */
export async function moveSubjectPhoto(subject: PhotoSubject, assetId: string, toIndex: number): Promise<void> {
  const current = await listSubjectPhotos(subject);
  const from = current.findIndex((p) => p.asset.id === assetId);
  if (from < 0 || toIndex < 0 || toIndex >= current.length) return;
  const next = [...current];
  const [moved] = next.splice(from, 1);
  next.splice(toIndex, 0, moved!);
  await settle(next);
}
