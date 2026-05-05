export const runtime = "nodejs";

/**
 * Generalized IMAGE upload route.
 *
 * Accepts a single image file + a preset name, runs Sharp server-side to
 * generate every configured size, uploads each variant to the cloud-files
 * backend via `ServerFiles.uploadAndShare`, and returns the resulting URLs.
 *
 * Variants default to `visibility="public"` so the response carries CDN
 * URLs (Cloudflare-fronted, permanent, checksum cache-busted) — render
 * directly without `/share/{token}` redirects. Pass `visibility=private`
 * (or `shared`) on the FormData to override per-call.
 *
 *   • Every variant appears in the user's cloud-files tree under
 *     `Images/<folder-or-Generated>/<uuid>/` — visible in `/files`.
 *   • For public variants the URL is a permanent CDN URL; for private/
 *     shared it falls back to a `/share/{token}` link (also stable).
 *
 * Presets (keyed on the client):
 *   - social   : 1400²  cover, 1200×630 OG, 400²  thumbnail      (default)
 *   - cover    : 1200×630 only (OG/link-preview images)
 *   - avatar   : 400² avatar, 128² thumb, 48² tiny
 *   - logo     : 512² logo,   200² medium, 64² small
 *   - favicon  : 192² primary, 64² small
 *   - square   : 1024² single square
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import sharp from "sharp";
import { randomUUID } from "crypto";
import * as Api from "@/features/files/api";
import { CloudFolders } from "@/features/files/utils/folder-conventions";
import type { Visibility } from "@/features/files/types";

const VISIBILITY_VALUES: readonly Visibility[] = ["public", "private", "shared"];

function isVisibility(value: unknown): value is Visibility {
  return typeof value === "string" && (VISIBILITY_VALUES as readonly string[]).includes(value);
}

// ── Config ────────────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const JPEG_QUALITY = 85;

type ImageVariantKey =
  | "image_url"
  | "og_image_url"
  | "thumbnail_url"
  | "tiny_url";

export interface ImageVariantSpec {
  key: ImageVariantKey;
  width: number;
  height: number;
  suffix: string;
}

export const IMAGE_PRESETS = {
  social: [
    { key: "image_url", width: 1400, height: 1400, suffix: "cover" },
    { key: "og_image_url", width: 1200, height: 630, suffix: "og" },
    { key: "thumbnail_url", width: 400, height: 400, suffix: "thumb" },
    { key: "tiny_url", width: 128, height: 128, suffix: "tiny" },
  ],
  cover: [
    { key: "image_url", width: 1200, height: 630, suffix: "cover" },
    { key: "thumbnail_url", width: 600, height: 315, suffix: "thumb" },
    { key: "tiny_url", width: 200, height: 105, suffix: "tiny" },
  ],
  avatar: [
    { key: "image_url", width: 400, height: 400, suffix: "avatar" },
    { key: "thumbnail_url", width: 128, height: 128, suffix: "thumb" },
    { key: "tiny_url", width: 48, height: 48, suffix: "tiny" },
  ],
  logo: [
    { key: "image_url", width: 512, height: 512, suffix: "logo" },
    { key: "thumbnail_url", width: 200, height: 200, suffix: "medium" },
    { key: "tiny_url", width: 64, height: 64, suffix: "small" },
  ],
  favicon: [
    { key: "image_url", width: 192, height: 192, suffix: "favicon" },
    { key: "tiny_url", width: 64, height: 64, suffix: "small" },
  ],
  square: [{ key: "image_url", width: 1024, height: 1024, suffix: "square" }],
} as const satisfies Record<string, readonly ImageVariantSpec[]>;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

export interface ImageUploadResponse {
  primary_url: string;
  image_url: string;
  og_image_url: string | null;
  thumbnail_url: string | null;
  tiny_url: string | null;
  preset: string;
  /** Always "cloud-files" since the migration. Kept for backward-compat. */
  bucket: string;
  /** The cloud-files folder path where variants were written. */
  folder: string;
  /** Visibility applied to every uploaded variant. */
  visibility: Visibility;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function isPresetName(value: unknown): value is ImagePreset {
  return typeof value === "string" && value in IMAGE_PRESETS;
}

function sanitizeFolderSegment(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    // Cloud-files folder names allow spaces + most printable chars, but we
    // still strip control chars and normalize slashes.
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return cleaned || null;
}

function resolveAppOrigin(req: NextRequest): string {
  const origin = req.nextUrl.origin;
  if (origin) return origin;
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000")
  );
}

interface UploadedVariantInfo {
  url: string;
}

async function processAndUploadImage(
  ctx: ReturnType<typeof Api.Server.createServerContext>,
  imageBuffer: Buffer,
  folderPath: string,
  appOrigin: string,
  variants: readonly ImageVariantSpec[],
  visibility: Visibility,
): Promise<Partial<Record<ImageVariantKey, UploadedVariantInfo>>> {
  const results: Partial<Record<ImageVariantKey, UploadedVariantInfo>> = {};
  const appOriginTrimmed = appOrigin.replace(/\/$/, "");

  for (const variant of variants) {
    const processed = await sharp(imageBuffer)
      .resize(variant.width, variant.height, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: JPEG_QUALITY, progressive: true })
      .toBuffer();

    const filePath = `${folderPath}/${variant.suffix}.jpg`;
    const { data: uploaded } = await Api.Server.uploadFile(ctx, {
      file: processed,
      filePath,
      fileName: `${variant.suffix}.jpg`,
      contentType: "image/jpeg",
      visibility,
      metadata: {
        origin: "images-upload-route",
        preset_variant: variant.key,
        width: variant.width,
        height: variant.height,
        requested_visibility: visibility,
      },
    });

    // Public → permanent Cloudflare CDN URL (carries `?v=<checksum>` for
    // cache-busting). Private/shared → create an indefinite share link;
    // the `/share/{token}` URL is stable to persist in a DB row.
    let url: string;
    if (visibility === "public" && uploaded.cdn_url) {
      url = uploaded.cdn_url;
    } else {
      const link = await Api.Server.createFileShareLink(
        ctx,
        uploaded.file_id,
        {
          permission_level: "read",
          expires_at: null,
          max_uses: null,
        },
      );
      url = `${appOriginTrimmed}/share/${link.share_token}`;
    }

    results[variant.key] = { url };
  }

  return results;
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const presetRaw = formData.get("preset");
    const folderRaw = formData.get("folder");
    const visibilityRaw = formData.get("visibility");
    // `bucket` is accepted for back-compat but ignored — everything goes
    // to cloud-files now. (Legacy callers send "userContent",
    // "podcast-assets", etc.)

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image exceeds 20MB limit" },
        { status: 400 },
      );
    }

    // Default to public — these presets (avatar/logo/og/cover/social) are
    // almost always rendered on public pages. Callers that want a private
    // image (e.g. a personal asset) pass visibility=private explicitly.
    let visibility: Visibility = "public";
    if (visibilityRaw !== null && visibilityRaw !== "") {
      if (!isVisibility(visibilityRaw)) {
        return NextResponse.json(
          { error: "Invalid visibility (expected public, private, or shared)" },
          { status: 400 },
        );
      }
      visibility = visibilityRaw;
    }

    const preset: ImagePreset = isPresetName(presetRaw) ? presetRaw : "social";
    const variants = IMAGE_PRESETS[preset];

    // Build the cloud-files folder path. Each upload gets its own UUID
    // subfolder to group its variants (cover, og, thumb, tiny) together.
    // If `folder` is already an Images/* path (callers like ImageCapture
    // pass the full CloudFolders path), use it directly — don't re-prepend
    // "Images/" and create a double-nested "Images/Images/..." structure.
    const customFolder = sanitizeFolderSegment(
      typeof folderRaw === "string" ? folderRaw : null,
    );
    let folderRoot: string;
    if (!customFolder) {
      folderRoot = CloudFolders.IMAGES_GENERATED;
    } else if (
      customFolder === CloudFolders.IMAGES ||
      customFolder.startsWith(`${CloudFolders.IMAGES}/`)
    ) {
      folderRoot = customFolder;
    } else {
      folderRoot = `${CloudFolders.IMAGES}/${customFolder}`;
    }
    const folderPath = `${folderRoot}/${randomUUID()}`;

    const ctx = Api.Server.createServerContext({
      accessToken: session.access_token,
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const appOrigin = resolveAppOrigin(request);

    const variantUrls = await processAndUploadImage(
      ctx,
      fileBuffer,
      folderPath,
      appOrigin,
      variants,
      visibility,
    );

    const primary = variantUrls.image_url?.url;
    if (!primary) {
      return NextResponse.json(
        { error: "Upload completed but no primary variant was produced" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      primary_url: primary,
      image_url: primary,
      og_image_url: variantUrls.og_image_url?.url ?? null,
      thumbnail_url: variantUrls.thumbnail_url?.url ?? null,
      tiny_url: variantUrls.tiny_url?.url ?? null,
      preset,
      bucket: "cloud-files",
      folder: folderPath,
      visibility,
    } satisfies ImageUploadResponse);
  } catch (err: unknown) {
    console.error("[api/images/upload] error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
