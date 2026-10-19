"use client";

/**
 * BrandLibraryView — the OWNED media library for this brand inside the site
 * Media workspace: every `web.brand_asset` (uploaded, discovered, generated,
 * research-promoted), grouped by kind, with upload, edit, primary toggle, and
 * delete. Reuses the brand cockpit's asset CRUD + editor dialog — this view
 * never forks a second asset system.
 */

import { useMemo, useRef, useState } from "react";
import {
  CircleOff,
  Globe,
  FileVideo,
  ImageIcon,
  Loader2,
  Pencil,
  Star,
  Trash2,
  Upload,
  Crop,
  Maximize2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { CaptureThumb } from "@/features/marketing/components/shared/CaptureThumb";
import { MediaEmptyState } from "@/features/marketing/components/media/SnapshotMediaGallery";
import {
  LoadingSurface,
  QueryError,
  SectionCard,
} from "@/features/marketing/components/shared/MarketingUi";
import { BrandAssetGallery } from "@/features/marketing/components/brands/BrandAssetGallery";
import { BrandAssetEditorDialog } from "@/features/marketing/components/brands/BrandAssetEditorDialog";
import { AssetImageEditorDialog } from "@/features/marketing/components/media/AssetImageEditorDialog";
import { BrandAssetDetailDialog } from "@/features/marketing/components/media/BrandAssetDetail";
import type { SiteMediaStandards } from "@/features/marketing/data/media-library";
import {
  useBrandAssets,
  useCreateBrandAsset,
  useDeleteBrandAsset,
  useUpdateBrandAsset,
} from "@/features/marketing/data/hooks";
import { secureImageUrl } from "@/features/marketing/lib/website-url";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import { youTubeThumbnail, youtubeId } from "@ai-matrx/rich-content/utils/youtube";
import { useFileUpload } from "@/features/files/handler/hooks/useFileUpload";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { VideoPublishDate } from "@/features/files/blocks/video/VideoPublishDate";
import { videoPublishDateFromMetadata } from "@/lib/media/video-date";
import { useYouTubeVideoIdentityIndex } from "@/features/research/hooks/useResearchState";
import {
  BRAND_ASSET_KIND_LABELS,
  isJsonRecord,
  type BrandAsset,
  type BrandAssetKind,
} from "@/features/marketing/types";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

/** Image CDNs whose URLs carry no file extension (e.g. Unsplash CDN saves). */
const IMAGE_CDN_HOSTS = new Set(["images.unsplash.com", "plus.unsplash.com"]);

function isImageCdnUrl(url: string): boolean {
  try {
    return IMAGE_CDN_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function assetPreviewUrl(asset: BrandAsset): string | null {
  if (!asset.source_url) return null;
  if (
    !/\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(asset.source_url) &&
    !isImageCdnUrl(asset.source_url)
  ) {
    return null;
  }
  // These are source-only records, not owned files. Fetch through the existing
  // bounded/SSRF-guarded proxy so provider hotlink and cross-origin policies do
  // not turn confirmed brand-library tiles into blank boxes.
  return proxiedExternalImageUrl(secureImageUrl(asset.source_url));
}

function assetColorValue(asset: BrandAsset): string | null {
  if (asset.kind !== "color") return null;
  if (isJsonRecord(asset.data)) {
    const candidate = asset.data.hex ?? asset.data.value ?? asset.data.color;
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return asset.title && /^#([0-9a-f]{3,8})$/i.test(asset.title)
    ? asset.title
    : null;
}

function portalHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const SOURCE_LABELS: Record<string, string> = {
  discovered: "Discovered",
  uploaded: "Uploaded",
  manual: "Manual",
  generated: "AI generated",
  research: "From research",
  stock: "Stock source",
};

/**
 * Kinds that keep their own tile: a video plays inline with its publish date, a portal is a link out.
 * Every other kind renders in the shared brand gallery (`BrandAssetGallery`), sized by what it really is.
 */
const TILE_KINDS = new Set(["video", "portal"]);

const ACTION_CLASS =
  "matrx-tap-area rounded p-1 text-muted-foreground transition-colors hover:text-foreground";

/** The library's per-asset actions, shown on hover over a gallery tile. */
function AssetActions({
  asset,
  busy,
  onOpenDetail,
  onEdit,
  onEditImage,
  onDelete,
  onTogglePrimary,
}: {
  asset: BrandAsset;
  busy: boolean;
  onOpenDetail: (asset: BrandAsset) => void;
  onEdit: (asset: BrandAsset) => void;
  onEditImage: (asset: BrandAsset) => void;
  onDelete: (asset: BrandAsset) => void;
  onTogglePrimary: (asset: BrandAsset) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenDetail(asset)}
        title="Open the full asset record"
        aria-label="Open the full asset record"
        className={ACTION_CLASS}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onTogglePrimary(asset)}
        disabled={busy}
        title={asset.is_primary ? "Unset primary" : "Set as primary"}
        aria-label={asset.is_primary ? "Unset primary" : "Set as primary"}
        className={ACTION_CLASS}
      >
        <Star className={asset.is_primary ? "h-3.5 w-3.5 fill-warning text-warning" : "h-3.5 w-3.5"} />
      </button>
      {asset.file_id ? (
        <button
          type="button"
          onClick={() => onEditImage(asset)}
          title="Edit image (crop, standards, remove background, inpaint)"
          aria-label="Edit image"
          className={ACTION_CLASS}
        >
          <Crop className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onEdit(asset)}
        title="Edit details"
        aria-label="Edit details"
        className={ACTION_CLASS}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(asset)}
        disabled={busy}
        title="Delete"
        aria-label="Delete"
        className="matrx-tap-area rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </>
  );
}

function AssetTile({
  asset,
  publishedAt,
  onOpenDetail,
  onEdit,
  onEditImage,
  onDelete,
  onTogglePrimary,
  busy,
}: {
  asset: BrandAsset;
  publishedAt?: string | null;
  onOpenDetail: (asset: BrandAsset) => void;
  onEdit: (asset: BrandAsset) => void;
  /** Opens the image-editing suite — only offered when the asset has a file_id. */
  onEditImage: (asset: BrandAsset) => void;
  onDelete: (asset: BrandAsset) => void;
  onTogglePrimary: (asset: BrandAsset) => void;
  busy: boolean;
}) {
  const preview = assetPreviewUrl(asset);
  const color = assetColorValue(asset);
  const videoPoster =
    asset.kind === "video" && asset.source_url
      ? (() => {
          const yt = youtubeId(asset.source_url);
          return yt ? youTubeThumbnail(yt) : null;
        })()
      : null;
  // Local (not `asset.file_id` inline) — the React Compiler lint taints the
  // whole base object when a member expression is passed to a `ref` prop.
  const videoFileId = asset.kind === "video" ? asset.file_id : null;
  const videoTitle = asset.title ?? "Brand video";
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      {videoFileId ? (
        <div className="relative aspect-[4/3] bg-muted/40">
          <InlineMediaRef
            ref={videoFileId}
            as="video"
            size="fill"
            fit="contain"
            alt={videoTitle}
            preload="metadata"
          />
          <VideoPublishDate
            publishedAt={publishedAt}
            className="pointer-events-none absolute bottom-1.5 left-1.5 rounded border border-border bg-card/90 px-1 py-0.5 text-foreground shadow-sm"
          />
        </div>
      ) : asset.kind === "video" ? (
        videoPoster ? (
          <div className="relative aspect-[4/3] bg-muted/40">
            {/* Third-party provider poster — external asset, no file_id. */}
            <img
              src={videoPoster}
              alt={asset.title ?? "Video poster"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <VideoPublishDate
              publishedAt={publishedAt}
              className="pointer-events-none absolute bottom-1.5 left-1.5 rounded border border-border bg-card/90 px-1 py-0.5 text-foreground shadow-sm"
            />
          </div>
        ) : (
          <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/40 text-muted-foreground">
            <FileVideo className="h-5 w-5" />
            <VideoPublishDate
              publishedAt={publishedAt}
              className="absolute bottom-1.5 left-1.5"
            />
          </div>
        )
      ) : asset.file_id ? (
        <CaptureThumb
          fileId={asset.file_id}
          alt={asset.title ?? asset.kind}
          aspectClassName="aspect-[4/3]"
          className="rounded-none border-0"
        />
      ) : color ? (
        <div
          className="flex aspect-[4/3] items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <span className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-foreground backdrop-blur-sm">
            {color}
          </span>
        </div>
      ) : preview ? (
        <div className="flex aspect-[4/3] items-center justify-center bg-muted/40 p-2">
          <PreviewImage src={preview} alt={asset.title ?? asset.kind} />
        </div>
      ) : asset.kind === "portal" && asset.source_url ? (
        <OutboundLink
          href={asset.source_url}
          title={asset.source_url}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-muted/40 text-muted-foreground transition-colors hover:text-primary"
        >
          <Globe className="h-5 w-5" />
          <span className="max-w-full truncate px-2 text-[10px]">
            {portalHostname(asset.source_url) ?? "Open portal"}
          </span>
        </OutboundLink>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-muted/40 text-muted-foreground">
          <CircleOff className="h-5 w-5" />
        </div>
      )}
      <div className="flex items-center gap-1 p-1.5">
        <div className="min-w-0 flex-1">
          {/* The name is the door onto the full record (THE DOOR LAW) — the
              asset has no route, so `BrandAssetDetailDialog` is its door. */}
          <button
            type="button"
            onClick={() => onOpenDetail(asset)}
            title="Open the full asset record"
            className="block w-full min-w-0 truncate text-left type-meta font-medium text-foreground hover:text-primary"
          >
            {asset.title ||
              BRAND_ASSET_KIND_LABELS[asset.kind as BrandAssetKind] ||
              asset.kind}
          </button>
          <p className="truncate type-meta text-muted-foreground">
            {SOURCE_LABELS[asset.source] ?? asset.source}
            {asset.is_primary ? " · primary" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onTogglePrimary(asset)}
          disabled={busy}
          title={asset.is_primary ? "Unset primary" : "Set as primary"}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Star
            className={
              asset.is_primary
                ? "h-3.5 w-3.5 fill-warning text-warning"
                : "h-3.5 w-3.5"
            }
          />
        </button>
        {asset.file_id && asset.kind !== "video" ? (
          <button
            type="button"
            onClick={() => onEditImage(asset)}
            title="Edit image (crop, standards, remove background, inpaint)"
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Crop className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onEdit(asset)}
          title="Edit details"
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(asset)}
          disabled={busy}
          title="Delete"
          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function BrandLibraryView({
  brandId,
  organizationId,
  standards,
}: {
  brandId: string;
  organizationId: string;
  /** Site media standards — drives the editor's "Fit to standards" strip. */
  standards: SiteMediaStandards;
}) {
  const assetsQuery = useBrandAssets(brandId);
  const createAsset = useCreateBrandAsset();
  const updateAsset = useUpdateBrandAsset();
  const deleteAsset = useDeleteBrandAsset();
  const { upload, uploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<BrandAsset | null>(null);
  /** The asset whose FULL record is open (read), distinct from `editing`. */
  const [viewing, setViewing] = useState<BrandAsset | null>(null);
  const [editingImage, setEditingImage] = useState<BrandAsset | null>(null);
  const [creating, setCreating] = useState(false);

  const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data]);
  const youtubeVideoIds = assets.flatMap((asset) => {
    const id =
      asset.kind === "video" && asset.source_url
        ? youtubeId(asset.source_url)
        : null;
    return id ? [id] : [];
  });
  const { identityForId: youtubeIdentityForId } =
    useYouTubeVideoIdentityIndex(youtubeVideoIds);

  const groups = useMemo(() => {
    const byKind = new Map<string, BrandAsset[]>();
    for (const asset of assets) {
      const list = byKind.get(asset.kind) ?? [];
      list.push(asset);
      byKind.set(asset.kind, list);
    }
    return [...byKind.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [assets]);

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        const uploaded = await upload(
          { kind: "file", file },
          {
            folderPath: "Images/Brand Library",
            organizationId,
          },
        );
        await createAsset.mutateAsync({
          organizationId,
          brandId,
          kind: file.type.startsWith("video/") ? "video" : "image",
          sourceUrl: null,
          fileId: uploaded.fileId,
          title: file.name.replace(/\.[a-z0-9]+$/i, ""),
          notes: null,
          isPrimary: false,
          source: "uploaded",
        });
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        toast.error(`Upload failed for ${file.name}`, {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onTogglePrimary = async (asset: BrandAsset) => {
    try {
      await updateAsset.mutateAsync({
        assetId: asset.id,
        expectedVersion: asset.version,
        patch: { is_primary: !asset.is_primary },
      });
    } catch (error) {
      toast.error("Could not update the asset", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const onDelete = async (asset: BrandAsset) => {
    const confirmed = await confirm({
      title: "Delete this asset?",
      description: asset.title ?? asset.source_url ?? asset.kind,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteAsset.mutateAsync(asset.id);
      toast.success("Asset deleted");
    } catch (error) {
      toast.error("Could not delete the asset", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  if (assetsQuery.isLoading) {
    return <LoadingSurface label="Loading the brand library…" />;
  }
  if (assetsQuery.isError) {
    return (
      <QueryError
        error={assetsQuery.error}
        onRetry={() => void assetsQuery.refetch()}
      />
    );
  }

  const galleryAssets = assets.filter((asset) => !TILE_KINDS.has(asset.kind));
  const tileGroups = groups.filter(([kind]) => TILE_KINDS.has(kind));
  const busy = updateAsset.isPending || deleteAsset.isPending;

  return (
    <div className="space-y-3">
      <SectionCard
        title="Library"
        about="Every confirmed asset in this brand's library, shared across every site of the brand: uploads, assets added by URL, promoted crawled images and generated ones."
        headerExtra={
          <>
            <span className="type-meta tabular-nums text-muted-foreground">
              {assets.length.toLocaleString()}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(event) => void onUploadFiles(event.target.files)}
            />
            <Button
              icon={uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <Button icon={<ImageIcon />} variant="outline" onClick={() => setCreating(true)}>
              Add by URL
            </Button>
          </>
        }
      >
        {assets.length === 0 ? (
          <div className="p-3">
            <MediaEmptyState
              title="The brand library is empty"
              detail="Upload files, add by URL, promote crawled images, or generate new ones."
            />
          </div>
        ) : galleryAssets.length === 0 ? (
          <p className="px-3 py-2 type-secondary text-muted-foreground">No images yet</p>
        ) : (
          <BrandAssetGallery
            items={galleryAssets.map((asset) => ({
              asset,
              preview: asset.file_id ? null : assetPreviewUrl(asset),
              color: assetColorValue(asset),
              label: BRAND_ASSET_KIND_LABELS[asset.kind as BrandAssetKind] ?? asset.kind,
            }))}
            onOpen={setViewing}
            renderActions={(asset) => (
              <AssetActions
                asset={asset}
                busy={busy}
                onOpenDetail={setViewing}
                onEdit={setEditing}
                onEditImage={setEditingImage}
                onDelete={(item) => void onDelete(item)}
                onTogglePrimary={(item) => void onTogglePrimary(item)}
              />
            )}
          />
        )}
      </SectionCard>

      {tileGroups.map(([kind, kindAssets]) => (
        <SectionCard
          key={kind}
          title={BRAND_ASSET_KIND_LABELS[kind as BrandAssetKind] ?? kind}
          headerExtra={
            <span className="type-meta tabular-nums text-muted-foreground">{kindAssets.length}</span>
          }
        >
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {kindAssets.map((asset) => {
              const videoId =
                asset.kind === "video" && asset.source_url
                  ? youtubeId(asset.source_url)
                  : null;
              const publishedAt =
                (videoId
                  ? youtubeIdentityForId(videoId)?.published_at
                  : null) ?? videoPublishDateFromMetadata(asset.data);
              return (
                <AssetTile
                  key={asset.id}
                  asset={asset}
                  publishedAt={publishedAt}
                  onOpenDetail={setViewing}
                  onEdit={setEditing}
                  onEditImage={setEditingImage}
                  onDelete={(item) => void onDelete(item)}
                  onTogglePrimary={(item) => void onTogglePrimary(item)}
                  busy={busy}
                />
              );
            })}
          </div>
        </SectionCard>
      ))}

      <AssetImageEditorDialog
        asset={editingImage}
        onOpenChange={(open) => {
          if (!open) setEditingImage(null);
        }}
        brandId={brandId}
        organizationId={organizationId}
        standards={standards}
      />

      {/* The full stored record — the same component the Videos view opens. */}
      <BrandAssetDetailDialog
        asset={viewing}
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        onEdit={() => {
          const asset = viewing;
          setViewing(null);
          setEditing(asset);
        }}
      />

      <BrandAssetEditorDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        brandId={brandId}
        organizationId={organizationId}
        asset={editing}
      />
    </div>
  );
}

/** An asset's own picture; when the source cannot be fetched it says so instead of showing broken-image alt text. */
function PreviewImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
        <CircleOff className="h-5 w-5" aria-hidden />
        Image unavailable
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="max-h-full max-w-full object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
