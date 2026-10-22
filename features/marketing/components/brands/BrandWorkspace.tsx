"use client";

import { BrandSpokespeople } from "@/features/marketing/photos/BrandSpokespeople";
import { EntityCustomFields } from "@/features/unified-data/components/EntityCustomFields";
import { BrandAssists } from "@/features/marketing/brand-assists/BrandAssists";
import { BrandResearchReadiness } from "@/features/marketing/components/brands/BrandResearchReadiness";
import { useBrandPersonas } from "@/features/marketing/data/personas";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, Tabs } from "@ai-matrx/design-system/controls";
import type { ChipTone } from "@ai-matrx/design-system/controls";
import {
  AtSign,
  Award,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock,
  Cpu,
  ExternalLink,
  FileText,
  Fingerprint,
  Globe2,
  Handshake,
  Hash,
  Images,
  Image as ImageIcon,
  Inbox,
  Layers,
  Info,
  Landmark,
  Mic,
  MessageSquareQuote,
  MapPinned,
  Package,
  ScrollText,
  Tags,
  User,
  Users,
  ListChecks,
  ListTree,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Printer,
  Quote,
  Star,
  Trash2,
  Archive,
  ArrowRightLeft,
  Type,
  SlidersHorizontal,
  ScanSearch,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "@/lib/toast";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useBrandSocialAccounts } from "@/features/marketing/social/hooks";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { webCopy } from "@/features/marketing/lib/copy-payloads";
import { businessFactValueText } from "@/features/marketing/lib/business-fact-value";
import { contactFactValue } from "@/features/marketing/lib/ContactFactValue";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { BrandAiVisibilityCard } from "@/features/marketing/seo/ai-visibility/brand/BrandAiVisibilityCard";
import { BrandTopicalMapCard } from "@/features/marketing/seo/topical-map/components/BrandTopicalMapCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { RetractionDialog } from "@/features/marketing/components/brands/RetractionDialog";
import { SmartAddBasicsGate, SmartAddSetupStatus } from "@/features/marketing/smart-add/SmartAddSetupStatus";
import { BrandEditorDialog } from "@/features/marketing/components/brands/BrandEditorDialog";
import {
  MARKETING_BRAND_SURFACE_NAME,
  MarketingBrandWriteTargets,
} from "@/features/marketing/components/brands/MarketingBrandWriteTargets";
import { BrandAssetEditorDialog } from "@/features/marketing/components/brands/BrandAssetEditorDialog";
import { BusinessFactEditorDialog } from "@/features/marketing/components/brands/BusinessFactEditorDialog";
import { PropertyEditorDialog } from "@/features/marketing/components/brands/PropertyEditorDialog";
import { SiteEditorDialog } from "@/features/marketing/components/sites/SiteEditorDialog";
import { BrandAssetGallery } from "@/features/marketing/components/brands/BrandAssetGallery";
import { isBannerUrl, orphanAvatarAssetIds, personAvatarAssetIds, pickHeroLogo } from "@/features/marketing/components/brands/logo-rank";
import {
  BRAND_HERO_FRAME,
  BrandHomeSkeleton,
  BrandOverviewAbout,
  BrandOverviewContact,
  BrandOverviewFacts,
} from "@/features/marketing/components/brands/BrandOverview";
import { BrandOverviewSites } from "@/features/marketing/components/brands/BrandOverviewSites";
import { BrandPalette } from "@/features/marketing/components/brands/BrandPalette";
import {
  BrandOverviewAccounts,
  BrandOverviewActions,
  BrandOverviewKnown,
  BrandOverviewKpis,
  BrandOverviewNext,
  BrandOverviewLook,
  BrandSearchClassBar,
} from "@/features/marketing/components/brands/BrandOverviewPanels";
import { BrandOverviewActivity } from "@/features/marketing/components/brands/BrandOverviewActivity";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createMarketingBrandScope } from "@/features/surfaces/manifests/marketing-brand.manifest";
import { buildBrandContextXml } from "@/features/marketing/lib/surface-context";
import {
  useBrand,
  useBrandAssets,
  useBrandProperties,
  useBrandPropertiesForMatching,
  useBrandSites,
  useBusinessFacts,
  useCreateSite,
  useDeleteBrandAsset,
  useDeleteBusinessFact,
  usePendingDiscoveredCount,
  marketingKeys,
} from "@/features/marketing/data/hooks";
import {
  SectionCard,
  StatusBadge,
} from "@/features/marketing/components/shared/MarketingUi";
import {
  SiteConnectionChips,
  SiteIdentityMark,
} from "@/features/marketing/components/shared/SiteConnectionChips";
import { useAccess } from "@/utils/permissions/access";
import { canEditAccess } from "@/utils/permissions/access-core";
import { BrandSocialProfilesCard } from "@/features/marketing/components/brands/BrandSocialProfilesCard";
import { BrandRelationsCard } from "@/features/marketing/components/brands/BrandRelationsCard";
import { BrandResearchCard } from "@/features/marketing/components/brands/BrandResearchCard";
import { BrandWebDecisionsSection } from "@/features/marketing/components/brands/BrandWebDecisionsSection";
import { BrandFirmographicSection, BrandPresenceSection, BrandRecognitionSection } from "./BrandTempHomes";
import { BrandBackgroundWork } from "@/features/marketing/components/brands/BrandBackgroundWork";
import { factDisplayLabel } from "@/features/marketing/lib/factLabel";
import { BrandArchiveFlow } from "@/features/marketing/components/brands/BrandArchiveFlow";
import { ChangeReviewWindow } from "@/features/trash/review/ChangeReviewWindow";
import { PersonBrandAvatar, PersonFollowerTotal } from "@/features/marketing/components/brands/PersonBrandAvatar";
import { BRAND_KIND_COPY, brandKindCopy, isPersonBrand } from "@/features/marketing/lib/brand-kind";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { normalizeWebsiteUrl } from "@/features/marketing/lib/website-url";
import { brandAssetPreviewUrl } from "@/features/marketing/lib/brand-asset-preview";
import { assetImageExpired } from "@/features/marketing/lib/asset-rehost";
import { linkLabel as linkLabelOf } from "@/features/marketing/lib/link-in-bio";
import {
  BRAND_ASSET_KIND_LABELS,
  BUSINESS_FACT_KIND_LABELS,
  isBrandAssetKind,
  isBusinessFactKind,
  isJsonRecord,
  parseBrandProfile,
} from "@/features/marketing/types";
import type {
  BrandAsset,
  BrandAssetKind,
  BrandProperty,
  BusinessFact,
  BusinessFactKind,
  MarketingSite,
} from "@/features/marketing/types";
import { extractErrorMessage } from "@/utils/errors";
import { useFocusEditTarget, useIsEditTarget } from "@/features/marketing/lib/useEditTarget";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { ShareButton } from "@/features/sharing/components/ShareButton";
import { ShareModal } from "@ai-matrx/sharing/react";
import { DiscoverBrandButton, DiscoverBrandMenuItem } from "@/features/marketing/components/brands/DiscoverBrandButton";
import { useLiveBrand } from "@/features/marketing/components/brands/useLiveBrand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@ai-matrx/design-system";
import { openOutbound } from "@ai-matrx/kit/outbound";

/** Compact icon-button used by every cockpit row's edit/delete actions. */
function RowActionButton({
  title,
  destructive,
  disabled,
  onClick,
  children,
}: {
  title: string;
  destructive?: boolean;
  /** Keeps its slot when the action does not apply, so every row's icons line up. */
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={
        disabled
          ? "inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md text-disabled-foreground"
          : destructive
            ? "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive-ink"
            : "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}

/** A stored website may lack its scheme; a bare domain in an href is a relative link. */
/** The most saturated of the brand's colors (a near-white or near-black never leads); null when there are none. */
function vividColor(values: readonly string[]): string | null {
  let best: { value: string; score: number } | null = null;
  for (const value of values) {
    const hex = value.trim().replace(/^#/, "");
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.slice(0, 6);
    if (!/^[0-9a-f]{6}$/i.test(full)) continue;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1));
    const score = sat * (1 - Math.abs(light - 0.5));
    if (!best || score > best.score) best = { value: `#${full}`, score };
  }
  return best && best.score > 0.05 ? best.value : null;
}

function externalHref(url: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

function factValueText(fact: BusinessFact): string {
  return businessFactValueText(fact.value);
}

/**
 * A brand asset's image with a designed fallback: a URL that 404s (a dead
 * favicon, a blocked hotlink) shows the asset's initial in a monogram tile,
 * never the browser's broken-image alt text.
 */
function assetPreviewUrl(asset: BrandAsset): string | null {
  return brandAssetPreviewUrl(asset);
}

/** Color assets carry their value in `data` (hex/value) or a `#hex` title. */
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

/**
 * Best previewable asset URL for the given kinds, in priority order —
 * `is_primary` wins within a kind, then `sort_order`. Lets the hero fall back
 * to the confirmed asset library when the brand row has no logo/favicon URL.
 */
function firstAssetUrl(
  assets: BrandAsset[],
  kinds: BrandAssetKind[],
): string | null {
  for (const kind of kinds) {
    const match = assets
      .filter((asset) => asset.kind === kind && assetPreviewUrl(asset))
      .sort(
        (a, b) =>
          Number(b.is_primary) - Number(a.is_primary) ||
          a.sort_order - b.sort_order,
      )[0];
    if (match) return assetPreviewUrl(match);
  }
  return null;
}

const FACT_KIND_ICONS: Record<BusinessFactKind, LucideIcon> = {
  phone: Phone,
  fax: Printer,
  email: Mail,
  address: MapPin,
  hours: Clock,
  tagline: Quote,
  legal_name: Building2,
  title: Type,
  description: FileText,
  site_name: Globe2,
  social_profile: AtSign,
  registration: BadgeCheck,
  spokesperson: Mic,
  proof: Award,
  technology: Cpu,
  industry_code: Hash,
  category: Tags,
  offering: Package,
  listing: ListChecks,
  metric: BarChart3,
  location: MapPinned,
  website: Globe2,
  statement: MessageSquareQuote,
  founded: CalendarDays,
  person: User,
  ownership: Building2,
  audience: Users,
  affiliation: Handshake,
  specialty: Star,
  logo: ImageIcon,
  unresolved_profile: CircleHelp,
  identifier: Fingerprint,
  hashtag: Hash,
  funding: Landmark,
  policy: ScrollText,
  other: Info,
};

/**
 * Display order for grouped facts: identity/editorial truth first, bulk
 * contact data (a national brand can carry dozens of phones/addresses) last so
 * it never buries the identity rows.
 */
const FACT_KIND_ORDER: BusinessFactKind[] = [
  "tagline",
  "legal_name",
  "site_name",
  "title",
  "description",
  "spokesperson",
  "proof",
  "hours",
  "registration",
  "social_profile",
  "statement",
  "category",
  "offering",
  "specialty",
  "audience",
  "founded",
  "person",
  "ownership",
  "affiliation",
  "funding",
  "technology",
  "industry_code",
  "metric",
  "location",
  "website",
  "listing",
  "policy",
  "logo",
  "identifier",
  "hashtag",
  "unresolved_profile",
  "other",
  "email",
  "phone",
  "fax",
  "address",
];

/** The brand home's tabs. Each tab renders (and fetches) only its own areas. */
type BrandTab = "overview" | "facts" | "social" | "web" | "on_the_web" | "relationships" | "profile" | "assets" | "activity";
const BRAND_TABS: ReadonlyArray<{ value: BrandTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "facts", label: "Facts" },
  { value: "social", label: "Social" },
  { value: "web", label: "Web & search" },
  { value: "on_the_web", label: "On the web" },
  { value: "relationships", label: "Relationships" },
  { value: "profile", label: "Profile" },
  { value: "assets", label: "Assets" },
  { value: "activity", label: "Activity" },
];
function toBrandTab(value: string | null | undefined): BrandTab {
  return BRAND_TABS.some((tab) => tab.value === value) ? (value as BrandTab) : "overview";
}
/** The fact family's chip tone (Overview summary), matching the group chips below. */
const FACT_CHIP_TONE: Record<FactTone, ChipTone> = {
  primary: "primary",
  success: "success",
  warning: "warning",
  info: "info",
  destructive: "destructive",
};

/** Groups preview this many rows; the rest sit behind Show all. */
const FACT_GROUP_PREVIEW = 5;

/** Light semantic color per fact family, for the group's icon chip (real tokens only). */
type FactTone = "primary" | "success" | "warning" | "info" | "destructive";
const FACT_TONE_CLASS: Record<FactTone, string> = {
  primary: "bg-primary/10 text-primary-ink",
  success: "bg-success/10 text-success-ink",
  warning: "bg-warning/10 text-warning-ink",
  info: "bg-info/10 text-info-ink",
  destructive: "bg-destructive/10 text-destructive-ink",
};
function factTone(kind: BusinessFactKind): FactTone {
  if (["phone", "fax", "email", "address", "hours", "location"].includes(kind)) return "success";
  if (["website", "social_profile", "listing", "site_name", "hashtag", "identifier"].includes(kind)) return "info";
  if (["category", "offering", "specialty", "audience", "industry_code", "metric", "funding", "founded", "technology"].includes(kind)) return "warning";
  if (kind === "unresolved_profile") return "destructive";
  return "primary";
}

function groupFactsByKind(
  facts: BusinessFact[],
): Array<[BusinessFactKind, BusinessFact[]]> {
  const byKind = new Map<BusinessFactKind, BusinessFact[]>();
  for (const fact of facts) {
    const kind = isBusinessFactKind(fact.kind) ? fact.kind : "other";
    const bucket = byKind.get(kind);
    if (bucket) bucket.push(fact);
    else byKind.set(kind, [fact]);
  }
  return [...byKind.entries()].sort(
    (a, b) => FACT_KIND_ORDER.indexOf(a[0]) - FACT_KIND_ORDER.indexOf(b[0]),
  );
}

/** Same value, written twice (a trailing slash, a case change): one row. */
function factFoldKey(fact: BusinessFact): string {
  return factValueText(fact)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/+$/, "");
}

interface FoldedFact {
  fact: BusinessFact;
  copies: number;
}

function foldFacts(facts: BusinessFact[]): FoldedFact[] {
  const out = new Map<string, FoldedFact>();
  for (const fact of facts) {
    const key = factFoldKey(fact);
    const hit = out.get(key);
    if (hit) hit.copies += 1;
    else out.set(key, { fact, copies: 1 });
  }
  return [...out.values()];
}

function factLabelOf(fact: BusinessFact): string {
  return (
    factDisplayLabel(fact.label, factValueText(fact)) ||
    (isBusinessFactKind(fact.kind)
      ? BUSINESS_FACT_KIND_LABELS[fact.kind]
      : (humanizeIdentifier(fact.kind) || fact.kind))
  );
}

/** One fact row inside its group: value in foreground, a sub-label only when it says more than the group does. */
function BusinessFactRow({
  folded,
  groupLabel,
  showLabel,
  canEdit,
  onEdit,
  onDelete,
}: {
  folded: FoldedFact;
  groupLabel: string;
  showLabel: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { fact, copies } = folded;
  const value = factValueText(fact);
  const factLabel = factLabelOf(fact);
  const shown = factDisplayLabel(fact.label, value);
  const subLabel = shown && shown.toLowerCase() !== groupLabel.toLowerCase() ? shown : "";
  return (
    <li className="flex min-h-9 min-w-0 items-center gap-3 px-3 py-0.5 hover:bg-accent/40" data-fact-id={fact.id}>
      {showLabel ? (
        <span className="w-24 shrink-0 truncate type-label sm:w-40" title={subLabel || undefined}>
          {subLabel}
        </span>
      ) : null}
      {contactFactValue({ kind: fact.kind, value, className: "flex min-w-0 flex-1 type-body text-foreground" }) ?? (
        <span className="min-w-0 flex-1 truncate type-body text-foreground" title={value}>
          {value}
        </span>
      )}
      {copies > 1 ? (
        <span
          className="shrink-0 type-meta tabular-nums text-muted-foreground"
          title={`Saved ${copies} times with the same value`}
        >
          ×{copies}
        </span>
      ) : null}
      <div className="flex shrink-0 items-center gap-0.5">
        <CopyButtons
          size="xs"
          label={`${factLabel}: ${value}`}
          sourceId={`web-business-fact:${fact.id}`}
          data={fact}
          dataType="Agent"
        />
        {/* Viewers get copy only — the same rule as the hero's actions. */}
        {canEdit ? (
          <>
            <RowActionButton title="Edit fact" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </RowActionButton>
            <RowActionButton title="Delete fact" destructive onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </RowActionButton>
          </>
        ) : null}
      </div>
    </li>
  );
}

/** One kind of fact: the kind's color chip and name once, then its rows. */
function BusinessFactGroup({
  kind,
  facts,
  canEdit,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  kind: BusinessFactKind;
  facts: BusinessFact[];
  canEdit: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (fact: BusinessFact) => void;
  onDelete: (fact: BusinessFact) => void;
}) {
  const label = BUSINESS_FACT_KIND_LABELS[kind];
  const folded = foldFacts(facts);
  const visible = expanded ? folded : folded.slice(0, FACT_GROUP_PREVIEW);
  // The sub-label column shows only when it tells rows apart (Industry vs Business type), never one name repeated.
  const subLabels = new Set(
    folded
      .map(({ fact }) => factDisplayLabel(fact.label, factValueText(fact)).toLowerCase())
      .filter((l) => l && l !== label.toLowerCase()),
  );
  const showLabel = subLabels.size > 1;
  const GroupIcon = FACT_KIND_ICONS[kind];
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-border" data-fact-group={kind}>
      <div className="flex h-10 items-center gap-2 border-b border-border px-3">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${FACT_TONE_CLASS[factTone(kind)]}`}>
          <GroupIcon className="h-3.5 w-3.5" />
        </span>
        <h3 className="type-title text-foreground">{label}</h3>
        <span className="type-meta tabular-nums text-muted-foreground">{folded.length}</span>
      </div>
      <ul className="divide-y divide-border">
        {visible.map((item) => (
          <BusinessFactRow
            key={item.fact.id}
            folded={item}
            groupLabel={label}
            showLabel={showLabel}
            canEdit={canEdit}
            onEdit={() => onEdit(item.fact)}
            onDelete={() => onDelete(item.fact)}
          />
        ))}
      </ul>
      {folded.length > FACT_GROUP_PREVIEW ? (
        <button
          type="button"
          className="flex h-8 w-full items-center gap-1 border-t border-border px-3 type-secondary font-medium text-primary hover:bg-accent/40"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <ChevronDown className={expanded ? "h-3.5 w-3.5 rotate-180 transition-transform" : "h-3.5 w-3.5 transition-transform"} />
          {expanded ? "Show less" : `Show all ${folded.length}`}
        </button>
      ) : null}
    </section>
  );
}

export function BrandWorkspace({ brandId }: { brandId: string }) {
  // What a server run writes for this brand (discovery, Smart Add) shows without a reload.
  useLiveBrand(brandId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The tab lives in the URL (?tab=), so a reload, a shared link and Back all keep it.
  const urlTab = toBrandTab(searchParams.get("tab"));
  const [tab, setTabState] = useState<BrandTab>(urlTab);
  // A link that changes ?tab= (a KPI tile, Back) opens that tab: follow the URL when it moves.
  const [seenUrlTab, setSeenUrlTab] = useState<BrandTab>(urlTab);
  if (urlTab !== seenUrlTab) {
    setSeenUrlTab(urlTab);
    setTabState(urlTab);
  }
  const setTab = (next: BrandTab) => {
    setTabState(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    // Query state, not a new page: change the address without a navigation (useSearchParams follows).
    replaceAddressWithoutNavigating(`${pathname}${query ? `?${query}` : ""}`);
  };

  const brand = useBrand(brandId);
  // What the viewer may DO is the record's own access answer (not the active
  // organization, not "can the page load"): write controls show only at
  // editor level or above. RLS stays the boundary.
  const brandAccess = useAccess("web_brand", brandId);
  const canEdit = canEditAccess(brandAccess.level);
  // Removing an account or website undoes the decision that brought it in (UNDO.md): preview, then retract.
  const queryClient = useQueryClient();
  const deleteAssetMutation = useDeleteBrandAsset();
  const deleteFactMutation = useDeleteBusinessFact();
  const openForEdit = useIsEditTarget("description");
  const [editorOpen, setEditorOpen] = useState(openForEdit);
  useFocusEditTarget("description", editorOpen);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [moving, setMoving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editingSite, setEditingSite] = useState<MarketingSite | null>(null);
  const [deletingSite, setDeletingSite] = useState<MarketingSite | null>(null);
  const [propertyEditor, setPropertyEditor] = useState<{
    open: boolean;
    property: BrandProperty | null;
  }>({ open: false, property: null });
  const [deletingProperty, setDeletingProperty] =
    useState<BrandProperty | null>(null);
  const [assetEditor, setAssetEditor] = useState<{
    open: boolean;
    asset: BrandAsset | null;
  }>({ open: false, asset: null });
  const [deletingAsset, setDeletingAsset] = useState<BrandAsset | null>(null);
  const [factEditor, setFactEditor] = useState<{
    open: boolean;
    fact: BusinessFact | null;
  }>({ open: false, fact: null });
  const [deletingFact, setDeletingFact] = useState<BusinessFact | null>(null);
  const [expandedFactKinds, setExpandedFactKinds] = useState<
    Record<string, boolean>
  >({});
  // access-errors: ok — cockpit section list; the brand read below is the gated primary and a failed section shows as empty, editable via its own card
  const sites = useBrandSites(brandId);
  const createSite = useCreateSite();
  // access-errors: ok — cockpit section list under the gated brand primary
  const properties = useBrandProperties(brandId);
  const matchingProperties = useBrandPropertiesForMatching(brandId);
  const personas = useBrandPersonas(brandId);
  // access-errors: ok — cockpit section list under the gated brand primary
  const assets = useBrandAssets(brandId);
  // access-errors: ok — cockpit section list under the gated brand primary
  const facts = useBusinessFacts(brandId);
  // access-errors: ok — inbox count badge; absence only hides the badge
  const pending = usePendingDiscoveredCount(brandId);
  // access-errors: ok — the hero's account icons; without it they fall back to the public link
  const socialAccounts = useBrandSocialAccounts(brandId);

  // The sites and accounts lists load beside the brand and size the page's loading boxes (background work),
  // so the page appears once they are known and nothing below ever moves.
  if (brand.isLoading || (brand.data && (sites.isLoading || properties.isLoading))) {
    // The [brandId] layout's trail is the header for this whole tree — a
    // second per-page RouteHeader here would hide it (Arman, 2026-08-30).
    return <BrandHomeSkeleton />;
  }
  if (brand.isError || !brand.data) {
    return (
      <>
        <AccessGate
          token="web_brand"
          id={brandId}
          error={brand.error}
          onRetry={() => void brand.refetch()}
          fallbackHref={marketingRoutes.brands()}
          fallbackLabel="All brands"
        />
      </>
    );
  }

  const current = brand.data;
  const websiteSites = sites.data ?? [];
  const socialProperties = (properties.data ?? []).filter(
    (property) => property.kind !== "website",
  );
  // The brand's public website: the website property (readable by anyone who
  // can read the brand), else the URL typed on the brand itself.
  const publicWebsiteUrl =
    (properties.data ?? []).find((property) => property.kind === "website" && property.url)?.url ||
    current.website_url ||
    null;
  const factRows = facts.data ?? [];
  const assetRows = assets.data ?? [];
  // A person's profile picture that enrichment saved as a logo is never the brand's mark.
  // Also not the brand's: a discovered social avatar whose source account is no longer a live property of the brand.
  // Judged only once every live property has loaded (an unloaded list would call every avatar an orphan).
  const personAvatars = new Set<string>([
    ...personAvatarAssetIds(assetRows, matchingProperties.data ?? properties.data ?? []),
    ...(matchingProperties.data ? orphanAvatarAssetIds(assetRows, matchingProperties.data) : []),
  ]);

  // The brand's best identity marks: explicit brand URLs first, then the
  // confirmed asset library — a brand with confirmed logos never shows a
  // placeholder globe just because nobody copied a URL onto the brand row.
  const heroIdentity = {
    name: current.name,
    // A sharing banner saved as the logo (og:image) never stands in for the mark: the best ranked logo asset does.
    logo_url:
      pickHeroLogo(
        current.logo_url,
        assetRows
          .filter((asset) => ["logo", "logo_dark", "wordmark", "headshot"].includes(asset.kind) && !personAvatars.has(asset.id))
          .flatMap((asset) => {
            const url = assetPreviewUrl(asset);
            return url && !assetImageExpired(asset) ? [{ url, kind: asset.kind, fileId: asset.file_id }] : [];
          }),
      ),
    favicon_url: current.favicon_url || firstAssetUrl(assetRows, ["favicon"]),
  };

  const sortedAssets = [...assetRows].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) ||
      a.sort_order - b.sort_order,
  );
  const factGroups = groupFactsByKind(factRows);
  const brandSeg = marketingSeg(current);
  const tabHref = (next: string) => `${marketingRoutes.brand(brandSeg)}${next === "overview" ? "" : `?tab=${next}`}`;
  const brandColors = sortedAssets
    .map((asset) => ({ id: asset.id, value: assetColorValue(asset), name: asset.title }))
    .filter((c): c is { id: string; value: string; name: string | null } => Boolean(c.value));
  // The Brand palette: every color with a value (primary first) and every font, confirmed or waiting for a Yes.
  const paletteColors = sortedAssets.flatMap((asset) => {
    const value = assetColorValue(asset);
    return value ? [{ asset, value }] : [];
  });
  const paletteFonts = sortedAssets.filter((asset) => asset.kind === "font");
  const toOverviewAsset = (asset: BrandAsset) => ({
    id: asset.id,
    preview: assetPreviewUrl(asset),
    kind: asset.kind,
    fileId: asset.file_id,
    expired: assetImageExpired(asset),
    organizationId: asset.organization_id,
    color: null,
    label: isBrandAssetKind(asset.kind) ? BRAND_ASSET_KIND_LABELS[asset.kind] : humanizeIdentifier(asset.kind) || asset.kind,
  });
  const heroAccent = vividColor(brandColors.map((c) => c.value));
  const LOGO_KINDS: readonly string[] = ["logo", "logo_dark", "wordmark", "favicon", "headshot"];
  // A sharing banner (og:image / twitter card) is never a mark, so Brand look never offers one.
  const logoAssets = sortedAssets
    .filter((asset) => LOGO_KINDS.includes(asset.kind) && assetPreviewUrl(asset) && !isBannerUrl(asset.source_url) && !personAvatars.has(asset.id))
    .map(toOverviewAsset);

  // Surface scope — assembled at trigger time from what the cockpit already
  // loaded. No fetching; keys are omitted when their data is not loaded yet.
  const getBrandScope = () => {
    const profile = parseBrandProfile(current.profile);
    return createMarketingBrandScope({
      brand_id: brandId,
      brand_name: current.name,
      brand_context: buildBrandContextXml({
        brand: current,
        properties: properties.data ?? [],
        personas: personas.data ?? [],
        facts: factRows,
        assets: assetRows,
        sites: websiteSites,
      }),
      ...(Object.keys(profile).length > 0
        ? { brand_profile: profile as Record<string, unknown> }
        : {}),
      ...(typeof pending.data === "number"
        ? { pending_review_count: pending.data }
        : {}),
      ...(websiteSites.length > 0
        ? {
            sites_summary: websiteSites.map((site) => ({
              id: site.id,
              name: site.name,
              root_url: site.root_url,
              status: site.status,
            })),
          }
        : {}),
      ...(socialProperties.length > 0
        ? {
            properties_summary: socialProperties.map((property) => ({
              kind: property.kind,
              url: property.url,
              handle: property.handle,
              status: property.status,
            })),
          }
        : {}),
    });
  };

  const overviewCopy = brandKindCopy(current).overview;

  // The brand names a website that is not yet a managed site: one click makes it the website property.
  const addBrandWebsite = async () => {
    try {
      const parsed = normalizeWebsiteUrl(current.website_url ?? "");
      await createSite.mutateAsync({
        organizationId: current.organization_id,
        name: parsed.hostname,
        rootUrl: parsed.toString(),
        domain: parsed.hostname.toLowerCase(),
        brandId: current.id,
      });
      toast.success(`Added ${parsed.hostname}`);
    } catch (error) {
      toast.error("Could not add website", { description: extractErrorMessage(error) });
    }
  };

  const brandCopy = webCopy({
    kind: "web-brand",
    label: `Brand ${current.name}`,
    description:
      "The full brand cockpit: identity plus its websites, social properties, confirmed business facts, and brand assets.",
    surface: `Brand cockpit — ${current.name}`,
    data: {
      brand: current,
      sites: websiteSites,
      properties: properties.data ?? [],
      assets: assetRows,
      facts: factRows,
      pendingDiscovered: pending.data ?? 0,
    },
    lines: [
      ["Brand", current.name],
      ["Website", current.website_url],
      ["Industry", current.industry],
      ["Status", current.status],
      ["Description", current.description],
      [
        "Websites",
        websiteSites.map((site) => site.domain).join(", ") || "none",
      ],
      ["Social properties", socialProperties.length],
      ["Business facts", factRows.length],
      ["Brand assets", assetRows.length],
      ["Pending review", pending.data ?? 0],
    ],
    attributes: { brand_id: current.id, status: current.status },
  });

  const websitesCopy = webCopy({
    kind: "web-brand-websites",
    label: "Brand websites",
    description: "The website properties (managed sites) owned by this brand.",
    surface: `Websites — ${current.name}`,
    data: websiteSites,
    lines: [
      ["Brand", current.name],
      ["Websites", websiteSites.length],
      ...websiteSites.map((site): [string, string] => [
        site.name,
        `${site.domain} · ${site.status}`,
      ]),
    ],
    attributes: { brand_id: current.id, count: websiteSites.length },
  });

  const socialsCopy = webCopy({
    kind: "web-brand-properties",
    label: "Social profiles & other properties",
    description:
      "The brand's non-website properties (social profiles and other presences).",
    surface: `Social profiles — ${current.name}`,
    data: socialProperties,
    lines: [
      ["Brand", current.name],
      ["Properties", socialProperties.length],
      ...socialProperties.map((property): [string, string] => [
        (humanizeIdentifier(property.kind) || property.kind),
        property.url || property.handle || property.display_name || "—",
      ]),
    ],
    attributes: { brand_id: current.id, count: socialProperties.length },
  });

  const factsCopy = webCopy({
    kind: "web-business-facts",
    label: "Business facts",
    description:
      "Human-confirmed business facts for this brand (phones, addresses, taglines, identity).",
    surface: `Business facts — ${current.name}`,
    data: factRows,
    lines: [
      ["Brand", current.name],
      ["Facts", factRows.length],
      ...factRows.map((fact): [string, string] => [
        fact.label || (humanizeIdentifier(fact.kind) || fact.kind),
        factValueText(fact),
      ]),
    ],
    attributes: { brand_id: current.id, count: factRows.length },
  });

  const assetsCopy = webCopy({
    kind: "web-brand-assets",
    label: "Brand assets",
    description:
      "Human-confirmed brand assets (logos, favicons, imagery) with their source URLs.",
    surface: `Brand assets — ${current.name}`,
    data: assetRows,
    lines: [
      ["Brand", current.name],
      ["Assets", assetRows.length],
      ...assetRows.map((asset): [string, string] => [
        `${humanizeIdentifier(asset.kind) || asset.kind}${asset.title ? ` · ${asset.title}` : ""}`,
        asset.source_url ?? "no source URL",
      ]),
    ],
    attributes: { brand_id: current.id, count: assetRows.length },
  });

  return (
    <SurfaceRuntimeProvider
      surfaceName={MARKETING_BRAND_SURFACE_NAME}
      getScope={getBrandScope}
    >
      {/* Write half of the surface — registers the handlers the manifest's
          writeTargets declare. Renders nothing. */}
      <MarketingBrandWriteTargets brand={current} />
      {/* No RouteHeader here — the [brandId] layout's breadcrumb trail is the
          header for the whole brand tree (Arman, 2026-08-30). The old header's
          "Value settings" door is the sidebar's Settings row. */}
      <main className="h-full overflow-y-auto bg-textured p-3 pt-[calc(var(--shell-header-h)+0.5rem)] sm:p-4 sm:pt-[calc(var(--shell-header-h)+0.75rem)]">
        <div className="grid w-full gap-3">
          {/* A person brand leads with the person: their face and their accounts come first. */}
          {/* Fixed-height hero (BRAND_HERO_FRAME): every line holds its height from first paint, so the
              loading placeholder and the loaded page are the same size at every width. */}
          <section className={`${BRAND_HERO_FRAME} relative isolate flex items-start gap-3 overflow-hidden rounded-lg border border-border bg-card p-4 sm:gap-4${isPersonBrand(current) ? " order-first" : ""}`}>
            {/* The brand's most vivid color as a thin top edge and a faint wash (its data, not a theme color). */}
            {heroAccent ? (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10"
                  style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${heroAccent} 16%, transparent), transparent 55%)` }}
                />
                <span aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-1" style={{ background: heroAccent }} />
              </>
            ) : null}
            <div className="size-12 shrink-0 sm:size-[72px] [&>*]:!size-full">
              {isPersonBrand(current) ? (
                <PersonBrandAvatar
                  brandId={current.id}
                  size={72}
                  fallback={<SiteIdentityMark site={heroIdentity} size={72} prefer="logo" className="bg-background p-1.5" />}
                />
              ) : (
                <SiteIdentityMark site={heroIdentity} size={72} prefer="logo" className="bg-background p-1.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex h-7 min-w-0 items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-xl font-semibold tracking-tight text-foreground" title={current.name}>
                  {current.name}
                </h2>
                {/* Phone: copy + one overflow menu. Wider: every action visible. */}
                <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
                  <CopyButtons size="icon" {...brandCopy} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button icon={<MoreHorizontal />} variant="outline" aria-label="Brand actions" title="Brand actions" data-testid="brand-actions-menu" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit ? (
                        <DropdownMenuItem asChild>
                          <Link prefetch={false} href={marketingRoutes.smartAddEnrich(current.id)}>
                            <ScanSearch />
                            Enrich Brand
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      {canEdit ? <DiscoverBrandMenuItem brandId={current.id} organizationId={current.organization_id} /> : null}
                      {canEdit ? (
                        <DropdownMenuItem asChild>
                          <Link prefetch={false} href={marketingRoutes.brandSession(marketingSeg(current))}>
                            <Layers />
                            Decide
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      {canEdit ? (
                        <DropdownMenuItem onSelect={() => setEditorOpen(true)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      {canEdit ? (
                        <DropdownMenuItem onSelect={() => setMoving(true)}>
                          <ArrowRightLeft />
                          Move
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onSelect={() => setSharing(true)}>
                        <Share2 />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link prefetch={false} href={marketingRoutes.brandDiscovery(marketingSeg(current))}>
                          <Inbox />
                          To review
                          <DropdownMenuShortcut className="tabular-nums">
                            {pending.isLoading ? "…" : (pending.data ?? 0).toLocaleString()}
                          </DropdownMenuShortcut>
                        </Link>
                      </DropdownMenuItem>
                      {canEdit ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmingDelete(true)}>
                            <Archive />
                            Archive
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  <CopyButtons size="icon" {...brandCopy} />
                  <ShareButton
                    resourceType="web_brand"
                    resourceId={current.id}
                    resourceName={current.name} iconOnly
                    showStatus={false}
                  />
                  {/* Fixed minimum width, so the count arriving never resizes the row. */}
                  <Button asChild variant="outline" className="min-w-[3.5rem] tabular-nums">
                    <Link
                      prefetch={false}
                      href={marketingRoutes.brandDiscovery(marketingSeg(current))}
                      aria-label={`${(pending.data ?? 0).toLocaleString()} to review`}
                      title={`${(pending.data ?? 0).toLocaleString()} to review`}
                    >
                      <Inbox className="h-3.5 w-3.5" />
                      {pending.isLoading ? "…" : (pending.data ?? 0).toLocaleString()}
                    </Link>
                  </Button>
                  {canEdit ? (
                    <>
                      <Button asChild variant="outline">
                        <Link prefetch={false} href={marketingRoutes.smartAddEnrich(current.id)} data-testid="brand-enrich-smart-add">
                          <ScanSearch className="h-3.5 w-3.5" />
                          Enrich Brand
                        </Link>
                      </Button>
                      <DiscoverBrandButton brandId={current.id} organizationId={current.organization_id} />
                      <Button asChild variant="outline">
                        <Link prefetch={false} href={marketingRoutes.brandSession(marketingSeg(current))} data-testid="brand-session" title="Decide where each candidate belongs">
                          <Layers className="h-3.5 w-3.5" />
                          Decide
                        </Link>
                      </Button>
                      <Button
                        icon={<Pencil />}
                        variant="outline"
                        aria-label="Edit brand"
                        title="Edit brand"
                        onClick={() => setEditorOpen(true)}
                      />
                      <Button
                        icon={<ArrowRightLeft />}
                        variant="outline"
                        aria-label="Move to another organization"
                        title="Move to another organization"
                        onClick={() => setMoving(true)}
                        data-testid="brand-move-organization"
                      />
                      <Button
                        icon={<Archive />}
                        variant="danger"
                        aria-label="Archive brand"
                        title="Archive brand"
                        onClick={() => setConfirmingDelete(true)}
                      />
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-0.5 flex h-6 min-w-0 items-center overflow-hidden">
                {current.website_url ? contactFactValue({ kind: "website", value: externalHref(current.website_url) }) : null}
              </div>
              {/* Status, kind and industry, then the setup status on the same line (often empty). */}
              <div className="mt-2 flex h-7 min-w-0 flex-nowrap items-center gap-2 overflow-hidden">
                <span className="inline-flex shrink-0">
                  <StatusBadge value={current.status} />
                </span>
                {isPersonBrand(current) ? (
                  <>
                    <Badge variant="outline">{BRAND_KIND_COPY.person.label}</Badge>
                    <PersonFollowerTotal brandId={current.id} />
                  </>
                ) : null}
                {/* On a phone the line has room for status and setup only: a squeezed industry chip was an empty pill. */}
                {current.industry ? (
                  <Badge variant="outline" className="hidden min-w-12 truncate sm:inline-flex" title={current.industry}>
                    {current.industry}
                  </Badge>
                ) : null}
                <div className="flex shrink-0 items-center">
                  <SmartAddSetupStatus brandId={current.id} organizationId={current.organization_id} />
                </div>
              </div>
              {/* One line of who the brand is; the accounts themselves are rows on the Overview, never icons here. */}
              <p className="mt-2 h-6 min-w-0 truncate type-secondary leading-6 text-muted-foreground" title={current.description ?? undefined}>
                {current.description ?? ""}
              </p>
            </div>
          </section>
          {sharing ? (
            <ShareModal
              isOpen={sharing}
              onClose={() => setSharing(false)}
              resourceType="web_brand"
              resourceId={current.id}
              resourceName={current.name}
              organizationId={current.organization_id}
            />
          ) : null}

          {/* Tabs: the home is a summary; each area has its own tab, and only the open tab loads.
              Sticky offsets cancel <main>'s top padding (header + 0.5rem / 0.75rem), so the bar sits
              flush under the shell header with no strip of scrolling content above it. */}
          <nav
            aria-label="Brand sections"
            className="sticky -top-2 z-10 flex min-w-0 items-end sm:-top-3 gap-2 overflow-x-auto rounded-lg border border-border bg-card"
          >
            <Tabs
              inset
              value={tab}
              onValueChange={setTab}
              rule={false}
              aria-label="Brand sections"
              data={BRAND_TABS.map((item) => ({
                value: item.value,
                label: item.label,
                count:
                  item.value === "facts"
                    ? factRows.length || null
                    : item.value === "social"
                      ? socialProperties.length || null
                      : item.value === "web"
                        ? websiteSites.length || null
                        : item.value === "assets"
                          ? assetRows.length || null
                          : null,
              }))}
            />
            <div className="ml-auto flex shrink-0 items-center self-center">
              {/* THE HUMAN GATE: a button here (nothing moves when it appears); the question opens in a dialog. */}
              <SmartAddBasicsGate brandId={current.id} />
            </div>
          </nav>

          {tab === "overview" ? (
            // Order (Arman, 2026-10-21): the sure, beautiful things first; discoveries low, compact and foldable.
            <div className="grid gap-3">
              <BrandOverviewKpis
                brandId={current.id}
                brandSeg={brandSeg}
                siteIds={websiteSites.map((site) => site.id)}
                accounts={socialAccounts.data ?? []}
                accountsLoading={socialAccounts.isLoading}
                tabHref={tabHref}
              />
              <BrandOverviewSites
                brandSeg={brandSeg}
                sites={websiteSites}
                loading={sites.isLoading}
                error={sites.isError ? sites.error : undefined}
                onRetry={() => void sites.refetch()}
                publicWebsiteUrl={publicWebsiteUrl}
                allHref={tabHref("web")}
              />
              <BrandOverviewNext
                brandId={current.id}
                brandSeg={brandSeg}
                siteIds={websiteSites.map((site) => site.id)}
                accounts={socialAccounts.data ?? []}
                accountsLoading={socialAccounts.isLoading}
                pending={pending.isLoading ? null : (pending.data ?? 0)}
                factCount={factRows.length}
                canEdit={canEdit}
                tabHref={tabHref}
              />
              <div className="grid items-start gap-3 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                  <BrandOverviewAccounts
                    brandId={current.id}
                    brandSeg={brandSeg}
                    brandName={current.name}
                    identity={{
                      legalNames: factRows.filter((f) => f.kind === "legal_name").map(factValueText),
                      websites: [current.website_url, ...(properties.data ?? []).filter((p) => p.kind === "website").map((p) => p.url)],
                    }}
                    organizationId={current.organization_id}
                    accounts={socialAccounts.data ?? []}
                    loading={socialAccounts.isLoading}
                    expectedRows={socialProperties.length}
                    error={socialAccounts.isError ? socialAccounts.error : undefined}
                    onRetry={() => void socialAccounts.refetch()}
                    canEdit={canEdit}
                    allHref={tabHref("social")}
                    onAdd={() => setPropertyEditor({ open: true, property: null })}
                  />
                </div>
                <div className="min-w-0">
                  <BrandOverviewActions
                    brandId={current.id}
                    brandSeg={brandSeg}
                    organizationId={current.organization_id}
                    canEdit={canEdit}
                    pending={pending.isLoading ? null : (pending.data ?? 0)}
                    onAddFact={() => setFactEditor({ open: true, fact: null })}
                    onAddAccount={() => setPropertyEditor({ open: true, property: null })}
                    onOpenActivity={() => setTab("activity")}
                  />
                </div>
              </div>
              <div className="grid items-start gap-3 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                  <BrandOverviewKnown
                    brandId={current.id}
                    brandSeg={brandSeg}
                    organizationId={current.organization_id}
                    siteIds={websiteSites.map((site) => site.id)}
                    profile={parseBrandProfile(current.profile)}
                    personas={personas.data ?? []}
                    tabHref={tabHref}
                  />
                </div>
                <div className="grid min-w-0 gap-3">
                  <BrandOverviewLook logos={logoAssets} total={assetRows.length} onOpen={() => setTab("assets")} />
                  <BrandOverviewContact facts={factRows} websiteUrl={publicWebsiteUrl} onOpen={() => setTab("facts")} />
                </div>
              </div>
              <BrandPalette colors={paletteColors} fonts={paletteFonts} canEdit={canEdit} onOpen={() => setTab("assets")} />
              {/* Brand assists: at most three 30-second enrichments across all brands; a "no" is final. */}
              {canEdit ? <BrandAssists brandId={current.id} organizationId={current.organization_id} /> : null}
              {/* Research on conditions: the four conditions per area and the one action that fixes each. */}
              {canEdit ? <BrandResearchReadiness brandId={current.id} organizationId={current.organization_id} /> : null}
              <div className="grid items-start gap-3 lg:grid-cols-3">
                <div className="grid min-w-0 gap-3 lg:col-span-2">
                  <BrandOverviewAbout
                    facts={factRows}
                    industry={current.industry}
                    websiteUrl={publicWebsiteUrl}
                    canEdit={canEdit}
                    onAdd={() => setFactEditor({ open: true, fact: null })}
                  />
                  <BrandOverviewFacts
                    title={overviewCopy.factsTitle}
                    total={factRows.length}
                    groups={factGroups.map(([kind, groupFacts]) => ({
                      kind,
                      count: foldFacts(groupFacts).length,
                      icon: FACT_KIND_ICONS[kind],
                      tone: FACT_CHIP_TONE[factTone(kind)],
                    }))}
                    onOpen={() => setTab("facts")}
                  />
                </div>
                <div className="min-w-0">
                  <BrandOverviewActivity
                    brandId={current.id}
                    brandSeg={brandSeg}
                    sites={websiteSites}
                    profileIds={(socialAccounts.data ?? [])
                      .filter((a) => a.ownerKind !== "person" && a.profileId)
                      .map((a) => a.profileId as string)}
                    enabled={!socialAccounts.isLoading && !sites.isLoading}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Custom fields and linked records are profile data: they live on the Profile tab, not the headline page. */}
          {tab === "profile" ? (
            <EntityCustomFields entityToken="web_brand" recordId={current.id} organizationId={current.organization_id} />
          ) : null}

          {tab === "facts" ? (
          <SectionCard
            title={overviewCopy.factsTitle}
            anchor="business-facts"
            className="scroll-mt-24"
            copy={factsCopy}
            action={
              canEdit
                ? {
                    label: overviewCopy.factsAdd,
                    onClick: () => setFactEditor({ open: true, fact: null }),
                  }
                : undefined
            }
          >
            {factRows.length === 0 ? (
              <EmptyState icon={<ListChecks />} title={overviewCopy.factsEmpty} />
            ) : (
              // Groups sit side by side on wide screens, so one phone number never spans the whole page.
              <div className="grid items-start gap-3 p-3 lg:grid-cols-2 2xl:grid-cols-3">
                {factGroups.map(([kind, groupFacts]) => (
                  <BusinessFactGroup
                    key={kind}
                    kind={kind}
                    facts={groupFacts}
                    canEdit={canEdit}
                    expanded={Boolean(expandedFactKinds[kind])}
                    onToggle={() =>
                      setExpandedFactKinds((state) => ({ ...state, [kind]: !state[kind] }))
                    }
                    onEdit={(fact) => setFactEditor({ open: true, fact })}
                    onDelete={(fact) => setDeletingFact(fact)}
                  />
                ))}
              </div>
            )}
          </SectionCard>
          ) : null}

          {tab === "social" ? (
          <div id="social-profiles" className="min-w-0 scroll-mt-24">
          <BrandSocialProfilesCard
            brandId={current.id}
            brandSeg={marketingSeg(current)}
            organizationId={current.organization_id}
            properties={socialProperties}
            canEdit={canEdit}
            copy={socialsCopy}
            onAdd={() => setPropertyEditor({ open: true, property: null })}
            onEdit={(property) => setPropertyEditor({ open: true, property })}
            onDelete={(property) => setDeletingProperty(property)}
          />
          </div>
          ) : null}

          {tab === "web" ? (
            <>
          {/* The brand is the anchor entity, but it carried no search data at
              all — every number lived one or two routes down on an individual
              site. This is the brand-level answer to "is our money traffic up
              or down", rolled across every site the brand owns. */}
          {sites.isLoading ? (
            // Holds the bar's height while the brand's sites load, so the cards below never drop.
            <div aria-hidden="true" className="h-[42px] rounded-lg border border-border bg-card" />
          ) : websiteSites.length > 0 ? (
            <BrandSearchClassBar
              siteIds={websiteSites.map((site) => site.id)}
              totalSites={websiteSites.length}
              title={`Search performance across ${current.name}`}
            />
          ) : null}

          <SectionCard
            title="Websites"
            anchor="websites"
            className="scroll-mt-24"
            copy={websitesCopy}
            action={
              canEdit
                ? { label: "Add site", href: marketingRoutes.newSite(brandId) }
                : undefined
            }
          >
            {websiteSites.length === 0 && !canEdit && publicWebsiteUrl ? (
              // A viewer who cannot read the managed site still sees the
              // brand's public website, as a plain link.
              <div className="flex min-h-11 items-center px-3">
                {contactFactValue({ kind: "website", value: externalHref(publicWebsiteUrl) })}
              </div>
            ) : websiteSites.length === 0 ? (
              <EmptyState
                icon={<Globe2 />}
                title={overviewCopy.websitesEmpty}
                action={
                  canEdit && current.website_url ? (
                    <Button
                      variant="outline"
                      disabled={createSite.isPending}
                      onClick={() => void addBrandWebsite()}
                    >
                      {`Add ${linkLabelOf(current.website_url)}`}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {websiteSites.map((site) => (
                  <li
                    key={site.id}
                    className="flex flex-wrap items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/40"
                  >
                    <Link
                      prefetch={false}
                      href={marketingRoutes.site(brandId, site.id)}
                      className="flex min-w-0 flex-1 basis-48 items-center gap-3"
                    >
                      <SiteIdentityMark site={site} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate type-title text-foreground hover:underline">
                          {site.name}
                        </p>
                        <p className="truncate type-meta text-muted-foreground">
                          {site.domain}
                        </p>
                      </div>
                    </Link>
                    <SiteConnectionChips site={site} />
                    <div className="flex shrink-0 items-center gap-0.5">
                      <CopyButtons
                        size="icon"
                        label={`Site ${site.domain}`}
                        data={() =>
                          webCopy({
                            kind: "web-brand-site",
                            label: `Site ${site.domain}`,
                            description:
                              "One website property (managed site) owned by this brand.",
                            surface: `Websites — ${current.name}`,
                            data: site,
                            lines: [
                              ["Site", site.name],
                              ["Domain", site.domain],
                              ["Status", site.status],
                              ["Initialized", site.initialized_at ? "yes" : "never"],
                            ],
                            attributes: { brand_id: current.id, site_id: site.id },
                          }).agent()
                        }
                        dataType="Agent"
                      />
                      <RowActionButton
                        title="Content plan — every URL this site should have"
                        onClick={() =>
                          router.push(marketingRoutes.contentPlanSite(site.id))
                        }
                      >
                        <ListTree className="h-3.5 w-3.5" />
                      </RowActionButton>
                      {canEdit ? (
                        <>
                          <RowActionButton title="Edit site" onClick={() => setEditingSite(site)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </RowActionButton>
                          <RowActionButton title="Delete site" destructive onClick={() => setDeletingSite(site)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </RowActionButton>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* The brand's topical map — which pages this brand should have and
              where they live. A map belongs to the BRAND, so it is a card here
              rather than another row action on one site. */}
          <BrandTopicalMapCard
            title={overviewCopy.mapTitle}
            brandId={current.id}
            brandSeg={marketingSeg(current)}
            organizationId={current.organization_id}
            canEdit={canEdit}
          />

          {/* What AI says about this brand — the owner is the brand, so it shows with or without a site. */}
          <BrandAiVisibilityCard
            brandId={current.id}
            brandSeg={marketingSeg(current)}
            organizationId={current.organization_id}
            canEdit={canEdit}
          />

            </>
          ) : null}

          {tab === "on_the_web" ? <BrandWebDecisionsSection brand={current} canEdit={canEdit} /> : null}

          {tab === "relationships" ? (
          <>
          <BrandRelationsCard brand={current} canEdit={canEdit} />
          <BrandSpokespeople brand={current} canEdit={canEdit} />
          <BrandResearchCard
            brandId={current.id}
            brandName={current.name}
            organizationId={current.organization_id}
          />
          </>

          ) : null}

          {tab === "profile" ? (
            <>
          <BrandRecognitionSection brandId={current.id} canEdit={canEdit} />
          <BrandFirmographicSection brandId={current.id} canEdit={canEdit} />
          <BrandPresenceSection brandId={current.id} canEdit={canEdit} />

            </>
          ) : null}

          {tab === "assets" ? (
          <SectionCard
            title="Brand assets"
            anchor="brand-assets"
            className="scroll-mt-24"
            copy={assetsCopy}
            headerExtra={
              // THE DOOR: the full asset desk — library, research, stock
              // sources, AI generation — moved here from the site's Media
              // section on 2026-08-15. This card is the summary; that is the
              // place you work.
              <Button
                asChild
                variant="outline"
              >
                <Link prefetch={false} href={marketingRoutes.brandAssets(brandId)}>
                  <Images className="h-3.5 w-3.5" />
                  Open asset desk
                </Link>
              </Button>
            }
            action={
              canEdit
                ? {
                    label: "Add asset",
                    onClick: () => setAssetEditor({ open: true, asset: null }),
                  }
                : undefined
            }
          >
            {(assets.data ?? []).length === 0 ? (
              <EmptyState icon={<Images />} title="No confirmed assets yet" />
            ) : (
              <BrandAssetGallery
                items={sortedAssets.map((asset) => ({
                  asset,
                  preview: assetPreviewUrl(asset),
                  color: assetColorValue(asset),
                  label: isBrandAssetKind(asset.kind)
                    ? BRAND_ASSET_KIND_LABELS[asset.kind]
                    : (humanizeIdentifier(asset.kind) || asset.kind),
                }))}
                onOpen={(asset) => {
                  if (asset.source_url) openOutbound(asset.source_url, "_blank", "noopener");
                }}
                renderActions={(asset) => {
                  const kindLabel = isBrandAssetKind(asset.kind)
                    ? BRAND_ASSET_KIND_LABELS[asset.kind]
                    : (humanizeIdentifier(asset.kind) || asset.kind);
                  return (
                    <>
                    <CopyButtons
                      size="xs"
                      label={`${kindLabel}${asset.title ? ` · ${asset.title}` : ""}`}
                      data={() =>
                        webCopy({
                          kind: "web-brand-asset",
                          label: `${kindLabel}${asset.title ? ` · ${asset.title}` : ""}`,
                          description:
                            "One human-confirmed brand asset (logo, favicon, imagery, or color).",
                          surface: `Brand assets — ${current.name}`,
                          data: asset,
                          lines: [
                            ["Asset", kindLabel],
                            ["Title", asset.title],
                            ["Source URL", asset.source_url],
                            ["Primary", asset.is_primary ? "yes" : "no"],
                          ],
                          attributes: { brand_id: current.id, asset_id: asset.id, kind: asset.kind },
                        }).agent()
                      }
                      dataType="Agent"
                    />
                    {canEdit ? (
                      <>
                        <RowActionButton title="Edit asset" onClick={() => setAssetEditor({ open: true, asset })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </RowActionButton>
                        <RowActionButton title="Delete asset" destructive onClick={() => setDeletingAsset(asset)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </RowActionButton>
                      </>
                    ) : null}
                    </>
                  );
                }}
              />
            )}
          </SectionCard>
          ) : null}

          {tab === "activity" ? (
          <BrandBackgroundWork brand={current} canEdit={canEdit} />

          ) : null}
        </div>
      </main>

      <BrandEditorDialog
        open={editorOpen && canEdit}
        onOpenChange={setEditorOpen}
        brand={current}
      />
      <SiteEditorDialog
        open={Boolean(editingSite)}
        onOpenChange={(open) => !open && setEditingSite(null)}
        site={editingSite}
      />
      <RetractionDialog
        target={deletingSite ? { rootType: "site", rootId: deletingSite.id, name: deletingSite.name } : null}
        onCancel={() => setDeletingSite(null)}
        onDone={() => {
          setDeletingSite(null);
          void queryClient.invalidateQueries();
        }}
      />
      <PropertyEditorDialog
        open={propertyEditor.open}
        onOpenChange={(open) =>
          setPropertyEditor((state) => ({ ...state, open }))
        }
        brandId={current.id}
        organizationId={current.organization_id}
        property={propertyEditor.property}
      />
      <RetractionDialog
        target={
          deletingProperty
            ? {
                rootType: "property",
                rootId: deletingProperty.id,
                name: deletingProperty.display_name ?? deletingProperty.handle ?? deletingProperty.url ?? "this account",
              }
            : null
        }
        onCancel={() => setDeletingProperty(null)}
        onDone={() => {
          setDeletingProperty(null);
          void queryClient.invalidateQueries();
        }}
      />
      <BrandAssetEditorDialog
        open={assetEditor.open}
        onOpenChange={(open) => setAssetEditor((state) => ({ ...state, open }))}
        brandId={current.id}
        organizationId={current.organization_id}
        asset={assetEditor.asset}
      />
      <ConfirmDialog
        open={Boolean(deletingAsset)}
        onOpenChange={(open) => !open && setDeletingAsset(null)}
        title="Delete asset?"
        description="The asset moves to trash and leaves the brand library."
        variant="destructive"
        confirmLabel="Delete asset"
        busy={deleteAssetMutation.isPending}
        onConfirm={async () => {
          if (!deletingAsset) return;
          try {
            await deleteAssetMutation.mutateAsync(deletingAsset.id);
            toast.success("Asset deleted");
            setDeletingAsset(null);
          } catch (error) {
            toast.error("Could not delete asset", {
              description: extractErrorMessage(error),
            });
          }
        }}
      />
      <BusinessFactEditorDialog
        open={factEditor.open}
        onOpenChange={(open) => setFactEditor((state) => ({ ...state, open }))}
        brandId={current.id}
        organizationId={current.organization_id}
        fact={factEditor.fact}
      />
      <ConfirmDialog
        open={Boolean(deletingFact)}
        onOpenChange={(open) => !open && setDeletingFact(null)}
        title="Delete fact?"
        description="The fact moves to trash and disappears from this brand."
        variant="destructive"
        confirmLabel="Delete fact"
        busy={deleteFactMutation.isPending}
        onConfirm={async () => {
          if (!deletingFact) return;
          try {
            await deleteFactMutation.mutateAsync(deletingFact.id);
            toast.success("Fact deleted");
            setDeletingFact(null);
          } catch (error) {
            toast.error("Could not delete fact", {
              description: extractErrorMessage(error),
            });
          }
        }}
      />
      {moving ? (
        <ChangeReviewWindow
          title={`Move ${current.name}`}
          target={{ verb: "move", entityType: "web_brand", ids: [current.id] }}
          currentOrganizationId={current.organization_id}
          onClose={() => setMoving(false)}
          onDone={(result) => {
            setMoving(false);
            void queryClient.invalidateQueries({ queryKey: marketingKeys.root });
            toast.success(`Moved ${current.name} to ${result.organization?.name ?? "the other organization"}`);
          }}
        />
      ) : null}
      <BrandArchiveFlow
        brand={confirmingDelete ? { id: current.id, name: current.name } : null}
        onCancel={() => setConfirmingDelete(false)}
        onDone={() => router.push(marketingRoutes.brands())}
      />
    </SurfaceRuntimeProvider>
  );
}
