"use client";

/**
 * ResearchMediaView — the inspiration/reuse pool: every image the research
 * system captured for this organization, with its source page and topic.
 * Own-domain images can be promoted straight into the brand library;
 * third-party images are inspiration — open the source, or hand the look to
 * the Generate view as a creative brief.
 *
 * Brand organization (2026-10-17): the Brand filter narrows the pool to images
 * whose research topic is linked to a brand (research_topic → web_brand) or
 * that were organized under it directly (research_media → web_brand) — this
 * brand by default, another brand, None (no brand link at all) or All. Select
 * images (one or many) and give them a brand-image category: one batched write
 * links each image to the brand and to the category (research_media →
 * category, role brand_image:<brandId>). All edges live in platform.associations.
 *
 * 2026-10-19: every filter runs in the query (counts cover every image, not the
 * loaded page); tags are brand-scoped — the tag brand is the Brand filter's
 * brand when one is picked, else this page's brand; an image's last tag for a
 * brand removed takes it out of that brand.
 */

import { useState } from "react";
import { categorizeSizeTier } from "@/lib/media/categorization";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, FolderPlus, Search, Telescope, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Chip,
  ChipSet,
  Select,
  type SelectOption,
} from "@ai-matrx/design-system/controls";
import { CategorySelect, useCategories } from "@ai-matrx/associations/react";
import { CATEGORY_DIMENSIONS } from "@/features/scopes/categoryDimensions";
import {
  useBrandOptions,
  useBrandProperties,
  useCreateBrandAsset,
  useResearchImageOrganization,
  useResearchImagePages,
  useResearchImageTopics,
  useTagResearchImages,
  useUnlinkResearchImagesFromBrand,
  useUntagResearchImages,
} from "@/features/marketing/data/hooks";
import {
  LoadingSurface,
  QueryError,
  SectionCard,
} from "@/features/marketing/components/shared/MarketingUi";
import { ProInput } from "@/components/official/ProInput";
import { MediaEmptyState } from "@/features/marketing/components/media/SnapshotMediaGallery";
import { InlineMediaRef } from "@ai-matrx/media/react";
import {
  fileIdToMediaRef,
  urlToMediaRef,
} from "@/features/files/redux/converters";
import type {
  ResearchBrandScope,
  ResearchCategoryFilter,
  ResearchImageRow,
} from "@/features/marketing/data/media-library";
import { useDebounce } from "@/features/tasks/hooks/useDebounce";
import { researchThisHref } from "@/features/research/utils/init-route";
import { subjectFromBrandProperties } from "@/features/research/utils/subject";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const BRAND_NONE = "__none__";
const BRAND_ALL = "__all__";
const CATEGORY_ALL = "__all__";
const CATEGORY_NONE = "__none__";

export function ResearchMediaView({
  brandId,
  brandName,
  organizationId,
  siteRootUrls,
  onUseAsBrief,
}: {
  brandId: string;
  brandName: string;
  organizationId: string;
  /**
   * The brand's website root URLs. "Own" is a match against ANY of them — a
   * brand owns several sites, and this view sits at the brand level.
   */
  siteRootUrls: ReadonlyArray<string | null>;
  /** Hand this image to the Generate view as a creative brief. */
  onUseAsBrief: (image: ResearchImageRow) => void;
}) {

  const createAsset = useCreateBrandAsset();
  const pathname = usePathname();
  const [topicFilter, setTopicFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState<"all" | "own" | "external">(
    "all",
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>(brandId);
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_ALL);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const brands = useBrandOptions(organizationId);
  const properties = useBrandProperties(brandId);
  const topics = useResearchImageTopics(organizationId);
  const categories = useCategories({
    dimension: CATEGORY_DIMENSIONS.brandImage,
  });
  const tagImages = useTagResearchImages();
  const untagImages = useUntagResearchImages();
  const unlinkImages = useUnlinkResearchImagesFromBrand();

  // Tags are brand-scoped: a picked brand's tags, else this page's brand.
  const brandPicked = brandFilter !== BRAND_ALL && brandFilter !== BRAND_NONE;
  const tagBrandId = brandPicked ? brandFilter : brandId;
  const tagBrandName =
    tagBrandId === brandId
      ? brandName
      : (brands.data?.find((b) => b.id === tagBrandId)?.name ?? "this brand");

  // Every filter runs in the query (every image, not just the loaded page); None waits for its list.
  const brandScope: ResearchBrandScope | null =
    brandFilter === BRAND_ALL
      ? { kind: "all" }
      : brandFilter === BRAND_NONE
        ? brands.data
          ? { kind: "none", brandIds: brands.data.map((b) => b.id) }
          : null
        : { kind: "brand", brandId: brandFilter };
  const categoryScope: ResearchCategoryFilter | null =
    categoryFilter === CATEGORY_ALL
      ? { kind: "any" }
      : categoryFilter === CATEGORY_NONE
        ? categories.status === "ready"
          ? {
              kind: "none",
              brandId: tagBrandId,
              categoryIds: categories.categories.map((c) => c.id),
            }
          : null
        : { kind: "category", brandId: tagBrandId, categoryId: categoryFilter };
  const siteHosts = siteRootUrls
    .map(hostnameOf)
    .filter((host): host is string => Boolean(host));
  const images = useResearchImagePages(
    organizationId,
    brandScope && categoryScope
      ? {
          scope: brandScope,
          category: categoryScope,
          topicId: topicFilter === "all" ? null : topicFilter,
          origin: originFilter,
          siteHosts,
          search: debouncedSearch,
        }
      : null,
  );
  const refreshing = images.isPlaceholderData || search.trim() !== debouncedSearch;

  const rows = images.data?.pages.flatMap((page) => page.rows) ?? [];
  const total = images.data?.pages[0]?.total ?? rows.length;
  const imageIds = rows.map((row) => row.id);
  const topicIds = [
    ...new Set(rows.flatMap((row) => (row.topicId ? [row.topicId] : []))),
  ];
  const organization = useResearchImageOrganization(
    organizationId,
    tagBrandId,
    imageIds,
    topicIds,
  );
  const links = organization.data;

  const categoryName = new Map(
    categories.categories.map((category) => [category.id, category.name]),
  );
  const categoriesOf = (row: ResearchImageRow): string[] =>
    links?.imageCategories[row.id] ?? [];

  const isOwn = (row: ResearchImageRow) => {
    if (siteHosts.length === 0) return false;
    const sourceHost = (row.sourceHostname ?? "").replace(/^www\./, "");
    const imageHost = hostnameOf(row.url);
    return siteHosts.some((host) => host === sourceHost || host === imageHost);
  };

  // Selection only ever holds loaded images: when the result changes, drop
  // ids that left it (adjust-state-during-render on the query's own data).
  const [seenData, setSeenData] = useState(images.data);
  if (seenData !== images.data) {
    setSeenData(images.data);
    const visible = new Set(imageIds);
    if ([...selected].some((id) => !visible.has(id))) {
      setSelected(new Set([...selected].filter((id) => visible.has(id))));
    }
  }

  const newResearchHref = researchThisHref({
    name: brandName,
    subject: subjectFromBrandProperties(brandId, properties.data ?? []),
    returnTo: pathname,
  });

  const brandOptions: SelectOption[] = [
    { value: brandId, label: brandName },
    ...(brands.data ?? [])
      .filter((brand) => brand.id !== brandId)
      .map((brand) => ({ value: brand.id, label: brand.name })),
    { value: BRAND_NONE, label: "No brand" },
    { value: BRAND_ALL, label: "All research" },
  ];
  const categoryOptions: SelectOption[] = [
    { value: CATEGORY_ALL, label: "Any category" },
    ...categories.categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
    { value: CATEGORY_NONE, label: "Uncategorized" },
  ];

  const selectedIds = [...selected];
  const selectedCategoryIds = [
    ...new Set(
      rows
        .filter((row) => selected.has(row.id))
        .flatMap((row) => categoriesOf(row)),
    ),
  ];
  const toggleSelected = (id: string, on: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const resetFilters = () => {
    setBrandFilter(BRAND_ALL);
    setCategoryFilter(CATEGORY_ALL);
    setTopicFilter("all");
    setOriginFilter("all");
    setSearch("");
  };

  const applyCategory = async (categoryId: string | null) => {
    if (!categoryId || selectedIds.length === 0) return;
    try {
      await tagImages.mutateAsync({
        imageIds: selectedIds,
        brandId: tagBrandId,
        categoryId,
        organizationId,
      });
      toast.success(
        `Tagged ${selectedIds.length} image${selectedIds.length === 1 ? "" : "s"}`,
      );
    } catch (error) {
      toast.error("Could not tag the images", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const selectedLinkedToBrand = rows.some(
    (row) =>
      selected.has(row.id) &&
      (links?.imageBrands[row.id] ?? []).includes(tagBrandId),
  );
  const unlinkFromBrand = async () => {
    if (selectedIds.length === 0) return;
    try {
      await unlinkImages.mutateAsync({
        imageIds: selectedIds,
        brandId: tagBrandId,
        organizationId,
      });
    } catch (error) {
      toast.error("Could not unlink the images", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const removeCategory = async (categoryId: string) => {
    if (selectedIds.length === 0) return;
    try {
      await untagImages.mutateAsync({
        imageIds: selectedIds,
        categoryId,
        brandId: tagBrandId,
        organizationId,
      });
    } catch (error) {
      toast.error("Could not remove the category", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const promote = async (row: ResearchImageRow) => {
    setPromotingId(row.id);
    try {
      await createAsset.mutateAsync({
        organizationId,
        brandId,
        kind: "image",
        sourceUrl: row.url,
        title: row.alt || row.caption || null,
        notes: row.sourceUrl
          ? `Promoted from research (${row.topicName ?? "topic"}) — source: ${row.sourceUrl}`
          : `Promoted from research (${row.topicName ?? "topic"}).`,
        isPrimary: false,
        source: "research",
      });
      toast.success("Added to the brand library");
    } catch (error) {
      toast.error("Could not add to the library", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPromotingId(null);
    }
  };

  const narrowed =
    categoryFilter !== CATEGORY_ALL ||
    topicFilter !== "all" ||
    originFilter !== "all" ||
    debouncedSearch !== "";

  if (images.isLoading || brandScope === null || categoryScope === null) {
    return <LoadingSurface label="Loading research images…" />;
  }
  if (images.isError) {
    return (
      <QueryError error={images.error} onRetry={() => void images.refetch()} />
    );
  }

  // Only an organization with no research at all gets the bare card; a brand with nothing linked keeps its filters.
  if (rows.length === 0 && brandFilter === BRAND_ALL && !narrowed && !refreshing) {
    return (
      <SectionCard title="Research images">
        <div className="p-3">
          <MediaEmptyState
            title="No research images for this organization yet"
            detail="Images from your research topics land here."
          />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Research images"
      about="Images from this brand's own websites can be reused directly. External images are competitor or reference material: use them as inspiration for a generated original, never verbatim."
      headerExtra={
        <span className="flex items-center gap-2">
          <span
            className="type-meta tabular-nums text-muted-foreground"
            title={total > rows.length ? `${rows.length} loaded` : undefined}
          >
            {total} {total === 1 ? "image" : "images"}
          </span>
          <Button variant="quiet" asChild title={`Start new research for ${brandName}`}>
            <Link href={newResearchHref}>
              <Telescope className="h-3.5 w-3.5" aria-hidden />
              New research
            </Link>
          </Button>
        </span>
      }
    >
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-48">
          <ProInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search URL, alt, caption, host"
            aria-label="Search research images"
            startIcon={<Search className="h-4 w-4 text-muted-foreground" aria-hidden />}
          />
        </div>
        <Select
          aria-label="Brand"
          value={brandFilter}
          options={brandOptions}
          onValueChange={setBrandFilter}
          className="w-[11rem]"
        />
        <Select
          aria-label="Topic"
          value={topicFilter}
          options={[
            { value: "all", label: "All topics" },
            ...(topics.data ?? []).map((topic) => ({
              value: topic.id,
              label: topic.name,
            })),
          ]}
          onValueChange={setTopicFilter}
          className="w-[12rem]"
        />
        <Select
          aria-label="Origin"
          value={originFilter}
          options={[
            { value: "all", label: "Any origin" },
            { value: "own", label: "This brand's domains" },
            { value: "external", label: "External (inspiration)" },
          ]}
          onValueChange={(value) =>
            setOriginFilter(value as "all" | "own" | "external")
          }
          className="w-[9rem]"
        />
        <Select
          aria-label="Category"
          value={categoryFilter}
          options={categoryOptions}
          onValueChange={setCategoryFilter}
          align="end"
          className="w-[10rem]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-2 py-1">
        <span className="type-meta tabular-nums text-foreground">
          {selectedIds.length} selected
        </span>
        <div className="w-[12rem]">
          <CategorySelect
            dimension={CATEGORY_DIMENSIONS.brandImage}
            value={null}
            onChange={(id) => void applyCategory(id)}
            placeholder={`Tag for ${tagBrandName}`}
            orgId={organizationId}
            noun="category"
            allowNone={false}
            disabled={selectedIds.length === 0 || tagImages.isPending}
          />
        </div>
        {selectedIds.length > 0 && selectedCategoryIds.length > 0 ? (
          <ChipSet>
            {selectedCategoryIds.map((categoryId) => (
              <Chip
                key={categoryId}
                asChild
                label={categoryName.get(categoryId) ?? "Category"}
                icon={<X />}
                title={`Remove this ${tagBrandName} tag from the selected images`}
              >
                <button
                  type="button"
                  disabled={untagImages.isPending}
                  onClick={() => void removeCategory(categoryId)}
                />
              </Chip>
            ))}
          </ChipSet>
        ) : null}
        {selectedIds.length > 0 && selectedLinkedToBrand ? (
          <Button
            variant="quiet"
            disabled={unlinkImages.isPending}
            title={`Take the selected images and their tags out of ${tagBrandName}`}
            onClick={() => void unlinkFromBrand()}
          >
            Remove from brand
          </Button>
        ) : null}
        <Button
          variant="quiet"
          className="ml-auto"
          disabled={selectedIds.length === 0}
          onClick={() => setSelected(new Set())}
        >
          Clear
        </Button>
      </div>

      {rows.length === 0 ? (
        brandPicked && !narrowed ? (
          // Nothing is linked to this brand yet: one way out, never a dead end.
          <MediaEmptyState
            title={`No research linked to ${brands.data?.find((b) => b.id === brandFilter)?.name ?? "this brand"} yet`}
            action={
              <Button variant="quiet" onClick={() => setBrandFilter(BRAND_ALL)}>
                Show all research
              </Button>
            }
          />
        ) : (
          <MediaEmptyState
            title="No research images match"
            action={
              <Button variant="quiet" onClick={resetFilters}>
                Reset filters
              </Button>
            }
          />
        )
      ) : (
        <div
          aria-busy={refreshing}
          className={
            refreshing
              ? "grid animate-ssr-shimmer-opacity grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              : "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          }
        >
          {rows.map((row) => {
            const own = isOwn(row);
            return (
              <div
                key={row.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/40">
                  <Checkbox
                    className="absolute left-1.5 top-1.5 z-10 bg-card"
                    checked={selected.has(row.id)}
                    onCheckedChange={(checked) =>
                      toggleSelected(row.id, checked === true)
                    }
                    aria-label="Select image"
                  />
                  <ResearchTileImage row={row} />
                </div>
                <div className="space-y-0.5 p-1.5">
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={
                        own
                          ? "h-4 border-success/50 px-1 type-meta text-success-ink"
                          : "h-4 px-1 type-meta"
                      }
                    >
                      {own ? "own domain" : (row.sourceHostname ?? "external")}
                    </Badge>
                    {row.width && row.height ? (
                      <span className="type-meta tabular-nums text-muted-foreground">
                        {row.width}×{row.height}
                      </span>
                    ) : null}
                  </div>
                  {row.alt || row.caption ? (
                    <p
                      className="truncate type-meta text-muted-foreground"
                      title={row.alt ?? row.caption ?? undefined}
                    >
                      {row.alt ?? row.caption}
                    </p>
                  ) : null}
                  {row.topicName ? (
                    <p className="truncate type-meta text-muted-foreground">
                      {row.topicName}
                    </p>
                  ) : null}
                  {categoriesOf(row).length > 0 ? (
                    <ChipSet>
                      {categoriesOf(row).map((categoryId) => (
                        <Chip
                          key={categoryId}
                          label={categoryName.get(categoryId) ?? "Category"}
                        />
                      ))}
                    </ChipSet>
                  ) : null}
                  <div className="flex items-center gap-0.5 pt-0.5">
                    {row.sourceUrl ? (
                      <Button
                        variant="quiet"
                        asChild
                      >
                        <OutboundLink
                          href={row.sourceUrl}
                          title="Open the source page"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </OutboundLink>
                      </Button>
                    ) : null}
                    <Button
                      variant="quiet"
                      title="Use as a creative brief in Generate"
                      onClick={() => onUseAsBrief(row)}
                    >
                      <AGENT_ICON className="h-3 w-3" />
                    </Button>
                    {own ? (
                      <Button
                        icon={<FolderPlus />} aria-label="Add to the brand library"
                        variant="quiet"
                        disabled={promotingId === row.id}
                        title="Add to the brand library"
                        onClick={() => void promote(row)}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {images.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="quiet"
            disabled={images.isFetchingNextPage}
            title={`${total - rows.length} more research images`}
            onClick={() => void images.fetchNextPage()}
          >
            {images.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
    </SectionCard>
  );
}

/**
 * A research picture sized by what it is (the shared `categorizeSizeTier` rules, same as the brand
 * Assets gallery): photos fill the tile and crop to it; logos, graphics and icons are never cropped
 * and never drawn larger than their own pixels. Without stored dimensions the picture is measured on
 * load; until then it is contained, so nothing is ever cropped or stretched while it waits.
 */
function ResearchTileImage({ row }: { row: ResearchImageRow }) {
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  const width = row.width ?? measured?.width ?? null;
  const height = row.height ?? measured?.height ?? null;
  const tier =
    width && height
      ? categorizeSizeTier({ url: row.url, width, height, alt: row.alt, kind: "image" })
      : null;
  const mediaRef = row.fileId
    ? fileIdToMediaRef(row.fileId)
    : urlToMediaRef(row.thumbnailUrl || row.url);
  const onLoad = (event: { currentTarget: EventTarget }) => {
    const img = event.currentTarget as HTMLImageElement;
    if (!row.width && img.naturalWidth > 0) {
      setMeasured({ width: img.naturalWidth, height: img.naturalHeight });
    }
  };
  if (tier === "photo") {
    return (
      <InlineMediaRef
        ref={mediaRef}
        size="fill"
        fit="cover"
        as="img"
        rounded="none"
        alt={row.alt ?? ""}
        className="h-full w-full"
        onLoad={onLoad}
      />
    );
  }
  // Logos, graphics and icons: natural size at most, fully visible on a neutral backdrop.
  return (
    <div className="flex h-full w-full items-center justify-center bg-card p-2">
      <div
        className="max-h-full max-w-full"
        style={{
          width: width ?? "100%",
          height: width && height ? undefined : "100%",
          aspectRatio: width && height ? `${width} / ${height}` : undefined,
        }}
      >
        <InlineMediaRef
          ref={mediaRef}
          size="fill"
          fit="contain"
          as="img"
          rounded="none"
          alt={row.alt ?? ""}
          className="h-full w-full"
          onLoad={onLoad}
        />
      </div>
    </div>
  );
}
