"use client";

import Link from "next/link";

import { readOf } from "@ai-matrx/design-system";
import { UntrustedCount } from "@ai-matrx/design-system";
import { Button as ControlButton, Chip, SearchField, SegmentedControl } from "@ai-matrx/design-system/controls";
import { enumUrlCodec, stringUrlCodec, useUrlState } from "@ai-matrx/kit/url-state";
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ImageIcon,
  Play,
  File,
  Check,
  X,
  Search,
  Shapes,
  Zap,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  HelpCircle,
  LayoutGrid,
  Bug,
  Video,
  FileText,
  FileSpreadsheet,
  FileType,
  Music,
  ExternalLink,
  Download,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";
import { useTopicContext } from "../../context/ResearchContext";
import { useResearchMedia } from "../../hooks/useResearchState";
import { useYouTubeChannelIdentityIndex, useYouTubeVideoIdentityIndex } from "../../hooks/useResearchState";
import type { YouTubeChannelIdentity, YouTubeVideoIdentity } from "../../service";
import { saveChannelIdentity, savedChannelIdentity } from "../../service";
import { useAppDispatch } from "@/lib/redux/hooks";
import { resolveMediaInput } from "@/features/source-library/api";
import { runWithConcurrency } from "@ai-matrx/kit/concurrency";
import { updateMedia } from "../../service";
import type { ResearchMedia } from "../../types";
import { idMatchesQuery } from "@ai-matrx/kit/search-scoring";
import {
  bucketMedia,
  formatResolvedSizeLabel,
  isFeaturedPhoto,
} from "./mediaCategorization";
import { fileNameFromUrl } from "@ai-matrx/files/client";
import {
  embedInfo,
  videoPoster,
  mediaLabelFromUrl,
  fileExt,
  hostLabel,
} from "./mediaEmbed";
import MediaDebugPanel from "./MediaDebugPanel";
import { ReadFailure } from "@ai-matrx/design-system";
import { StaleDataNotice } from "@ai-matrx/design-system";
import { openImageViewer } from "@/features/overlays/definitions/imageViewer.overlay";
import {
  ResearchMediaImage,
  researchMediaViewUrl,
  ResearchMediaOpen,
  isOwnedMedia,
  mediaMimeType,
  researchMediaRef,
} from "./ownedMedia";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { SessionMediaElement } from "@/features/audio/session/SessionMediaElement";
import { VideoPublishDate } from "@/features/files/blocks/video/VideoPublishDate";
import { uploadFileWithProgress } from "@/features/files/api/files";
import {
  parseYouTubeUrl,
  youTubeChannelLabel,
  youTubeEmbedUrl,
} from "@ai-matrx/rich-content/utils/youtube";
import { extractErrorMessage } from "@/utils/errors";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { openOutbound } from "@ai-matrx/kit/outbound";
import {
  formatYouTubeCount,
  formatYouTubeDuration,
} from "@/features/marketing/discovery/youtube/formatters";

const TYPE_ICONS = {
  image: ImageIcon,
  video: Play,
  document: File,
  audio: Music,
};


export default function MediaGallery() {
  const { topicId } = useTopicContext();
  const [view, setView] = useUrlState("view", enumUrlCodec(["gallery", "debug"] as const, "gallery"));
  const [relevanceFilter, setRelevanceFilter] = useUrlState(
    "show",
    enumUrlCodec(["all", "relevant", "excluded"] as const, "all"),
  );
  const [search, setSearch] = useUrlState("q", stringUrlCodec(""));

  const {
    data: media,
    refresh,
    error: mediaError,
    isLoading: mediaLoading,
  } = useResearchMedia(topicId);

  const mediaList = (media as ResearchMedia[]) ?? [];

  const filtered = useMemo(() => {
    let items = mediaList;
    if (relevanceFilter === "relevant")
      items = items.filter((m) => m.is_relevant);
    else if (relevanceFilter === "excluded")
      items = items.filter((m) => !m.is_relevant);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) =>
          (m.alt_text ?? "").toLowerCase().includes(q) ||
          (m.caption ?? "").toLowerCase().includes(q) ||
          m.url.toLowerCase().includes(q) ||
          idMatchesQuery(m, q),
      );
    }
    return items;
  }, [mediaList, relevanceFilter, search]);

  const buckets = useMemo(() => bucketMedia(filtered), [filtered]);
  const youtubeVideoIds = buckets.videos.flatMap((item) => {
    const parsed = parseYouTubeUrl(item.url);
    return parsed ? [parsed.videoId] : [];
  });
  const { identityForId: youtubeIdentityForId } =
    useYouTubeVideoIdentityIndex(youtubeVideoIds);

  const handleToggleRelevance = useCallback(
    async (item: ResearchMedia) => {
      await updateMedia(item.id, { is_relevant: !item.is_relevant });
      refresh();
    },
    [refresh],
  );

  const totalEmpty = filtered.length === 0;
  const hasPhotoSections =
    buckets.landscape.length > 0 ||
    buckets.square.length > 0 ||
    buckets.portrait.length > 0 ||
    buckets.unknownAspect.length > 0;

  return (
    <div className="space-y-4 px-3 pb-4 sm:px-4">
      <div className="sticky top-0 z-20 -mx-3 space-y-2 border-b border-border/60 bg-background/90 px-3 py-2 backdrop-blur-xl sm:-mx-4 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="type-section shrink-0 whitespace-nowrap">
            Media{" "}
            <span className="type-meta tabular-nums text-muted-foreground">
              <UntrustedCount
                read={readOf({ isLoading: mediaLoading, error: mediaError })}
                value={filtered.length === mediaList.length ? `${mediaList.length}` : `${filtered.length} of ${mediaList.length}`}
                label="Media"
              />
            </span>
          </h2>
          <SearchField
            value={search}
            onChange={(event) => setSearch(event.target.value, { history: "replace" })}
            placeholder="Search media"
            aria-label="Search media"
            className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:min-w-48 sm:flex-1"
          />
          <SegmentedControl
            aria-label="Show"
            value={relevanceFilter}
            onValueChange={(next) => setRelevanceFilter(next)}
            data={[
              { value: "all", label: "All" },
              { value: "relevant", label: "Relevant" },
              { value: "excluded", label: "Excluded" },
            ]}
          />
          <SegmentedControl
            aria-label="Media view"
            value={view}
            onValueChange={(next) => setView(next)}
            data={[
              { value: "gallery", label: <span className="inline-flex items-center gap-1"><LayoutGrid className="size-3" />Gallery</span> },
              { value: "debug", label: <span className="inline-flex items-center gap-1"><Bug className="size-3" />Debug</span> },
            ]}
          />
        </div>
        {view === "gallery" && <MediaSectionNav sections={mediaSections(buckets)} />}
      </div>

      {mediaError && mediaList.length > 0 && (
        <StaleDataNotice
          hasData
          what="this topic's media"
          onRetry={refresh}
          retrying={mediaLoading}
          detail={mediaError}
        />
      )}

      {view === "debug" ? (
        <MediaDebugPanel
          topicId={topicId}
          items={filtered}
          totalCount={mediaList.length}
          scope="filtered"
        />
      ) : mediaError && mediaList.length === 0 ? (
        <ReadFailure
          error={mediaError}
          what="this topic's media"
          onRetry={refresh}
        />
      ) : mediaLoading && mediaList.length === 0 ? (
        <div
          role="status"
          className="flex min-h-[280px] items-center justify-center type-secondary text-muted-foreground"
        >
          Loading media…
        </div>
      ) : totalEmpty ? (
        <div className="flex flex-col items-center justify-center min-h-[280px] gap-3 text-center px-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-primary/40" />
          </div>
          <div>
            <p className="type-secondary font-medium text-foreground/70">
              {mediaList.length === 0 ? "No media yet" : "No matches"}
            </p>
            <p className="type-meta text-muted-foreground mt-1 max-w-[240px]">
              {mediaList.length === 0
                ? "Images, videos, and other media are automatically extracted when you read sources."
                : "Try adjusting your search or filters to find what you're looking for."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {buckets.documents.length > 0 && (
            <div id="media-documents" className="scroll-mt-28">
            <DocumentSection
              items={buckets.documents}
              onToggleRelevance={handleToggleRelevance}
            />
            </div>
          )}
          {buckets.videos.length > 0 && (
            <div id="media-videos" className="scroll-mt-28">
            <VideoSection
              items={buckets.videos}
              onToggleRelevance={handleToggleRelevance}
              identityForId={youtubeIdentityForId}
              videosHref={`/research/topics/${topicId}/youtube`}
            />
            </div>
          )}
          {buckets.audio.length > 0 && (
            <div id="media-audio" className="scroll-mt-28">
            <ResourceSection
              icon={Music}
              title="Audio"
              description="Audio files and podcasts"
              items={buckets.audio}
              onToggleRelevance={handleToggleRelevance}
            />
            </div>
          )}
          <div id="media-images" className="scroll-mt-28 space-y-5">
          {buckets.landscape.length > 0 && (
            <PhotoAspectSection
              icon={RectangleHorizontal}
              title="Landscape"
              description="Wider than tall"
              items={buckets.landscape}
              aspectClass="aspect-video"
              featuredGrid="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
              standardGrid="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
              onToggleRelevance={handleToggleRelevance}
            />
          )}
          {buckets.square.length > 0 && (
            <PhotoAspectSection
              icon={Square}
              title="Square"
              description="Roughly 1:1"
              items={buckets.square}
              aspectClass="aspect-square"
              featuredGrid="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
              standardGrid="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
              onToggleRelevance={handleToggleRelevance}
            />
          )}
          {buckets.portrait.length > 0 && (
            <PhotoAspectSection
              icon={RectangleVertical}
              title="Portrait"
              description="Taller than wide"
              items={buckets.portrait}
              aspectClass="aspect-[3/4]"
              featuredGrid="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
              standardGrid="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2"
              onToggleRelevance={handleToggleRelevance}
            />
          )}
          {buckets.unknownAspect.length > 0 && (
            <PhotoAspectSection
              icon={HelpCircle}
              title="Unknown Dimensions"
              description="Images without width/height"
              items={buckets.unknownAspect}
              aspectClass="aspect-video"
              featuredGrid="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
              standardGrid="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
              onToggleRelevance={handleToggleRelevance}
            />
          )}
          </div>
          {!hasPhotoSections &&
            buckets.graphics.length === 0 &&
            buckets.icons.length === 0 &&
            buckets.videos.length === 0 &&
            buckets.youtubeChannels.length === 0 &&
            buckets.documents.length === 0 &&
            buckets.audio.length === 0 && (
              <div className="type-meta text-muted-foreground px-1">
                No items matched the current filters.
              </div>
            )}
          {buckets.graphics.length > 0 && (
            <div id="media-graphics" className="scroll-mt-28">
            <GraphicsSection
              items={buckets.graphics}
              onToggleRelevance={handleToggleRelevance}
            />
            </div>
          )}
          {buckets.icons.length > 0 && (
            <div id="media-icons" className="scroll-mt-28">
            <IconsSection
              items={buckets.icons}
              onToggleRelevance={handleToggleRelevance}
            />
            </div>
          )}
          {buckets.youtubeChannels.length > 0 && (
            <div id="media-channels" className="scroll-mt-28">
            <YouTubeChannelsSection
              items={buckets.youtubeChannels}
              onToggleRelevance={handleToggleRelevance}
              onEnriched={refresh}
            />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MediaSectionLink {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
}

function mediaSections(buckets: ReturnType<typeof bucketMedia>): MediaSectionLink[] {
  const images =
    buckets.landscape.length + buckets.square.length + buckets.portrait.length + buckets.unknownAspect.length;
  return [
    { key: "documents", label: "Documents", count: buckets.documents.length, icon: <FileText /> },
    { key: "videos", label: "Videos", count: buckets.videos.length, icon: <Video /> },
    { key: "audio", label: "Audio", count: buckets.audio.length, icon: <Music /> },
    { key: "images", label: "Images", count: images, icon: <ImageIcon /> },
    { key: "graphics", label: "Graphics", count: buckets.graphics.length, icon: <Shapes /> },
    { key: "icons", label: "Icons", count: buckets.icons.length, icon: <Zap /> },
    { key: "channels", label: "Channels", count: buckets.youtubeChannels.length, icon: <Users /> },
  ].filter((section) => section.count > 0);
}

/** Every kind on the page, always in view: shows where you are, jumps on click. */
function MediaSectionNav({ sections }: { sections: MediaSectionLink[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  const keys = sections.map((section) => section.key).join(",");

  useEffect(() => {
    const elements = keys
      .split(",")
      .map((key) => document.getElementById(`media-${key}`))
      .filter((element): element is HTMLElement => !!element);
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.id.replace("media-", ""));
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [keys]);

  if (sections.length < 2) return null;
  return (
    <nav aria-label="Media sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
      {sections.map((section) => (
        <Chip
          key={section.key}
          asChild
          label={`${section.label} ${section.count}`}
          icon={section.icon}
          pressed={(current ?? sections[0]?.key) === section.key}
        >
          <button
            type="button"
            onClick={() => {
              setCurrent(section.key);
              document
                .getElementById(`media-${section.key}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </Chip>
      ))}
    </nav>
  );
}

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  description?: string;
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  description,
}: SectionHeaderProps) {
  return (
    <div className="flex items-baseline gap-2 px-1">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-foreground/60" />
        <h3
          className="type-meta font-semibold uppercase tracking-wider text-foreground/70"
          title={description}
        >
          {title}
        </h3>
      </div>
      <span className="type-meta tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

interface SectionProps {
  items: ResearchMedia[];
  onToggleRelevance: (item: ResearchMedia) => void;
}

interface PhotoAspectSectionProps extends SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  aspectClass: string;
  /** Fewer columns → larger tiles for big, high-resolution images. */
  featuredGrid: string;
  /** More columns → smaller tiles for modest-resolution images. */
  standardGrid: string;
}

function PhotoAspectSection({
  icon,
  title,
  description,
  items,
  aspectClass,
  featuredGrid,
  standardGrid,
  onToggleRelevance,
}: PhotoAspectSectionProps) {
  // Items arrive sorted by area (largest first). Split into a big-tile
  // "featured" band and a small-tile "standard" band so resolution drives
  // display size — big, high-quality images read large; modest ones stay small.
  const featured = items.filter(isFeaturedPhoto);
  const standard = items.filter((i) => !isFeaturedPhoto(i));
  const dispatch = useAppDispatch();
  const ordered = [...featured, ...standard];
  const openAt = (item: ResearchMedia) =>
    openImageViewer(dispatch, {
      images: ordered.map(researchMediaViewUrl),
      alts: ordered.map((entry) => entry.alt_text || entry.caption || ""),
      initialIndex: Math.max(0, ordered.indexOf(item)),
      title,
    });

  return (
    <section className="space-y-2">
      <SectionHeader
        icon={icon}
        title={title}
        count={items.length}
        description={description}
      />
      {featured.length > 0 && (
        <div className={featuredGrid}>
          {featured.map((item) => (
            <PhotoCard
              key={item.id}
              item={item}
              aspectClass={aspectClass}
              onToggleRelevance={onToggleRelevance}
              onOpen={() => openAt(item)}
            />
          ))}
        </div>
      )}
      {standard.length > 0 && (
        <div className={standardGrid}>
          {standard.map((item) => (
            <PhotoCard
              key={item.id}
              item={item}
              aspectClass={aspectClass}
              onToggleRelevance={onToggleRelevance}
              onOpen={() => openAt(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GraphicsSection({ items, onToggleRelevance }: SectionProps) {
  return (
    <section className="space-y-2">
      <SectionHeader
        icon={Shapes}
        title="Graphics"
        count={items.length}
        description="Logos, thumbnails, banners, and small graphics — shown at their real size"
      />
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <GraphicCard
            key={item.id}
            item={item}
            onToggleRelevance={onToggleRelevance}
          />
        ))}
      </div>
    </section>
  );
}

function IconsSection({ items, onToggleRelevance }: SectionProps) {
  return (
    <section className="space-y-2">
      <SectionHeader
        icon={Zap}
        title="Icons & Favicons"
        count={items.length}
        description="Tiny graphics shown at native size (64px or less)"
      />
      <div className="flex flex-wrap gap-1.5 rounded-xl matrx-glass-card p-2">
        {items.map((item) => (
          <IconTile
            key={item.id}
            item={item}
            onToggleRelevance={onToggleRelevance}
          />
        ))}
      </div>
    </section>
  );
}

function PhotoCard({
  item,
  aspectClass,
  onToggleRelevance,
  onOpen,
}: {
  item: ResearchMedia;
  aspectClass: string;
  onToggleRelevance: (item: ResearchMedia) => void;
  onOpen?: () => void;
}) {
  const Icon = TYPE_ICONS[item.media_type as keyof typeof TYPE_ICONS] ?? File;
  const dims = formatResolvedSizeLabel(item);

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden transition-all",
        item.is_relevant ? "border-primary/20" : "border-border/50 opacity-60",
      )}
    >
      <div
        className={cn(
          "bg-muted/50 flex items-center justify-center overflow-hidden",
          aspectClass,
        )}
      >
        {item.media_type === "image" && item.url ? (
          <ResearchMediaImage
            item={item}
            onClick={onOpen}
            className={cn("w-full h-full", onOpen && "cursor-zoom-in")}
          />
        ) : (
          <Icon className="h-6 w-6 text-muted-foreground/30" />
        )}
      </div>
      <div className="p-1.5 flex items-center justify-between gap-1">
        <p className="type-meta truncate text-muted-foreground flex-1">
          {item.alt_text || item.caption || item.url}
        </p>
        {dims && (
          <span className="text-[9px] tabular-nums text-muted-foreground/60 shrink-0">
            {dims}
          </span>
        )}
      </div>
      <Button
        variant={item.is_relevant ? "default" : "outline"}
        size="icon"
        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
        onClick={() => onToggleRelevance(item)}
      >
        {item.is_relevant ? (
          <Check className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

function GraphicCard({
  item,
  onToggleRelevance,
}: {
  item: ResearchMedia;
  onToggleRelevance: (item: ResearchMedia) => void;
}) {
  const dims = formatResolvedSizeLabel(item);
  const tooltip =
    [item.alt_text, item.caption, dims].filter(Boolean).join(" · ") || item.url;

  // Fixed height, width follows the image's aspect (object-contain) so a wide
  // banner reads wide-and-short and a logo reads small — no tiny image marooned
  // in a big box.
  return (
    <div
      className={cn(
        "group relative h-24 inline-flex items-center justify-center rounded-lg border bg-muted/20 backdrop-blur-sm overflow-hidden transition-all",
        item.is_relevant ? "border-primary/20" : "border-border/50 opacity-60",
      )}
      title={tooltip}
    >
      {item.url ? (
        <ResearchMediaImage
          item={item}
          fit="contain"
          className="h-full w-[220px] max-w-[220px]"
        />
      ) : (
        <div className="h-full w-24 flex items-center justify-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
        </div>
      )}
      {dims && (
        <span className="absolute bottom-1 left-1 px-1 rounded bg-background/70 backdrop-blur-sm text-[9px] tabular-nums text-muted-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity">
          {dims}
        </span>
      )}
      <Button
        variant={item.is_relevant ? "default" : "outline"}
        size="icon"
        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onToggleRelevance(item)}
      >
        {item.is_relevant ? (
          <Check className="h-2.5 w-2.5" />
        ) : (
          <X className="h-2.5 w-2.5" />
        )}
      </Button>
    </div>
  );
}

function IconTile({
  item,
  onToggleRelevance,
}: {
  item: ResearchMedia;
  onToggleRelevance: (item: ResearchMedia) => void;
}) {
  const dims = formatResolvedSizeLabel(item);
  const tooltip =
    [item.alt_text, item.caption, dims, item.url].filter(Boolean).join(" · ") ||
    item.url;

  return (
    <div
      className={cn(
        "group relative h-12 w-12 rounded-md border bg-card/80 flex items-center justify-center overflow-hidden transition-all hover:scale-110 hover:z-10",
        item.is_relevant
          ? "border-border/60"
          : "border-border/30 opacity-50 hover:opacity-100",
      )}
      title={tooltip}
      onDoubleClick={() => onToggleRelevance(item)}
    >
      {item.url ? (
        <ResearchMediaImage
          item={item}
          fit="contain"
          className="h-full w-full"
        />
      ) : (
        <ImageIcon className="h-3 w-3 text-muted-foreground/30" />
      )}
      {!item.is_relevant && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/40 transition-colors">
          <X className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
        </div>
      )}
    </div>
  );
}

/** Reads the `kind` hint (pdf, youtube, csv, …) the server stores in metadata. */
function resourceKind(item: ResearchMedia): string | null {
  const m = item.metadata;
  if (m && typeof m === "object" && !Array.isArray(m)) {
    const kind = (m as Record<string, unknown>).kind;
    if (typeof kind === "string" && kind) return kind;
  }
  return null;
}

/**
 * A non-image research resource (PDF / video / audio). Opens the URL in a new
 * tab; shows a poster thumbnail when one exists (e.g. YouTube), otherwise the
 * type icon. The relevance toggle sits OUTSIDE the anchor so it doesn't open.
 */
function ResourceCard({
  item,
  onToggleRelevance,
}: {
  item: ResearchMedia;
  onToggleRelevance: (item: ResearchMedia) => void;
}) {
  const Icon = TYPE_ICONS[item.media_type as keyof typeof TYPE_ICONS] ?? File;
  const kind = resourceKind(item);
  const owned = isOwnedMedia(item);
  const label =
    item.alt_text || item.caption || (owned ? "Uploaded artifact" : item.url);

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden transition-all",
        item.is_relevant ? "border-primary/20" : "border-border/50 opacity-60",
      )}
    >
      <ResearchMediaOpen
        item={item}
        className="block w-full text-left"
        title={label}
      >
        <div className="relative aspect-video bg-muted/50 flex items-center justify-center overflow-hidden">
          {owned || item.thumbnail_url ? (
            <ResearchMediaImage item={item} className="w-full h-full" />
          ) : (
            <Icon className="h-7 w-7 text-muted-foreground/40" />
          )}
          {item.media_type === "video" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm">
                <Play className="h-3.5 w-3.5 text-foreground/80" />
              </span>
            </span>
          )}
          <span className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="h-3 w-3 text-foreground/60" />
          </span>
        </div>
        <div className="p-1.5">
          <p className="type-meta truncate text-foreground/80">{label}</p>
          {kind && (
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
              {kind}
            </p>
          )}
        </div>
      </ResearchMediaOpen>
      <Button
        variant={item.is_relevant ? "default" : "outline"}
        size="icon"
        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
        onClick={() => onToggleRelevance(item)}
      >
        {item.is_relevant ? (
          <Check className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

interface ResourceSectionProps extends SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function ResourceSection({
  icon,
  title,
  description,
  items,
  onToggleRelevance,
}: ResourceSectionProps) {
  return (
    <section className="space-y-2">
      <SectionHeader
        icon={icon}
        title={title}
        count={items.length}
        description={description}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {items.map((item) => (
          <ResourceCard
            key={item.id}
            item={item}
            onToggleRelevance={onToggleRelevance}
          />
        ))}
      </div>
    </section>
  );
}

const DIRECT_VIDEO_RE = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i;

/** Embeddable YouTube video — iframe player loads inline (no outbound redirect). */
function YouTubeVideoCard({
  item,
  videoId,
  start,
  identity,
  onToggleRelevance,
}: {
  item: ResearchMedia;
  videoId: string;
  start?: number;
  identity?: YouTubeVideoIdentity;
  onToggleRelevance: (item: ResearchMedia) => void;
}) {
  // Poster first, player on press: mounting one live YouTube iframe per video
  // (169 on a measured topic) painted black boxes until each loaded and cost
  // the tab a player per card.
  const [playing, setPlaying] = useState(false);
  const title =
    identity?.title || item.alt_text || item.caption || "YouTube video";
  const poster =
    identity?.thumbnail_url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const meta = [
    identity?.channel_title,
    identity?.view_count != null
      ? `${formatYouTubeCount(identity.view_count)} views`
      : null,
    identity?.duration ? formatYouTubeDuration(identity.duration) : null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all",
        item.is_relevant ? "border-border" : "border-border opacity-60",
      )}
    >
      <div className="relative aspect-video w-full bg-muted">
        {playing ? (
          <iframe
            src={youTubeEmbedUrl(videoId, { start, autoplay: true })}
            aria-label={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0"
            aria-label={`Play ${title}`}
          >
            <img
              src={poster}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              {/* ui-exception: play glyph sits on a photo — fixed white on a dark scrim. */}
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 transition-colors group-hover:bg-black/75">
                <Play className="h-5 w-5 text-white" />
              </span>
            </span>
            {identity?.published_at && (
              <VideoPublishDate
                publishedAt={identity.published_at}
                className="pointer-events-none absolute bottom-1.5 left-1.5 z-10 rounded bg-black/75 px-1 py-0.5 text-white shadow-sm"
              />
            )}
          </button>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 p-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 type-title text-foreground" title={title}>
            {title}
          </p>
          {meta.length > 0 && (
            <p className="mt-0.5 truncate type-meta text-muted-foreground">
              {meta.join(" · ")}
            </p>
          )}
        </div>
        <OutboundLink
          href={item.url}
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          title="Open on YouTube"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </OutboundLink>
      </div>
      <Button
        variant={item.is_relevant ? "default" : "outline"}
        size="icon"
        className="absolute right-1.5 top-1.5 z-10 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100"
        onClick={() => onToggleRelevance(item)}
      >
        {item.is_relevant ? (
          <Check className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

/** One YouTube lookup (1 unit), saved on the media row so it is never asked again. */
async function lookUpChannel(dispatch: ReturnType<typeof useAppDispatch>, item: ResearchMedia) {
  const resolved = await resolveMediaInput(dispatch, item.url, "youtube");
  await saveChannelIdentity(item.id, item.metadata as Record<string, unknown> | null, {
    title: resolved.title,
    handle: resolved.handle,
    avatar: resolved.thumbnail_url,
    subscribers: resolved.subscriber_count,
    videos: resolved.item_count,
    description: resolved.description,
  });
}

/** YouTube channel/profile — avatar, name, subscribers; opens on YouTube (not
 * embeddable). Details come from what we already hold, else one lookup on click. */
function YouTubeChannelCard({
  item,
  known,
  onToggleRelevance,
  onEnriched,
}: {
  item: ResearchMedia;
  known?: YouTubeChannelIdentity;
  onToggleRelevance: (item: ResearchMedia) => void;
  onEnriched: () => void;
}) {
  const dispatch = useAppDispatch();
  const [looking, setLooking] = useState(false);
  const identity = savedChannelIdentity(item) ?? known ?? null;
  const handle = youTubeChannelLabel(item.url);
  const title = identity?.title ?? ((item.alt_text || item.caption || "").trim() || handle);
  const facts = [
    identity?.handle ?? handle,
    identity?.subscribers != null ? `${formatYouTubeCount(identity.subscribers)} subscribers` : null,
    identity?.videos != null ? `${formatYouTubeCount(identity.videos)} videos` : null,
  ].filter(Boolean);

  const lookUp = async () => {
    setLooking(true);
    try {
      await lookUpChannel(dispatch, item);
      onEnriched();
    } catch (caught) {
      toast.error(`Could not get channel details: ${extractErrorMessage(caught)}`);
    } finally {
      setLooking(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card/60 overflow-hidden transition-all",
        item.is_relevant ? "border-primary/20" : "border-border/50 opacity-60",
      )}
    >
      <OutboundLink href={item.url} className="flex flex-1 gap-3 p-3 pr-10" title={title}>
        {identity?.avatar ? (
          // ui-exception: a channel avatar renders raw, never tinted or wrapped.
          <img
            src={identity.avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
            <Users className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="type-secondary font-medium text-foreground line-clamp-1">{title}</p>
          <p className="type-meta text-muted-foreground line-clamp-1">{facts.join(" · ")}</p>
          {identity?.description && (
            <p className="type-meta mt-1 text-muted-foreground line-clamp-2">{identity.description}</p>
          )}
        </div>
      </OutboundLink>
      <div className="flex items-center justify-between gap-2 border-t border-border/40 px-3 py-1.5">
        <OutboundLink
          href={item.url}
          className="inline-flex items-center gap-1 type-meta text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open on YouTube
        </OutboundLink>
        {!identity && (
          <ControlButton
            variant="link"
            type="button"
            disabled={looking}
            icon={looking ? <Loader2 className="animate-spin" /> : undefined}
            onClick={() => void lookUp()}
          >
            Get details
          </ControlButton>
        )}
      </div>
      <Button
        variant={item.is_relevant ? "default" : "outline"}
        size="icon"
        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity shadow-sm"
        onClick={() => onToggleRelevance(item)}
      >
        {item.is_relevant ? (
          <Check className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

function YouTubeChannelsSection({
  items,
  onToggleRelevance,
  onEnriched,
}: SectionProps & { onEnriched: () => void }) {
  const dispatch = useAppDispatch();
  const { identityForUrl, refresh, isLoading, error } = useYouTubeChannelIdentityIndex(
    items.map((item) => item.url),
  );
  // Until our own channel read answers, "missing" would count every channel.
  const known = !isLoading && !error;
  const missing = items.filter((item) => !savedChannelIdentity(item) && !identityForUrl(item.url));
  const [lookingUp, setLookingUp] = useState(false);
  const lookUpAll = async () => {
    setLookingUp(true);
    const results = await runWithConcurrency(missing, 4, (item) => lookUpChannel(dispatch, item));
    setLookingUp(false);
    if (results.failed > 0) toast.error(`${results.failed} of ${missing.length} channels could not be found on YouTube.`);
    onEnriched();
    refresh();
  };
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <SectionHeader
          icon={Users}
          title="YouTube Channels"
          count={items.length}
          description="Creator pages linked from sources"
        />
        {known && missing.length > 1 && (
          <ControlButton
            variant="link"
            type="button"
            disabled={lookingUp}
            icon={lookingUp ? <Loader2 className="animate-spin" /> : undefined}
            onClick={() => void lookUpAll()}
          >
            {/* read-gate-exempt: rendered only once the channel read succeeded (`known`) */}
            {`Get details for ${missing.length}`}
          </ControlButton>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {items.map((item) => (
          <YouTubeChannelCard
            key={item.id}
            item={item}
            known={identityForUrl(item.url)}
            onToggleRelevance={onToggleRelevance}
            onEnriched={() => {
              onEnriched();
              refresh();
            }}
          />
        ))}
      </div>
    </section>
  );
}

/** Videos play INSIDE the app — YouTube/Vimeo embed, or an inline <video> for a
 * direct file. A poster (server thumbnail or a derived YouTube thumb) shows
 * until the user hits play, so we never load N iframes at once. */
function VideoCard({
  item,
  videoIdentity,
  onToggleRelevance,
}: {
  item: ResearchMedia;
  videoIdentity?: YouTubeVideoIdentity;
  onToggleRelevance: (item: ResearchMedia) => void;
}) {
  const [playing, setPlaying] = useState(false);

  // Embeddable YouTube watch/embed/shorts URLs → inline iframe player.
  const yt = parseYouTubeUrl(item.url);
  if (yt) {
    return (
      <YouTubeVideoCard
        item={item}
        videoId={yt.videoId}
        start={yt.start}
        identity={videoIdentity}
        onToggleRelevance={onToggleRelevance}
      />
    );
  }

  const embed = embedInfo(item);
  const poster = videoPoster(item);
  const owned = isOwnedMedia(item);
  // An owned video is bytes in our own storage: play it inline off the file
  // handler (which re-mints from the file_id) instead of pointing an element
  // at a URL column.
  const isDirectFile = !owned && DIRECT_VIDEO_RE.test(item.url);
  const canPlayInApp = !!embed || isDirectFile || owned;
  const label =
    item.alt_text ||
    item.caption ||
    (owned ? "Uploaded video" : hostLabel(item.url) || item.url);

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden transition-all",
        item.is_relevant ? "border-primary/20" : "border-border/50 opacity-60",
      )}
    >
      <div className="relative aspect-video bg-black/50 flex items-center justify-center overflow-hidden">
        {playing && embed ? (
          <iframe
            src={embed.embedUrl}
            aria-label={label}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : playing && owned ? (
          <InlineMediaRef
            ref={researchMediaRef(item)}
            size="fill"
            as="video"
            controls
            autoPlay
            alt={label}
            rounded="none"
            className="absolute inset-0 h-full w-full"
          />
        ) : playing && isDirectFile ? (
          <SessionMediaElement
            sessionSource="research"
            sessionLabel={label}
            src={item.url}
            className="absolute inset-0 h-full w-full"
            controls
            autoPlay
          />
        ) : (
          <button
            type="button"
            onClick={() =>
              canPlayInApp
                ? setPlaying(true)
                : openOutbound(item.url, "_blank", "noopener")
            }
            className="absolute inset-0 h-full w-full"
            title={canPlayInApp ? "Play" : "Open on source site"}
          >
            {owned ? (
              <ResearchMediaImage item={item} className="h-full w-full" />
            ) : poster ? (
              <img
                src={poster}
                alt={label}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Video className="h-7 w-7 text-muted-foreground/40" />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm group-hover:bg-black/75 transition-colors">
                <Play className="h-5 w-5 text-white" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="p-1.5 flex items-center justify-between gap-1">
        <p
          className="type-meta truncate text-foreground/80 flex-1"
          title={label}
        >
          {label}
        </p>
        <ResearchMediaOpen
          item={item}
          className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
          title={owned ? "Open the file" : "Open on source site"}
        >
          <ExternalLink className="h-3 w-3" />
        </ResearchMediaOpen>
      </div>
      <Button
        variant={item.is_relevant ? "default" : "outline"}
        size="icon"
        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
        onClick={() => onToggleRelevance(item)}
      >
        {item.is_relevant ? (
          <Check className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

function VideoSection({
  items,
  onToggleRelevance,
  identityForId,
  videosHref,
}: SectionProps & {
  identityForId: (videoId: string) => YouTubeVideoIdentity | undefined;
  /** The topic's Videos tab: the ranked library is the videos' home. */
  videosHref: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <SectionHeader
        icon={Video}
        title="Videos"
        count={items.length}
        description="Press a video to play it here"
      />
        <Link href={videosHref} className="type-meta font-medium text-foreground hover:underline">
          Open in Videos
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Videos we know (a library row: title, channel, views) lead; bare embeds follow. */}
        {[...items]
          .sort((a, b) => {
            const known = (item: ResearchMedia) => {
              const id = parseYouTubeUrl(item.url)?.videoId;
              return id && identityForId(id) ? 0 : 1;
            };
            return known(a) - known(b);
          })
          .map((item) => {
            const videoId = parseYouTubeUrl(item.url)?.videoId;
            return (
              <VideoCard
                key={item.id}
                item={item}
                videoIdentity={videoId ? identityForId(videoId) : undefined}
                onToggleRelevance={onToggleRelevance}
              />
            );
          })}
      </div>
    </section>
  );
}

function DocIcon({
  item,
  className,
}: {
  item: ResearchMedia;
  className?: string;
}) {
  const ext = fileExt(item.url);
  const kind = resourceKind(item);
  if (ext === "pdf" || kind === "pdf")
    return <FileText className={className} />;
  if (["csv", "tsv", "xls", "xlsx", "ods"].includes(ext) || kind === "csv")
    return <FileSpreadsheet className={className} />;
  if (["doc", "docx", "ppt", "pptx", "odt", "rtf", "txt"].includes(ext))
    return <FileType className={className} />;
  return <File className={className} />;
}

/** Logical folder the gallery saves remote documents into. */
const SAVED_DOCS_FOLDER = "Research/Saved Documents";

/** A best-effort upload filename: the real file name recognized from the URL
 * (`@ai-matrx/files/client` — null for a UUID or extension-less segment, so an
 * id or a host never becomes a file name), else the alt-text/caption plus the
 * URL's extension, else `document.pdf`. */
function uploadFileName(item: ResearchMedia): string {
  const fromUrl = fileNameFromUrl(item.url);
  if (fromUrl) return fromUrl;
  const base =
    (item.alt_text || item.caption || "document")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 120) || "document";
  const ext = fileExt(item.url) || (resourceKind(item) === "pdf" ? "pdf" : "");
  return ext ? `${base}.${ext}` : `${base}.pdf`;
}

/** A file card with a type icon, real file name, source host, an Open action,
 * and a "Save to library" action that pulls the remote file into the user's
 * cloud library. */
function DocumentCard({
  item,
  onToggleRelevance,
}: {
  item: ResearchMedia;
  onToggleRelevance: (item: ResearchMedia) => void;
}) {
  const owned = isOwnedMedia(item);
  // An owned row's `url` is a durable pointer (CDN URL or the bare file_id),
  // never a file path — so the name/host/extension come from what we actually
  // know about the artifact, and "Save to library" is hidden: it is already
  // there.
  const name =
    (item.alt_text || "").trim() ||
    (owned
      ? item.caption || "Uploaded document"
      : (item.caption || "").trim() || mediaLabelFromUrl(item.url));
  // When no real file name exists the label IS the host — don't print it twice.
  const sourceHost = owned ? "Your library" : hostLabel(item.url);
  const host = sourceHost === name ? "" : sourceHost;
  const ext = owned
    ? (mediaMimeType(item) || "").split("/").pop() || ""
    : fileExt(item.url) || resourceKind(item) || "";
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const filename = uploadFileName(item);
    try {
      // Pull the remote file as bytes. A cross-origin host without permissive
      // CORS will reject this — caught below and surfaced as a clean toast.
      const res = await fetch(item.url);
      if (!res.ok) {
        throw new Error(`Source returned ${res.status}`);
      }
      const blob = await res.blob();
      // `File` is shadowed by the lucide-react icon imported above, so reach
      // for the global File constructor explicitly.
      const file = new globalThis.File([blob], filename, {
        type: blob.type || "application/pdf",
      });
      await uploadFileWithProgress(
        { file, filePath: `${SAVED_DOCS_FOLDER}/${filename}` },
        () => {
          /* progress is fast for documents — button spinner is enough */
        },
      );
      toast.success(`Saved "${filename}" to your library`);
    } catch (err) {
      const detail = extractErrorMessage(err, "Unknown error");
      toast.error(`Couldn't save "${filename}"`, {
        description:
          "The source may block direct downloads. Try Open, then save it manually.",
      });
      console.error("[MediaGallery] save to library failed:", detail, err);
    } finally {
      setSaving(false);
    }
  }, [item, saving]);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden transition-all",
        item.is_relevant ? "border-primary/20" : "border-border/50 opacity-60",
      )}
    >
      <div className="flex items-start gap-2 p-2.5">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/8 flex items-center justify-center">
          <DocIcon item={item} className="h-5 w-5 text-primary/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="type-meta font-medium text-foreground/90 line-clamp-2 break-words"
            title={name}
          >
            {name}
          </p>
          <p className="mt-0.5 truncate text-[9px] text-muted-foreground/70">
            {[host, ext && ext.toUpperCase()].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-3 border-t border-border/40 px-2.5 py-1.5">
        <ResearchMediaOpen
          item={item}
          className="inline-flex items-center gap-1 type-meta text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> Open
        </ResearchMediaOpen>
        {/* Owned artifacts are already in the library — nothing to save. */}
        {!owned && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:cursor-default"
            title="Save a copy to your cloud library"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Download className="h-3 w-3" /> Save to library
              </>
            )}
          </button>
        )}
      </div>
      <Button
        variant={item.is_relevant ? "default" : "outline"}
        size="icon"
        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
        onClick={() => onToggleRelevance(item)}
      >
        {item.is_relevant ? (
          <Check className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

function DocumentSection({ items, onToggleRelevance }: SectionProps) {
  return (
    <section className="space-y-2">
      <SectionHeader
        icon={FileText}
        title="Documents"
        count={items.length}
        description="PDFs, slides, spreadsheets, and other files"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {items.map((item) => (
          <DocumentCard
            key={item.id}
            item={item}
            onToggleRelevance={onToggleRelevance}
          />
        ))}
      </div>
    </section>
  );
}
