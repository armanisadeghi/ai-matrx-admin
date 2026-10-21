"use client";

import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AtSign,
  Check,
  ChevronRight,
  ExternalLink,
  FileQuestion,
  Globe2,
  Image as ImageIcon,
  Link2,
  ListChecks,
  MapPinned,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
  type MatrxTableIconAction,
} from "@ai-matrx/design-system/data-table";
import type {
  MatrxDataTableMobileCardControls,
  MatrxDataTableQueryState,
} from "@ai-matrx/design-system/data-table/types";
import { Checkbox, Peek, PeekHoverCard, Skeleton, type PeekRecord } from "@ai-matrx/design-system";
import { Button, Input, Select } from "@ai-matrx/design-system/controls";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { InfoHint } from "@/components/official/InfoHint";
import { toast } from "@/lib/toast";
import { confirm as confirmDialog } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { jsonExportItem, rowsToCsv } from "@/components/agent-copy/export";
import {
  groomerPresetVariants,
  type AgentCopyGroomerConfig,
  type AgentCopyGroomerSection,
} from "@/components/agent-copy/groomer-types";
import {
  Facebook,
  Instagram,
  Linkedin,
  Pinterest,
  Tiktok,
  Twitter,
  Youtube,
} from "@/components/icons/brand-icons";
import { webCopy } from "@/features/marketing/lib/copy-payloads";
import { contactFactValue } from "@/features/marketing/lib/ContactFactValue";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { bulkCountLabel, type EntityBulkAction } from "@/lib/entity-list/selection";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createMarketingDiscoveryScope } from "@/features/surfaces/manifests/marketing-discovery.manifest";
import {
  useBulkConfirmDiscoveredItems,
  useBulkDeleteDiscoveredItems,
  useBulkDismissDiscoveredItems,
  useBulkUndismissDiscoveredItems,
  useBrand,
  useBrandAssets,
  useBrandProperties,
  useBrandSites,
  useBusinessFacts,
  useConfirmDiscoveredAsset,
  useConfirmDiscoveredFact,
  useConfirmDiscoveredProperty,
  useDeleteDiscoveredItem,
  useDiscoveredCategoryCount,
  useDiscoveredItems,
  useDismissDiscoveredItem,
  usePendingDiscoveredCount,
  useUndismissDiscoveredItem,
} from "@/features/marketing/data/hooks";
import {
  LoadingSurface,
  QueryError,
} from "@/features/marketing/components/shared/MarketingUi";
import {
  isPropertyKind,
  isJsonRecord,
  parseBrandProfile,
  type DiscoveredItem,
  type DiscoveredItemStatus,
  type PropertyKind,
} from "@/features/marketing/types";
// The classification vocabulary is canonical and shared — the manifest's
// write-target prose, the write handler's validation, and these Selects all
// read the same lists. Never re-type a kind literal here.
import {
  defaultKind,
  kindWaitsOnRules,
  isKindInPool,
  isMediaCategory,
  isSocialCategory,
  kindEnumText,
  kindOptionsFor,
  kindPoolOf,
  LABEL_REQUIRED_KIND,
} from "@/features/marketing/discovery-classification";
import { extractErrorMessage } from "@/utils/errors";
import { describeDiscoveredSocialProfile } from "@/features/marketing/lib/discovery-promotion";
import { buildBrandContextXml } from "@/features/marketing/lib/surface-context";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { loadFactRules } from "@/features/marketing/smart-add/factRules";
import { NoWebsiteState } from "@/features/marketing/components/shared/NoWebsiteState";

const STATUS_TABS: Array<{ value: DiscoveredItemStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "dismissed", label: "Dismissed" },
];

function isStatus(value: string): value is DiscoveredItemStatus {
  return STATUS_TABS.some((tab) => tab.value === value);
}

/** Discovered products and services: reviewed on the Offerings screen, never in this table. */
const OFFERING_CATEGORY = "offering";
const EXCLUDED_CATEGORIES = [OFFERING_CATEGORY] as const;

const PAGE_SIZE_OPTIONS = [50, 100, 250];
const DEFAULT_PAGE_SIZE = 100;

const CATEGORY_LABEL: Record<string, string> = {
  media: "Media & imagery",
  identity: "Identity",
  social: "Social profiles",
  fact: "Business facts",
  link: "Notable links",
  other: "Other",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? CATEGORY_LABEL.other;
}

const SOCIAL_ICONS: Partial<Record<PropertyKind, LucideIcon>> = {
  instagram: Instagram,
  facebook: Facebook,
  x: Twitter,
  tiktok: Tiktok,
  youtube: Youtube,
  linkedin: Linkedin,
  pinterest: Pinterest,
  google_business_profile: MapPinned,
  other: Globe2,
};

function itemDisplayValue(item: DiscoveredItem): string {
  if (item.url) return item.url;
  if (isJsonRecord(item.value)) {
    const text = item.value.text ?? item.value.value;
    if (typeof text === "string" && text.trim()) return text;
    return JSON.stringify(item.value);
  }
  return String(item.value ?? "");
}

/** The first context line the finder left (where it was found), named by its key. */
function itemContext(item: DiscoveredItem): { key: string; text: string } | null {
  if (!isJsonRecord(item.context)) return null;
  for (const key of ["found_in", "alt", "surrounding_text", "schema_path"]) {
    const value = item.context[key];
    if (typeof value === "string" && value.trim())
      return { key: key.replace(/_/g, " "), text: value.trim() };
  }
  return null;
}

function itemContextSnippet(item: DiscoveredItem): string | null {
  const context = itemContext(item);
  if (!context) return null;
  const clipped =
    context.text.length > 140 ? `${context.text.slice(0, 139)}…` : context.text;
  return `${context.key}: ${clipped}`;
}

/**
 * The context keys a person reads (where it was found, the words around it). Run ids, step names,
 * decisions and evidence keys are pipeline plumbing and stay in Copy, never in the peek.
 */
const PEEK_CONTEXT_KEYS: ReadonlyArray<[string, string]> = [
  ["found_on", "Found on"],
  ["found_in", "Found in"],
  ["surrounding_text", "Surrounding text"],
  ["anchor_text", "Link text"],
  ["alt", "Image text"],
  ["title", "Title"],
  ["search", "Search"],
  ["answer", "Answer"],
  ["schema_path", "Schema path"],
];

/** The readable context strings the finder left, for the peek. */
function itemContextLines(item: DiscoveredItem): Array<{ key: string; text: string }> {
  if (!isJsonRecord(item.context)) return [];
  const lines: Array<{ key: string; text: string }> = [];
  for (const [key, label] of PEEK_CONTEXT_KEYS) {
    const value = item.context[key];
    if (typeof value === "string" && value.trim()) lines.push({ key: label, text: value.trim() });
  }
  return lines;
}

function foundAs(item: DiscoveredItem): string {
  const social = isSocialCategory(item.category)
    ? describeDiscoveredSocialProfile(item)
    : null;
  if (social) return social.providerLabel;
  return item.guessed_kind
    ? humanizeIdentifier(item.guessed_kind) || item.guessed_kind
    : "";
}

function previewUrlOf(item: DiscoveredItem): string | null {
  return isMediaCategory(item.category) &&
    item.url &&
    /\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(item.url)
    ? item.url
    : null;
}

function percentOf(confidence: number | null | undefined): string {
  return typeof confidence === "number" ? `${Math.round(confidence * 100)}%` : "";
}

function confidenceTone(
  confidence: number | null | undefined,
): "success" | "warning" | "danger" | undefined {
  if (typeof confidence !== "number") return undefined;
  return confidence >= 0.8 ? "success" : confidence >= 0.5 ? "warning" : "danger";
}

/** The fixed 24px leading glyph: a picture, the network's mark, or the category's icon. */
function ItemGlyph({ item }: { item: DiscoveredItem }) {
  // A picture that fails to load (dead link, blocked host) is an empty box: fall back to the icon.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const preview = previewUrlOf(item);
  if (preview && failedUrl !== preview) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">
        {/* Discovered candidates are external public URLs, not our media. */}
        <img
          src={preview}
          alt=""
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setFailedUrl(preview)}
        />
      </span>
    );
  }
  const social = isSocialCategory(item.category)
    ? describeDiscoveredSocialProfile(item)
    : null;
  const Icon: LucideIcon = social
    ? (SOCIAL_ICONS[social.kind] ?? AtSign)
    : isMediaCategory(item.category)
      ? ImageIcon
      : item.category === "fact"
        ? ListChecks
        : item.category === "social"
          ? AtSign
          : Link2;
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

function peekOf(item: DiscoveredItem): PeekRecord {
  const social = isSocialCategory(item.category)
    ? describeDiscoveredSocialProfile(item)
    : null;
  const display = itemDisplayValue(item);
  const preview = previewUrlOf(item);
  const context = itemContextLines(item);
  const kindLabel = foundAs(item) || categoryLabel(item.category);
  return {
    kind: "Discovery",
    id: item.id,
    title: social?.identity || display,
    subtitle: [kindLabel, percentOf(item.confidence)].filter(Boolean).join(" · "),
    ...(preview ? { media: { alt: kindLabel, src: preview } } : {}),
    body: [
      { property: "Category", value: categoryLabel(item.category) },
      ...(social ? [{ property: "Profile type", value: social.profileType }] : []),
      ...(item.url ? [{ property: "Address", value: item.url, href: item.url }] : []),
      ...(context.length
        ? [
            {
              section: "Where it was found",
              rows: context.map((line) => ({ text: line.text, detail: line.key })),
            },
          ]
        : []),
    ],
    ...(item.url ? { href: item.url } : {}),
    copyData: item,
  };
}

const EMPTY_FILTERS: MatrxDataTableQueryState["columnFilters"] = {};

export function DiscoveryInbox({ brandId }: { brandId: string }) {
  const brand = useBrand(brandId);
  // access-errors: ok — dedupe/context data for classifying items; the brand and items reads below are the gated primaries
  const brandSites = useBrandSites(brandId);
  // access-errors: ok — classification context under the gated brand + items primaries
  const properties = useBrandProperties(brandId);
  // access-errors: ok — classification context under the gated brand + items primaries
  const assets = useBrandAssets(brandId);
  // access-errors: ok — classification context under the gated brand + items primaries
  const facts = useBusinessFacts(brandId);
  const [status, setStatusState] = useState<DiscoveredItemStatus>("pending");
  // The table's query: the source owns the page; search, sort and column
  // filters run over the page the source returned.
  const [query, setQuery] = useState<MatrxDataTableQueryState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    search: "",
    anyOf: "",
    columnFilters: EMPTY_FILTERS,
    sort: null,
  });
  const [kindOverrides, setKindOverrides] = useState<Record<string, string>>({});
  // Labels live BESIDE the kinds in the parent for two reasons: the bulk
  // Confirm must be able to send the label the user typed, and the
  // `item_classifications` write target stages kind and label together
  // through these very setters — never a parallel path.
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [bulkKind, setBulkKind] = useState("");
  // access-errors: ok — tab count; absence only hides the number
  const pendingCount = usePendingDiscoveredCount(brandId);
  // access-errors: ok — the Offerings door's count; absence only hides the door
  const offeringCount = useDiscoveredCategoryCount(brandId, status, OFFERING_CATEGORY);
  // access-errors: ok — subtracts the offerings from the Pending tab's count so it matches the table
  const pendingOfferings = useDiscoveredCategoryCount(brandId, "pending", OFFERING_CATEGORY);
  const pendingInTable =
    typeof pendingCount.data === "number" && typeof pendingOfferings.data === "number"
      ? pendingCount.data - pendingOfferings.data
      : null;
  const bulkConfirm = useBulkConfirmDiscoveredItems();
  const bulkDismiss = useBulkDismissDiscoveredItems();
  const bulkUndismiss = useBulkUndismissDiscoveredItems();
  const bulkDelete = useBulkDeleteDiscoveredItems();
  const confirmAsset = useConfirmDiscoveredAsset();
  const confirmFact = useConfirmDiscoveredFact();
  const confirmProperty = useConfirmDiscoveredProperty();
  const dismissOne = useDismissDiscoveredItem();
  const undismissOne = useUndismissDiscoveredItem();
  const deleteOne = useDeleteDiscoveredItem();

  // A review action on the last page can shrink the list under the stored
  // page number — clamp at render so the query never strands the user on an
  // empty over-shot page. `knownTotal` is last-seen data, so the clamp is a
  // derived value, never an effect.
  const [knownTotal, setKnownTotal] = useState(0);
  const knownPageCount = Math.max(1, Math.ceil(knownTotal / query.pageSize));
  const currentPage = Math.min(query.page, knownPageCount);
  // Offerings are left out by the SOURCE, so the page, the count and the pager all agree.
  const items = useDiscoveredItems(
    brandId,
    status,
    currentPage,
    query.pageSize,
    EXCLUDED_CATEGORIES,
  );
  const rows = items.data?.rows ?? [];
  // The server's field → kind rules: a fact the facts agent named already has its kind (never "Other fact").
  const factRules = useQuery({
    queryKey: ["marketing", "fact-rules"],
    queryFn: loadFactRules,
    staleTime: Infinity,
  });
  const fieldKind = factRules.data?.fieldKind;
  // Until the server's rules answer, a row whose type depends on them shows a shimmer, never the
  // fallback ("Other fact") that the rules would then replace. A failed read stops waiting.
  const rulesPending = factRules.isPending;
  const total = items.data?.total ?? 0;
  if (items.data !== undefined && total !== knownTotal) setKnownTotal(total);
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));

  const setStatus = (next: DiscoveredItemStatus) => {
    setStatusState(next);
    setQuery((current) => ({ ...current, page: 1 }));
    setKnownTotal(0);
  };

  const categoryCounts = (() => {
    const counts = new Map<string, number>();
    for (const item of rows) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return [...counts.entries()];
  })();

  const effectiveKind = (item: DiscoveredItem) =>
    kindOverrides[item.id] ?? defaultKind(item, fieldKind);
  /** True while this row's type is still waiting on the server's rules (a person's own pick never waits). */
  const kindPending = (item: DiscoveredItem) =>
    kindOverrides[item.id] === undefined && kindWaitsOnRules(item, rulesPending);
  // A row filed under Other starts labeled by what the finder called it, so Confirm is never a dead button.
  const effectiveLabel = (item: DiscoveredItem) =>
    labelOverrides[item.id] ??
    (!kindPending(item) && effectiveKind(item) === LABEL_REQUIRED_KIND && item.guessed_kind
      ? humanizeIdentifier(item.guessed_kind)
      : "");
  const needsLabel = (item: DiscoveredItem) =>
    !kindPending(item) && effectiveKind(item) === LABEL_REQUIRED_KIND && !effectiveLabel(item).trim();

  const withBusy = async (itemId: string, work: () => Promise<void>) => {
    setBusyIds((current) => new Set(current).add(itemId));
    try {
      await work();
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  };

  // ---- per-row verbs -------------------------------------------------------

  const confirmRow = (item: DiscoveredItem) =>
    withBusy(item.id, async () => {
      const kind = effectiveKind(item);
      const trimmedLabel = effectiveLabel(item).trim();
      if (kind === LABEL_REQUIRED_KIND && !trimmedLabel) {
        toast.error("Add a custom label for an Other item.");
        return;
      }
      try {
        if (isMediaCategory(item.category)) {
          await confirmAsset.mutateAsync({ item, assetKind: kind, title: trimmedLabel || null });
        } else if (isSocialCategory(item.category)) {
          if (!isPropertyKind(kind)) throw new Error("Select a valid property type.");
          await confirmProperty.mutateAsync({
            item,
            propertyKind: kind,
            displayName: trimmedLabel || null,
          });
        } else {
          await confirmFact.mutateAsync({ item, factKind: kind, label: trimmedLabel || null });
        }
        toast.success("Confirmed");
      } catch (error) {
        toast.error("Could not confirm item", { description: extractErrorMessage(error) });
      }
    });

  const dismissRow = (item: DiscoveredItem) =>
    withBusy(item.id, async () => {
      try {
        await dismissOne.mutateAsync(item.id);
      } catch (error) {
        toast.error("Could not dismiss item", { description: extractErrorMessage(error) });
      }
    });

  const restoreRow = (item: DiscoveredItem) =>
    withBusy(item.id, async () => {
      try {
        await undismissOne.mutateAsync(item.id);
        toast.success("Returned to pending");
      } catch (error) {
        toast.error("Could not restore item", { description: extractErrorMessage(error) });
      }
    });

  const deleteRow = async (item: DiscoveredItem) => {
    const yes = await confirmDialog({
      title: "Delete this discovery?",
      description:
        "The candidate moves to trash. If the crawler finds the same value again it will not reappear.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!yes) return;
    await withBusy(item.id, async () => {
      try {
        await deleteOne.mutateAsync(item.id);
        toast.success("Discovery deleted");
      } catch (error) {
        toast.error("Could not delete item", { description: extractErrorMessage(error) });
      }
    });
  };

  // ---- bulk verbs (the table's own bar) -----------------------------------

  const bulkActions: EntityBulkAction<DiscoveredItem>[] =
    status === "pending"
      ? [
          {
            id: "confirm",
            label: "Confirm",
            icon: Check,
            disabledReason: (_count, selection) =>
              selection.rows.some(kindPending)
                ? "Working out the types"
                : selection.rows.every(needsLabel)
                  ? "Add a label to each Other item first"
                  : null,
            run: async (selection) => {
              // An "Other" row is confirmable in bulk exactly when it carries a
              // label — the same rule the per-row Confirm enforces.
              const ready = selection.rows.filter((item) => !needsLabel(item));
              const skipped = selection.rows.length - ready.length;
              const result = await bulkConfirm.mutateAsync(
                ready.map((item) => ({
                  item,
                  kind: effectiveKind(item),
                  label: effectiveLabel(item).trim() || null,
                })),
              );
              if (result.failed.length > 0) {
                toast.error(`Confirmed ${result.confirmed}, ${result.failed.length} failed`, {
                  description: result.failed
                    .slice(0, 3)
                    .map((f) => `${itemDisplayValue(f.item)}: ${f.message}`)
                    .join(" · "),
                });
              }
              if (skipped > 0) {
                toast.info(
                  `${skipped} item${skipped === 1 ? "" : "s"} typed Other skipped — Other needs a per-item label.`,
                );
              }
              return { message: `Confirmed ${bulkCountLabel(result.confirmed, "item")}` };
            },
          },
          {
            id: "dismiss",
            label: "Dismiss",
            icon: X,
            variant: "outline",
            run: async (selection) => {
              const changed = await bulkDismiss.mutateAsync(selection.ids);
              return {
                message: `Dismissed ${bulkCountLabel(changed, "item")}`,
                undo: async () => {
                  await bulkUndismiss.mutateAsync(selection.ids);
                },
              };
            },
          },
          {
            id: "delete",
            label: "Delete",
            icon: Trash2,
            variant: "destructive",
            confirm: (selection) => ({
              title: `Delete ${bulkCountLabel(selection.count, "discovery")}?`,
              description:
                "The candidates move to trash. If the crawler finds the same values again they will not reappear.",
              confirmLabel: "Delete",
              variant: "destructive",
            }),
            run: async (selection) => {
              const changed = await bulkDelete.mutateAsync(selection.ids);
              return { message: `Deleted ${bulkCountLabel(changed, "discovery")}` };
            },
          },
        ]
      : status === "dismissed"
        ? [
            {
              id: "restore",
              label: "Restore",
              icon: Undo2,
              variant: "outline",
              run: async (selection) => {
                const changed = await bulkUndismiss.mutateAsync(selection.ids);
                return { message: `Returned ${bulkCountLabel(changed, "item")} to pending` };
              },
            },
            {
              id: "delete",
              label: "Delete",
              icon: Trash2,
              variant: "destructive",
              confirm: (selection) => ({
                title: `Delete ${bulkCountLabel(selection.count, "discovery")}?`,
                description:
                  "The candidates move to trash. If the crawler finds the same values again they will not reappear.",
                confirmLabel: "Delete",
                variant: "destructive",
              }),
              run: async (selection) => {
                const changed = await bulkDelete.mutateAsync(selection.ids);
                return { message: `Deleted ${bulkCountLabel(changed, "discovery")}` };
              },
            },
          ]
        : // Confirmed rows are the promotion audit trail: nothing acts on them in bulk.
          [];

  const bulk = useTableBulkSelection<DiscoveredItem>({
    noun: "item",
    rows,
    getRowId: (item) => item.id,
    getRowName: itemDisplayValue,
    actions: bulkActions,
    standardBulkActions: false,
    onRefresh: () => void items.refetch(),
  });

  // Bulk "Set type": one pool only — each category promotes into a different table.
  const selectedRows = rows.filter((item) => bulk.selectedIds.includes(item.id));
  const selectedPools = new Set(selectedRows.map((item) => kindPoolOf(item.category)));
  const bulkTypePool = selectedPools.size === 1 ? [...selectedPools][0] : null;
  const assignBulkKind = (kind: string) => {
    setBulkKind("");
    if (!kind) return;
    setKindOverrides((current) => {
      const draft = { ...current };
      for (const item of selectedRows) draft[item.id] = kind;
      return draft;
    });
  };
  const selection = bulk.selection
    ? {
        ...bulk.selection,
        actions: (
          selected: DiscoveredItem[],
          ids: string[],
          scope: Parameters<NonNullable<NonNullable<typeof bulk.selection>["actions"]>>[2],
        ) => (
          <>
            {status === "pending" ? (
              <Select<string>
                aria-label="Set type for selected"
                value={bulkKind}
                disabled={!bulkTypePool}
                onValueChange={assignBulkKind}
                options={[
                  { value: "", label: bulkTypePool ? "Set type" : "Mixed categories" },
                  ...(bulkTypePool ? kindOptionsFor(bulkTypePool) : []),
                ]}
              />
            ) : null}
            {bulk.selection?.actions?.(selected, ids, scope)}
          </>
        ),
      }
    : undefined;

  if (brand.isLoading || (items.isLoading && !items.data)) {
    return <LoadingSurface label="Loading discoveries…" />;
  }
  if (brand.isError || !brand.data) {
    return <QueryError error={brand.error} onRetry={() => void brand.refetch()} />;
  }

  const currentBrand = brand.data;
  const brandContext = buildBrandContextXml({
    brand: currentBrand,
    sites: brandSites.data ?? [],
    properties: properties.data ?? [],
    assets: assets.data ?? [],
    facts: facts.data ?? [],
  });
  const inboxCopy = webCopy({
    kind: "web-discovery-inbox",
    label: `Discovery inbox (${status})`,
    description:
      "Machine-discovered brand candidates awaiting human review; confirming promotes an item to confirmed brand assets/facts/properties.",
    surface: `Discovery inbox — ${currentBrand.name} (${status})`,
    data: rows,
    lines: [
      ["Brand", currentBrand.name],
      ["Status filter", status],
      ["Total items", total],
      ["Loaded on this page", rows.length],
      ["Page", `${currentPage} of ${pageCount}`],
      ...categoryCounts.map(([category, count]): [string, string] => [
        categoryLabel(category),
        `${count} item${count === 1 ? "" : "s"}`,
      ]),
    ],
    attributes: { brand_id: brandId, status, count: rows.length, total, page: currentPage },
  });

  const pageLocation = `AI Matrx — Marketing — Discovery inbox — ${currentBrand.name}`;
  const groomerSections = (): AgentCopyGroomerSection[] => [
    {
      id: "pending_count",
      title: "Pending count",
      description: "The brand-wide pending discovery count (all sites).",
      build: () => ({ pending_count: pendingCount.data ?? null }),
    },
    {
      id: "items",
      title: `Discovered items (${status})`,
      description: `${rows.length} of ${total} items loaded for the "${status}" tab (page ${currentPage} of ${pageCount}).`,
      cuttable: true,
      levelLabels: {
        full: `All ${rows.length} loaded (raw)`,
        compact: "Top 25",
        brief: "Counts by category",
      },
      build: (level) =>
        level === "full"
          ? rows
          : level === "compact"
            ? rows.slice(0, 25)
            : categoryCounts.map(([category, count]) => ({ category, count })),
    },
  ];
  const groomerConfig = (): AgentCopyGroomerConfig => ({
    label: `Discovery inbox — ${currentBrand.name}`,
    kind: "marketing-discovery-page",
    location: pageLocation,
    description: `Machine-discovered candidates for ${currentBrand.name} (${status} tab).`,
    attributes: { brand_id: brandId, status },
    summary: inboxCopy.human(),
    sections: groomerSections(),
  });

  // Agent write handlers for the manifest's declared writeTargets. Fresh
  // closures per call (the getWriteHandlers contract), so `rows` and `status`
  // read below are always live, never a stale snapshot.
  const getSurfaceWriteHandlers = () => ({
    item_classifications: (value: unknown) => {
      // The Confirmed/Dismissed tabs render no type or label control at all —
      // staging into them would put a value somewhere the user cannot see or
      // correct. Refuse loudly instead.
      if (status !== "pending")
        throw new Error(
          `item_classifications applies only to the Pending tab, but the "${status}" tab is active and its rows render no classification controls. Nothing was staged.`,
        );
      if (!Array.isArray(value) || value.length === 0)
        throw new Error(
          "item_classifications expects a NON-EMPTY array of objects: [{ item_id, kind, label? }].",
        );

      const byId = new Map(rows.map((item) => [item.id, item]));
      const loadedIdsHint =
        rows.length === 0
          ? "no rows are loaded right now"
          : `loaded ids are: ${rows
              .slice(0, 10)
              .map((row) => row.id)
              .join(", ")}${rows.length > 10 ? ` (+${rows.length - 10} more)` : ""}`;

      // Validate EVERY entry BEFORE any state moves, so a rejected entry can
      // never leave a half-applied triage staged on the page.
      const resolved: Array<{ id: string; kind: string; label: string }> = [];
      const seen = new Set<string>();
      value.forEach((entry, index) => {
        const at = `item_classifications[${index}]`;
        if (typeof entry !== "object" || entry === null || Array.isArray(entry))
          throw new Error(`${at} expects an object: { item_id, kind, label? }.`);
        const patch = entry as Record<string, unknown>;
        const accepted = ["item_id", "kind", "label"];
        const unsupported = Object.keys(patch).filter((key) => !accepted.includes(key));
        if (unsupported.length > 0)
          throw new Error(
            `${at} got unsupported key(s): ${unsupported.join(", ")}. Accepted keys: ${accepted.join(" | ")}.`,
          );

        const rawId = patch.item_id;
        if (typeof rawId !== "string" || !rawId.trim())
          throw new Error(`${at}.item_id expects a non-empty string.`);
        const itemId = rawId.trim();
        const item = byId.get(itemId);
        if (!item)
          throw new Error(
            `${at}.item_id "${itemId}" is not a discovered item loaded on this page — ${loadedIdsHint}. Read ids from discovered_items; you may only classify rows the user can see.`,
          );
        if (seen.has(itemId))
          throw new Error(
            `${at}.item_id "${itemId}" appears more than once — send exactly one classification per item.`,
          );
        seen.add(itemId);

        // The allowed vocabulary is chosen by the ITEM's category, never by
        // the caller: each category promotes into a different table.
        const pool = kindPoolOf(item.category);
        const rawKind = patch.kind;
        if (!isKindInPool(pool, rawKind))
          throw new Error(
            `${at}.kind ${JSON.stringify(rawKind)} is not valid for item "${itemId}" (category "${item.category}"). Expected one of: ${kindEnumText(pool)}.`,
          );

        let label = "";
        if (patch.label !== undefined && patch.label !== null) {
          if (typeof patch.label !== "string")
            throw new Error(`${at}.label expects a string when present.`);
          label = patch.label.trim();
        }
        if (rawKind === LABEL_REQUIRED_KIND && !label)
          throw new Error(
            `${at}.label is required and must be non-empty when kind is "${LABEL_REQUIRED_KIND}" — the user cannot confirm an "${LABEL_REQUIRED_KIND}" item without a label, so staging one would be a dead end.`,
          );

        resolved.push({ id: itemId, kind: rawKind, label });
      });

      // Everything validated — stage through the SAME setters the reviewer's
      // own dropdown and label input drive. Merge by item id: rows the caller
      // did not name keep whatever is staged for them.
      setKindOverrides((current) => {
        const draft = { ...current };
        for (const row of resolved) draft[row.id] = row.kind;
        return draft;
      });
      setLabelOverrides((current) => {
        const draft = { ...current };
        for (const row of resolved) draft[row.id] = row.label;
        return draft;
      });
    },
  });

  // ---- columns ---------------------------------------------------------------

  const columns: MatrxColumnDef<DiscoveredItem>[] = [
    {
      id: "category",
      accessorFn: (item) => categoryLabel(item.category),
      header: "Category",
      label: "Category",
      width: 150,
      filter: "select",
    },
    {
      id: "found",
      accessorFn: foundAs,
      header: "Found as",
      label: "Found as",
      width: 170,
      filter: "select",
      // A phone leads with the value; "found as" is the peek's subtitle there.
      mobileHidden: true,
      cell: (item) => <span className="type-label">{foundAs(item)}</span>,
    },
    {
      id: "value",
      accessorFn: (item) => {
        const social = isSocialCategory(item.category)
          ? describeDiscoveredSocialProfile(item)
          : null;
        return social?.identity || itemDisplayValue(item);
      },
      header: "Value",
      label: "Value",
      width: 380,
      filter: "text",
      cell: (item) => {
        const social = isSocialCategory(item.category)
          ? describeDiscoveredSocialProfile(item)
          : null;
        const text = social?.identity || itemDisplayValue(item);
        // A way to reach someone (email, phone, address, site, profile) is THE contact value; the
        // finding's own peek moves to its glyph.
        const contact = social
          ? item.url
            ? contactFactValue({ kind: "social_profile", value: item.url, platform: social.kind })
            : null
          : contactFactValue({
              // The row's type as the Type column shows it (a person's pick, else the rules'), so a
              // "Street Address" filed as Address draws as an address.
              kind: kindPoolOf(item.category) === "fact" && !kindPending(item) ? effectiveKind(item) : item.guessed_kind,
              value: itemDisplayValue(item),
            });
        if (contact) {
          return (
            <span className="flex min-w-0 items-center gap-2" data-discovery-item={item.id}>
              <PeekHoverCard trigger={<span className="inline-flex shrink-0"><ItemGlyph item={item} /></span>}>
                <Peek record={peekOf(item)} />
              </PeekHoverCard>
              {contact}
            </span>
          );
        }
        return (
          <span className="flex min-w-0 items-center gap-2">
            <ItemGlyph item={item} />
            <PeekHoverCard
              trigger={
                <span className="block min-w-0 truncate" data-discovery-item={item.id}>
                  {text}
                </span>
              }
            >
              <Peek record={peekOf(item)} />
            </PeekHoverCard>
          </span>
        );
      },
    },
    {
      id: "confidence",
      accessorFn: (item) => item.confidence ?? null,
      header: "Confidence",
      label: "Confidence",
      helpText: "How sure the finder is",
      width: 110,
      align: "right",
      filter: "number",
      tone: (item) => confidenceTone(item.confidence),
      cell: (item) => (
        <span className="tabular-nums font-medium">{percentOf(item.confidence)}</span>
      ),
    },
    {
      id: "context",
      accessorFn: (item) => itemContextSnippet(item) ?? "",
      header: "Where found",
      label: "Where found",
      width: 240,
      filter: "text",
      hidden: true,
    },
    ...(status === "pending"
      ? ([
          {
            id: "type",
            accessorFn: (item) => {
              if (kindPending(item)) return "";
              const kind = effectiveKind(item);
              return (
                kindOptionsFor(kindPoolOf(item.category)).find((o) => o.value === kind)
                  ?.label ?? kind
              );
            },
            header: "Type",
            label: "Type",
            width: 190,
            filter: "select",
            cell: (item) =>
              kindPending(item) ? (
                <Skeleton
                  aria-label="Loading type"
                  data-discovery-type-loading=""
                  className="h-5 w-28 rounded"
                />
              ) : (
              <Select<string>
                aria-label="Type"
                variant="inline"
                value={effectiveKind(item)}
                options={kindOptionsFor(kindPoolOf(item.category))}
                onValueChange={(kind) =>
                  setKindOverrides((current) => ({ ...current, [item.id]: kind }))
                }
              />
              ),
          },
          {
            id: "label",
            accessorFn: (item) => effectiveLabel(item),
            header: "Label",
            label: "Label",
            width: 200,
            filter: "text",
            cell: (item) => (
              <Input
                value={effectiveLabel(item)}
                onChange={(event) =>
                  setLabelOverrides((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                className="w-full"
                placeholder={
                  effectiveKind(item) === LABEL_REQUIRED_KIND
                    ? "Required for Other"
                    : "Optional"
                }
                aria-label={
                  isMediaCategory(item.category)
                    ? "Asset label"
                    : isSocialCategory(item.category)
                      ? "Property label"
                      : "Fact label"
                }
              />
            ),
          },
        ] satisfies MatrxColumnDef<DiscoveredItem>[])
      : []),
  ];

  // Four fixed slots on every row of every tab; a verb that does not apply is
  // disabled in its slot with the reason, never absent.
  const rowActions = (item: DiscoveredItem): MatrxTableIconAction[] => {
    const busy = busyIds.has(item.id);
    const pending = item.status === "pending";
    const dismissed = item.status === "dismissed";
    const confirmReason = !pending
      ? item.status === "confirmed"
        ? "Already confirmed"
        : "Restore it to pending first"
      : kindPending(item)
        ? "Working out the type"
        : needsLabel(item)
          ? "Add a label for an Other item"
          : null;
    return [
      {
        id: "confirm",
        icon: Check,
        label: confirmReason ?? "Confirm",
        tone: "primary",
        disabled: busy || confirmReason !== null,
        loading: busy && pending,
        onClick: () => void confirmRow(item),
      },
      dismissed
        ? {
            id: "restore",
            icon: Undo2,
            label: "Restore to pending",
            disabled: busy,
            onClick: () => void restoreRow(item),
          }
        : {
            id: "dismiss",
            icon: X,
            label: pending ? "Dismiss" : "Confirmed items stay",
            disabled: busy || !pending,
            onClick: () => void dismissRow(item),
          },
      {
        id: "delete",
        icon: Trash2,
        label:
          item.status === "confirmed"
            ? "Confirmed items are the brand's record"
            : "Delete discovery",
        tone: "destructive",
        disabled: busy || item.status === "confirmed",
        onClick: () => void deleteRow(item),
      },
      {
        id: "open",
        icon: ExternalLink,
        label: item.url ? "Open in new tab" : "No link to open",
        disabled: !item.url,
        onClick: () => {
          if (item.url) openOutbound(item.url, "_blank");
        },
      },
    ];
  };

  // A phone gets one card per item: the value, the type picker, the label and every verb stacked, so
  // nothing needs a sideways scroll. The cells are the table's own (same Select, same Input).
  const renderInboxCard = (item: DiscoveredItem, controls: MatrxDataTableMobileCardControls) => {
    const meta = [foundAs(item) || categoryLabel(item.category), percentOf(item.confidence)]
      .filter(Boolean)
      .join(" · ");
    return (
      <article
        className="grid gap-2 rounded-lg border border-border bg-card p-3"
        data-discovery-card={item.id}
      >
        <div className="flex items-start gap-2">
          {controls.selectable ? (
            <Checkbox
              className="mt-1 h-4 w-4 shrink-0 touch-manipulation"
              checked={controls.selected}
              aria-label="Select this item"
              onCheckedChange={(next) => controls.onSelectedChange(next === true)}
            />
          ) : null}
          <div className="grid min-w-0 flex-1 gap-0.5">
            {controls.renderCell("value")}
            <span className="type-meta truncate text-muted-foreground">{meta}</span>
          </div>
        </div>
        {status === "pending" ? (
          <div className="grid gap-2">
            {controls.renderCell("type")}
            {controls.renderCell("label")}
          </div>
        ) : null}
        <div className="flex justify-end">{controls.actions}</div>
      </article>
    );
  };

  const showNoWebsite =
    status === "pending" &&
    total === 0 &&
    brandSites.isSuccess &&
    (brandSites.data ?? []).length === 0;

  return (
    <SurfaceRuntimeProvider
      surfaceName="matrx-user/marketing-discovery"
      getWriteHandlers={getSurfaceWriteHandlers}
      getScope={() => {
        // pending_count comes from the dedicated brand-scoped count query —
        // never the loaded rows' length, which caps at the list query's
        // page size and would lie above it. pending_items stays honest only
        // when the Pending tab's data is the data actually loaded — other
        // tabs load different rows.
        const pendingLoaded = status === "pending" && items.data !== undefined;
        const loadedItems =
          items.data === undefined
            ? undefined
            : rows.slice(0, 30).map((item) => ({
                id: item.id,
                category: item.category,
                guessed_kind: item.guessed_kind,
                confidence: item.confidence,
                url: item.url,
                label: itemDisplayValue(item),
                context: itemContextSnippet(item),
                status: item.status,
              }));
        return createMarketingDiscoveryScope({
          brand_id: brandId,
          brand_name: currentBrand.name,
          brand_context: brandContext,
          brand_profile: { ...parseBrandProfile(currentBrand.profile) },
          pending_review_count: pendingCount.data,
          active_status: status,
          loaded_count: rows.length,
          category_counts: categoryCounts.map(([category, count]) => ({ category, count })),
          pending_count: pendingCount.data,
          pending_items: pendingLoaded
            ? rows.slice(0, 30).map((item) => ({
                category: item.category,
                guessed_kind: item.guessed_kind,
                confidence: item.confidence,
                url: item.url,
                label: itemDisplayValue(item),
              }))
            : undefined,
          discovered_items: loadedItems,
          // The read twin of the item_classifications write target. Only the
          // Pending tab has classification controls, so only it has staged
          // state to report — same 30-row cap as the item lists.
          staged_classifications: pendingLoaded
            ? rows.slice(0, 30).map((item) => ({
                item_id: item.id,
                kind: effectiveKind(item),
                label: effectiveLabel(item) || null,
                is_default: kindOverrides[item.id] === undefined,
              }))
            : undefined,
        });
      }}
    >
      {/* No RouteHeader — the [brandId] layout's breadcrumb trail is the
          header for the whole client tree (Arman, 2026-08-30). */}
      <main className="h-full overflow-y-auto bg-textured p-3 pt-[calc(var(--shell-header-h)+0.5rem)] sm:p-4 sm:pt-[calc(var(--shell-header-h)+0.75rem)]">
        <div className="grid w-full gap-3">
          {(offeringCount.data ?? 0) > 0 ? (
            <section
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
              data-testid="discovery-offerings-door"
            >
              <h2 className="type-label">Products &amp; services</h2>
              <span className="type-meta tabular-nums text-muted-foreground">
                {offeringCount.data}
              </span>
              <Button asChild variant="outline" className="ml-auto" iconEnd={<ChevronRight />}>
                <Link href={marketingRoutes.brandOfferings(brandId)}>Review in Offerings</Link>
              </Button>
            </section>
          ) : null}

          {showNoWebsite ? (
            <div className="flex min-h-56 items-center justify-center p-6">
              <NoWebsiteState
                brandId={brandId}
                brandName={currentBrand.name}
                needs="sweeping a homepage for logos, imagery, social profiles, and contact details"
                alternatives={[
                  { label: "Open Socials", href: marketingRoutes.brandSocials(brandId) },
                  { label: "Identity", href: marketingRoutes.brandIdentity(brandId) },
                ]}
              />
            </div>
          ) : (
            <MatrxDataTable<DiscoveredItem>
              data={rows}
              columns={columns}
              getRowId={(item) => item.id}
              tableId={`marketing.discovery-inbox.${status}`}
              read={{
                status: items.isError ? "error" : items.data ? "ready" : "loading",
                error: items.error,
                onRetry: () => void items.refetch(),
                what: "discoveries",
              }}
              isLoading={!items.data && !items.isError}
              isFetching={items.isFetching}
              query={{
                mode: "controlled",
                state: { ...query, page: currentPage },
                totalItems: total,
                onStateChange: setQuery,
                sourceProcessing: {
                  search: "local",
                  columnFilters: "local",
                  sort: "local",
                },
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              toolbar={{
                title: "Discovery inbox",
                titleCount: { value: total, label: status },
                searchPlaceholder: "Search this page",
                facets: [
                  {
                    type: "button-group",
                    id: "status",
                    value: status,
                    defaultValue: "pending",
                    options: STATUS_TABS.map((tab) => ({
                      value: tab.value,
                      label:
                        tab.value === "pending" && pendingInTable !== null
                          ? `${tab.label} ${pendingInTable}`
                          : tab.label,
                    })),
                    onChange: (value) => {
                      if (isStatus(value)) setStatus(value);
                    },
                  },
                ],
                actions: (
                  <span className="flex items-center gap-1.5">
                    <InfoHint text="What was found for this brand, waiting for a person. Confirm adds it to the brand's facts, assets or properties." />
                    {rows.length > 0 ? (
                      <CopyButtons
                        size="icon"
                        label={`Discovery inbox — ${currentBrand.name} (${status})`}
                        sourceId={`web-discovery-inbox:${brandId}:${status}`}
                        data={{
                          brand: currentBrand.name,
                          brand_id: brandId,
                          status,
                          total,
                          page: currentPage,
                          page_count: pageCount,
                          items: rows,
                        }}
                        dataType="Agent"
                        aiVariants={groomerPresetVariants(groomerConfig)}
                        groomer={groomerConfig}
                        export={{
                          items: [
                            jsonExportItem(() => rows, "JSON (loaded items, raw)"),
                            {
                              id: "csv",
                              label: "CSV (loaded items)",
                              build: () => ({
                                content: rowsToCsv(rows as unknown as Array<Record<string, unknown>>),
                                extension: "csv",
                                mime: "text/csv",
                              }),
                            },
                          ],
                        }}
                      />
                    ) : null}
                  </span>
                ),
              }}
              grouping={{
                columnId: "category",
                groupableColumnIds: ["category", "found", "type"],
                order: "value-asc",
                rowNoun: "item",
              }}
              selection={selection}
              rowActions={rowActions}
              mobileCards={(item, _index, controls) => renderInboxCard(item, controls)}
              mobileCardsBreakpoint="md"
              rowVersion={(item) => [
                kindOverrides[item.id],
                labelOverrides[item.id],
                busyIds.has(item.id),
                fieldKind,
                kindPending(item),
              ]}
              detail={{ enabled: false }}
              emptyState={{
                icon: <FileQuestion className="h-8 w-8" />,
                title: status === "pending" ? "No discoveries waiting" : `No ${status} items`,
                description:
                  status === "pending"
                    ? "Initialize the site to sweep its homepage again."
                    : "Items you review appear here.",
              }}
            />
          )}
        </div>
      </main>
    </SurfaceRuntimeProvider>
  );
}
