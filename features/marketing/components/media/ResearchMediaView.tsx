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
 * links each image to this brand and to the category (research_media →
 * category, role brand_image). All edges live in platform.associations.
 */

import { useMemo, useState } from "react";
import { ExternalLink, FolderPlus, Search, X } from "lucide-react";
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
  useCreateBrandAsset,
  useResearchImageOrganization,
  useResearchImagePages,
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
import type { ResearchBrandScope, ResearchImageRow } from "@/features/marketing/data/media-library";
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
  const [topicFilter, setTopicFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState<"all" | "own" | "external">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>(brandId);
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_ALL);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const brands = useBrandOptions(organizationId);
  // The Brand filter runs in the query (every image, not just the loaded page); None waits for the brand list.
  const brandScope: ResearchBrandScope | null =
    brandFilter === BRAND_ALL
      ? { kind: "all" }
      : brandFilter === BRAND_NONE
        ? brands.data
          ? { kind: "none", brandIds: brands.data.map((b) => b.id) }
          : null
        : { kind: "brand", brandId: brandFilter };
  const images = useResearchImagePages(organizationId, brandScope);
  const categories = useCategories({
    dimension: CATEGORY_DIMENSIONS.brandImage,
  });
  const tagImages = useTagResearchImages();
  const untagImages = useUntagResearchImages();
  const unlinkImages = useUnlinkResearchImagesFromBrand();

  const siteHosts = useMemo(
    () =>
      siteRootUrls
        .map(hostnameOf)
        .filter((host): host is string => Boolean(host)),
    [siteRootUrls],
  );
  const rows = useMemo(
    () => images.data?.pages.flatMap((page) => page.rows) ?? [],
    [images.data],
  );
  const total = images.data?.pages[0]?.total ?? rows.length;
  const imageIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const topicIds = useMemo(
    () => [
      ...new Set(
        rows.flatMap((row) => (row.topicId ? [row.topicId] : [])),
      ),
    ],
    [rows],
  );
  const organization = useResearchImageOrganization(
    organizationId,
    imageIds,
    topicIds,
  );
  const links = organization.data;

  const categoryName = useMemo(() => {
    const byId = new Map<string, string>();
    for (const category of categories.categories) {
      byId.set(category.id, category.name);
    }
    return byId;
  }, [categories.categories]);


  const categoriesOf = (row: ResearchImageRow): string[] =>
    links?.imageCategories[row.id] ?? [];

  const topics = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of rows) {
      if (row.topicId) byId.set(row.topicId, row.topicName ?? "Untitled topic");
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const isOwn = useMemo(() => {
    return (row: ResearchImageRow) => {
      if (siteHosts.length === 0) return false;
      const sourceHost = (row.sourceHostname ?? "").replace(/^www\./, "");
      const imageHost = hostnameOf(row.url);
      return siteHosts.some(
        (host) => host === sourceHost || host === imageHost,
      );
    };
  }, [siteHosts]);

  const filtered = useMemo(() => {
    let items = rows;
    if (categoryFilter === CATEGORY_NONE) {
      items = items.filter((row) => categoriesOf(row).length === 0);
    } else if (categoryFilter !== CATEGORY_ALL) {
      items = items.filter((row) => categoriesOf(row).includes(categoryFilter));
    }
    if (topicFilter !== "all") {
      items = items.filter((row) => row.topicId === topicFilter);
    }
    if (originFilter !== "all") {
      items = items.filter((row) =>
        originFilter === "own" ? isOwn(row) : !isOwn(row),
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (row) =>
          row.url.toLowerCase().includes(q) ||
          (row.alt ?? "").toLowerCase().includes(q) ||
          (row.caption ?? "").toLowerCase().includes(q) ||
          (row.sourceHostname ?? "").toLowerCase().includes(q),
      );
    }
    return items;
  }, [
    rows,
    topicFilter,
    originFilter,
    search,
    isOwn,
    brandFilter,
    categoryFilter,
    links,
  ]);

  // Selection only ever holds visible images: when the filtered list changes,
  // drop ids that left it (adjust-state-during-render, no effect).
  const [seenFiltered, setSeenFiltered] = useState(filtered);
  if (seenFiltered !== filtered) {
    setSeenFiltered(filtered);
    const visible = new Set(filtered.map((row) => row.id));
    if ([...selected].some((id) => !visible.has(id))) {
      setSelected(new Set([...selected].filter((id) => visible.has(id))));
    }
  }

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
      filtered
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
        brandId,
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

  const selectedLinkedToBrand = filtered.some(
    (row) =>
      selected.has(row.id) &&
      (links?.imageBrands[row.id] ?? []).includes(brandId),
  );
  const unlinkFromBrand = async () => {
    if (selectedIds.length === 0) return;
    try {
      await unlinkImages.mutateAsync({
        imageIds: selectedIds,
        brandId,
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

  if (images.isLoading || brandScope === null) {
    return <LoadingSurface label="Loading research images…" />;
  }
  if (images.isError) {
    return (
      <QueryError error={images.error} onRetry={() => void images.refetch()} />
    );
  }

  // Only an organization with no research at all gets the bare card; a brand with nothing linked keeps its filters.
  if (rows.length === 0 && brandFilter === BRAND_ALL && !images.isPending) {
    return (
      <SectionCard title="Research images">
        <div className="p-3">
          <MediaEmptyState
            title="No research images for this organization yet"
            detail="Run a research topic: every image its sources carry lands here."
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
        <span className="type-meta tabular-nums text-muted-foreground">
          {filtered.length}/{rows.length}
          {total > rows.length ? ` of ${total}` : ""}
        </span>
      }
    >
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-48">
          <ProInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search alt, caption, host"
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
            ...topics.map(([id, name]) => ({ value: id, label: name })),
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
            placeholder="Tag with category"
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
                title="Remove from the selected images"
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
            title={`Take the selected images out of ${brandName}`}
            onClick={() => void unlinkFromBrand()}
          >
            Unlink brand
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

      {filtered.length === 0 ? (
        brandFilter !== BRAND_ALL && brandFilter !== BRAND_NONE && rows.length === 0 ? (
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((row) => {
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
                  {/* Owned uploads resolve from their file_id (the reader
                      re-mints); third-party assets render their external
                      URL. */}
                  <InlineMediaRef
                    ref={
                      row.fileId
                        ? fileIdToMediaRef(row.fileId)
                        : urlToMediaRef(row.thumbnailUrl || row.url)
                    }
                    size="fill"
                    fit="cover"
                    as="img"
                    rounded="none"
                    alt={row.alt ?? ""}
                    className="h-full w-full"
                  />
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
