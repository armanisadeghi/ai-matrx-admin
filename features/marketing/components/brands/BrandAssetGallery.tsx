"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  HelpCircle,
  Palette,
  RectangleHorizontal,
  RectangleVertical,
  Shapes,
  Square,
  Star,
  Zap,
} from "lucide-react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import {
  categorizeAspect,
  categorizeSizeTier,
  isFeaturedPhoto,
  type CategorizableMedia,
} from "@/lib/media/categorization";
import { CaptureThumb } from "@/features/marketing/components/shared/CaptureThumb";
import { useOutsideImage } from "@/features/marketing/lib/useOutsideImage";
import type { BrandAsset } from "@/features/marketing/types";

/**
 * The brand's confirmed assets, sized by what they really are — the same
 * concept as research's media gallery (`@/lib/media/categorization`): photos
 * split by aspect with a large featured band, graphics (logos, banners) at
 * their real size, icons and favicons as small tiles, colours as swatches.
 *
 * Brand assets carry no stored pixel size, so each preview is measured once
 * in the browser; the section holds a skeleton until every size is known so
 * tiles never jump between groups.
 */

export interface BrandAssetGalleryItem {
  asset: BrandAsset;
  /** Public image URL for a URL-backed asset; null for files, colours and non-images. */
  preview: string | null;
  color: string | null;
  label: string;
}

interface Size {
  width: number;
  height: number;
}

/** Natural pixel size per URL; null = the image would not load. */
function useImageSizes(urls: string[]): { sizes: Map<string, Size | null>; settled: boolean } {
  const key = [...new Set(urls)].sort().join("\n");
  const [state, setState] = useState<{ key: string; sizes: Map<string, Size | null> }>({
    key: "",
    sizes: new Map(),
  });
  useEffect(() => {
    const list = key ? key.split("\n") : [];
    let cancelled = false;
    const found = new Map<string, Size | null>();
    const finish = (url: string, size: Size | null) => {
      if (cancelled || found.has(url)) return;
      found.set(url, size);
      if (found.size === list.length) setState({ key, sizes: new Map(found) });
    };
    const timers = list.map((url) => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = () =>
        finish(url, img.naturalWidth > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : null);
      img.onerror = () => finish(url, null);
      img.src = url;
      // A host that never answers must not hold the whole section.
      return window.setTimeout(() => finish(url, null), 6000);
    });
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [key]);
  return { sizes: state.sizes, settled: key === "" || state.key === key };
}

type Tone = "light" | "dark";

/**
 * A transparent logo drawn for a dark (or light) header disappears on a same-coloured tile — a
 * white wordmark on a white card. Each image is sampled once through our same-origin image proxy
 * (a cross-origin canvas cannot be read) and only the tile's backdrop changes, never its size.
 */
function useLogoTones(urls: string[]): Map<string, Tone> {
  const key = [...new Set(urls)].sort().join("\n");
  const [tones, setTones] = useState<{ key: string; map: Map<string, Tone> }>({ key: "", map: new Map() });
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const found = new Map<string, Tone>();
    void Promise.all(
      key.split("\n").map(async (url) => {
        try {
          const img = new Image();
          img.src = proxiedExternalImageUrl(url);
          await img.decode();
          const scale = Math.min(1, 64 / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let opaque = 0;
          let lum = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 40) {
              opaque += 1;
              lum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }
          }
          const pixels = data.length / 4;
          // Only see-through images take their backdrop from the page; a solid image carries its own.
          if (opaque === 0 || opaque > pixels * 0.95) return;
          const avg = lum / opaque;
          if (avg > 200) found.set(url, "light");
          else if (avg < 55) found.set(url, "dark");
        } catch {
          // Unreadable image: the default tile stays.
        }
      }),
    ).then(() => {
      if (!cancelled) setTones({ key, map: found });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return tones.key === key ? tones.map : new Map();
}

/** Backdrop that keeps a see-through logo visible in both themes. */
const TONE_BACKDROP: Record<Tone, string> = {
  light: "bg-foreground dark:bg-card",
  dark: "bg-card dark:bg-foreground",
};

type PhotoBucket = "landscape" | "square" | "portrait" | "unknown";

interface Placed {
  item: BrandAssetGalleryItem;
  size: Size | null;
  media: CategorizableMedia | null;
}

/** Tallest a graphic is drawn; smaller ones render at their real size. */
const GRAPHIC_MAX_H = 160;
const GRAPHIC_MAX_W = 360;

const PHOTO_SECTIONS: Array<{
  key: PhotoBucket;
  title: string;
  icon: ComponentType<{ className?: string }>;
  aspectClass: string;
  featuredGrid: string;
  standardGrid: string;
}> = [
  {
    key: "landscape",
    title: "Landscape",
    icon: RectangleHorizontal,
    aspectClass: "aspect-video",
    featuredGrid: "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
    standardGrid: "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  },
  {
    key: "square",
    title: "Square",
    icon: Square,
    aspectClass: "aspect-square",
    featuredGrid: "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",
    standardGrid: "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  },
  {
    key: "portrait",
    title: "Portrait",
    icon: RectangleVertical,
    aspectClass: "aspect-[3/4]",
    featuredGrid: "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",
    standardGrid: "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6",
  },
  {
    key: "unknown",
    title: "Files",
    icon: HelpCircle,
    aspectClass: "aspect-square",
    featuredGrid: "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",
    standardGrid: "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  },
];

function area(p: Placed): number {
  return p.size ? p.size.width * p.size.height : 0;
}

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <h3 className="type-label uppercase tracking-wider text-muted-foreground">{title}</h3>
      <span className="type-meta tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

function Caption({ item, size }: { item: BrandAssetGalleryItem; size: Size | null }) {
  const { asset, label, color } = item;
  const text = `${label}${asset.title ? ` · ${asset.title}` : ""}${color ? ` · ${color}` : ""}`;
  return (
    // w-0 min-w-full: the caption never widens a tile drawn at the image's own size.
    <p
      className="flex w-0 min-w-full items-center gap-1 border-t border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
      title={size ? `${text} · ${size.width}×${size.height}` : text}
    >
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {size ? <span className="shrink-0 tabular-nums">{size.width}×{size.height}</span> : null}
    </p>
  );
}

function TileChrome({
  item,
  actions,
  children,
  size,
  className,
}: {
  item: BrandAssetGalleryItem;
  actions: ReactNode;
  children: ReactNode;
  size: Size | null;
  className?: string;
}) {
  return (
    <li className={cn("group relative flex flex-col overflow-hidden rounded-md border border-border bg-card", className)}>
      {children}
      {item.asset.is_primary ? (
        <span
          title="Primary asset"
          className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-md bg-card/90 shadow-sm"
        >
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
        </span>
      ) : null}
      <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md bg-card/90 opacity-0 shadow-sm transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {actions}
      </div>
      <Caption item={item} size={size} />
    </li>
  );
}

function Letter({ label }: { label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold uppercase text-muted-foreground"
    >
      {label.trim().charAt(0) || "?"}
    </span>
  );
}

export function BrandAssetGallery({
  items,
  renderActions,
  onOpen,
}: {
  items: BrandAssetGalleryItem[];
  renderActions: (asset: BrandAsset) => ReactNode;
  onOpen: (asset: BrandAsset) => void;
}) {
  const previews = items.flatMap((i) => (i.preview ? [i.preview] : []));
  const { sizes, settled } = useImageSizes(previews);
  const tones = useLogoTones(settled ? previews.filter((url) => sizes.get(url)) : []);
  if (!settled) return <div className="p-3"><RegionSkeleton shape="cards" count={2} /></div>;

  const photos: Record<PhotoBucket, Placed[]> = { landscape: [], square: [], portrait: [], unknown: [] };
  const graphics: Placed[] = [];
  const icons: Placed[] = [];
  const swatches: Placed[] = [];

  for (const item of items) {
    if (item.asset.file_id) {
      photos.unknown.push({ item, size: null, media: null });
      continue;
    }
    if (!item.preview) {
      (item.color ? swatches : icons).push({ item, size: null, media: null });
      continue;
    }
    const size = sizes.get(item.preview) ?? null;
    if (!size) {
      icons.push({ item, size: null, media: null });
      continue;
    }
    const media: CategorizableMedia = {
      url: item.preview,
      width: size.width,
      height: size.height,
      alt: item.asset.title,
      kind: "image",
    };
    const tier = categorizeSizeTier(media);
    const placed = { item, size, media };
    if (tier === "icon") icons.push(placed);
    else if (tier === "graphic") graphics.push(placed);
    else {
      const aspect = categorizeAspect(media);
      photos[aspect === "unknown" ? "unknown" : aspect].push(placed);
    }
  }
  const byArea = (a: Placed, b: Placed) => area(b) - area(a);
  for (const list of [...Object.values(photos), graphics, icons]) list.sort(byArea);

  const imageBox = (p: Placed, className: string, imgSize?: { width: number; height: number }) => (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden",
        (p.item.preview && tones.get(p.item.preview) && TONE_BACKDROP[tones.get(p.item.preview) as Tone]) || "bg-card",
        p.item.asset.source_url && "cursor-pointer",
        className,
      )}
      onClick={() => onOpen(p.item.asset)}
    >
      {p.item.preview && p.size ? (
        // Confirmed assets reference the brand's own public URLs.
        <GalleryImage url={p.item.preview} label={p.item.label} imgSize={imgSize} />
      ) : p.item.color ? (
        <span
          className="h-9 w-9 rounded-full border border-border shadow-inner"
          style={{ backgroundColor: p.item.color }}
          title={p.item.color}
        />
      ) : p.item.asset.kind === "color" ? (
        <Palette className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Letter label={p.item.label} />
      )}
    </div>
  );

  return (
    <div className="space-y-5 p-3">
      {PHOTO_SECTIONS.map((section) => {
        const list = photos[section.key];
        if (list.length === 0) return null;
        const featured = list.filter((p) => p.media && isFeaturedPhoto(p.media));
        const standard = list.filter((p) => !(p.media && isFeaturedPhoto(p.media)));
        const tile = (p: Placed) => (
          <TileChrome key={p.item.asset.id} item={p.item} actions={renderActions(p.item.asset)} size={p.size}>
            {p.item.asset.file_id ? (
              <CaptureThumb
                fileId={p.item.asset.file_id}
                alt={p.item.asset.title ?? p.item.asset.kind}
                aspectClassName={section.aspectClass}
                className="rounded-none border-0"
              />
            ) : (
              imageBox(p, section.aspectClass)
            )}
          </TileChrome>
        );
        return (
          <section key={section.key} className="space-y-2">
            <SectionHeader icon={section.icon} title={section.title} count={list.length} />
            {featured.length > 0 ? <ul className={section.featuredGrid}>{featured.map(tile)}</ul> : null}
            {standard.length > 0 ? <ul className={section.standardGrid}>{standard.map(tile)}</ul> : null}
          </section>
        );
      })}
      {graphics.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader icon={Shapes} title="Logos & graphics" count={graphics.length} />
          <ul className="flex flex-wrap items-start gap-2">
            {graphics.map((p) => {
              // Drawn at its real size, scaled down only past the cap; the box is sized up front so nothing reflows.
              const w0 = p.size?.width ?? GRAPHIC_MAX_W;
              const h0 = p.size?.height ?? GRAPHIC_MAX_H;
              const scale = Math.min(1, GRAPHIC_MAX_H / h0, GRAPHIC_MAX_W / w0);
              return (
                <TileChrome key={p.item.asset.id} item={p.item} actions={renderActions(p.item.asset)} size={p.size} className="min-w-28 max-w-full">
                  {imageBox(p, "p-2", { width: Math.round(w0 * scale), height: Math.round(h0 * scale) })}
                </TileChrome>
              );
            })}
          </ul>
        </section>
      ) : null}
      {icons.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader icon={Zap} title="Icons & favicons" count={icons.length} />
          <ul className="flex flex-wrap items-start gap-2">
            {icons.map((p) => (
              <TileChrome key={p.item.asset.id} item={p.item} actions={renderActions(p.item.asset)} size={p.size} className="w-28">
                {imageBox(p, "h-16 p-2")}
              </TileChrome>
            ))}
          </ul>
        </section>
      ) : null}
      {swatches.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader icon={Palette} title="Colours" count={swatches.length} />
          <ul className="flex flex-wrap items-start gap-2">
            {swatches.map((p) => (
              <TileChrome key={p.item.asset.id} item={p.item} actions={renderActions(p.item.asset)} size={null} className="w-28">
                {imageBox(p, "h-16 p-2")}
              </TileChrome>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** A confirmed asset's picture: outside URLs fall back through the proxy; a dead one shows the label's letter, never a broken image. */
function GalleryImage({ url, label, imgSize }: { url: string; label: string; imgSize?: { width: number; height: number } }) {
  const image = useOutsideImage(url);
  if (image.failed || !image.src) return <Letter label={label} />;
  return (
    <img
      key={image.imgKey}
      {...image.imgProps}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      style={imgSize}
      className={imgSize ? "max-w-full object-contain" : "max-h-full max-w-full object-contain"}
    />
  );
}
