"use client";

/**
 * Brand Overview -> "Social profiles". ONE list: `social.brand_social_accounts` (the same rows
 * Socials -> Accounts renders), so the two screens can never disagree, in ONE `MatrxDataTable`:
 * one column per sortable / filterable value (account, platform, tracking, followers, 30d, posts,
 * last post, best multiple) and the row's actions in the table's own Actions column (Track /
 * capture / open on the platform / edit / delete). A row opens the account's page.
 * Track runs the Socials track flow (cost named first, live step line in the Tracking cell).
 * The brand's non-social properties (a business listing, "other") ride in the same table as
 * "Listed" rows: never tracked, still editable.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Pencil, Trash2, UserPlus } from "lucide-react";

import { Badge, Button } from "@ai-matrx/design-system/controls";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef, MatrxDataTableMobileCardControls, MatrxTableIconAction } from "@ai-matrx/design-system/data-table/types";
import { PropertyKindMark } from "@/features/marketing/components/shared/PropertyKindMark";
import { PersonOwnerChip } from "@/features/marketing/components/brands/PersonOwnerChip";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { useBrandSocialAccounts, useInvalidateSocial } from "@/features/marketing/social/hooks";
import { useRefusedRead } from "@/features/marketing/social/gated/RefusedReadOffer";
import { GUIDED_CAPTURE_PLATFORMS } from "@/features/marketing/social/gated/guidedJob";
import { brandAccountHref } from "@/features/marketing/social/property-account-href";
import { accountLabels, formatGrowth, lastPostLabel, showOwnerChip } from "@/features/marketing/social/mappers";
import { formatCompact, outlierBadgeModel } from "@/features/marketing/social/outlier";
import { NO_RAW_ROW_WINDOW } from "@/features/marketing/social/row-open";
import { profileAvatarDoor } from "@/features/marketing/social/server";
import type { AccountRow } from "@/features/marketing/social/types";
import { OutlierBadge } from "@/features/marketing/social/components/OutlierBadge";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { SocialImage } from "@/features/marketing/social/components/SocialImage";
import { trackableOwn, useTrackOwn } from "@/features/marketing/social/components/useTrackOwn";
import { formatSocialHandle } from "@/features/marketing/lib/social-handle";
import { contactFactValue } from "@/features/marketing/lib/ContactFactValue";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import type { BrandProperty } from "@/features/marketing/types";

type Tracking = "Tracked" | "Not tracked" | "Not supported" | "Needs a handle" | "Listed";
const TRACKING_VALUES: readonly Tracking[] = ["Tracked", "Not tracked", "Not supported", "Needs a handle", "Listed"];

/** One table row: a social account, or a brand property the social read does not carry. */
interface ProfileRow {
  id: string;
  account: AccountRow | null;
  property: BrandProperty | null;
  platform: string;
  name: string;
  handle: string;
  tracking: Tracking;
  href: string | null;
  externalUrl: string | null;
}

function bestInput(r: AccountRow) {
  return { score: r.bestScore, baselineViews: null, percentile: null, baselineWindow: null, ageHours: null, accountPosts: r.postsTracked };
}

function trackingOf(r: AccountRow): Tracking {
  if (r.trackedAccountId) return "Tracked";
  if (trackableOwn(r)) return "Not tracked";
  return r.trackable === false ? "Not supported" : "Needs a handle";
}

/** A phone's row: who it is, the numbers that matter, and the table's own actions. */
function ProfileCard({ row, controls }: { row: ProfileRow; controls: MatrxDataTableMobileCardControls }) {
  const a = row.account;
  const stat = (label: string, value: React.ReactNode) => (
    <span className="flex items-baseline gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums text-foreground">{value}</span>
    </span>
  );
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="min-w-0">{controls.renderCell("account")}</div>
      {a ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {stat("Followers", formatCompact(a.followers))}
          {stat("Posts", a.postsTracked)}
          {stat("Last post", lastPostLabel(a.lastPostAt, a.postsTracked))}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="min-w-0">{controls.renderCell("tracking")}</div>
        <div className="ml-auto shrink-0">{controls.actions}</div>
      </div>
    </div>
  );
}

export function BrandSocialProfilesCard({
  brandId,
  brandSeg,
  organizationId,
  properties,
  canEdit,
  copy,
  onAdd,
  onEdit,
  onDelete,
}: {
  brandId: string;
  brandSeg: string;
  organizationId: string;
  /** The brand's non-website properties: edit / delete act on these by id. */
  properties: readonly BrandProperty[];
  /** The viewer's editor-level access to the brand: write and tracking controls show only then. */
  canEdit: boolean;
  copy?: React.ComponentProps<typeof SectionCard>["copy"];
  onAdd: () => void;
  onEdit: (property: BrandProperty) => void;
  onDelete: (property: BrandProperty) => void;
}) {
  const router = useRouter();
  const brandKind = useMarketingBrand().kind;
  const accounts = useBrandSocialAccounts(brandId);
  const { busyRow, progress, trackOwn, trackAllOwn } = useTrackOwn(organizationId, brandId);
  const invalidate = useInvalidateSocial();
  const { open: openCapture, node: captureNode } = useRefusedRead(organizationId, () => void invalidate());

  const untracked = (accounts.data ?? []).filter(trackableOwn);

  const rows = ((): ProfileRow[] => {
    const data = accounts.data ?? [];
    const byId = new Map(properties.map((p) => [p.id, p]));
    // Properties the social read does not carry (a business listing, "other"): listed, never tracked.
    const listed = new Set(data.map((r) => r.propertyId).filter(Boolean));
    return [
      ...data.map((r): ProfileRow => {
        const labels = accountLabels(r.displayName, r.handle, r.platform);
        return {
          id: r.rowId,
          account: r,
          property: r.propertyId ? (byId.get(r.propertyId) ?? null) : null,
          platform: r.platform,
          name: labels.primary,
          handle: labels.secondary ? formatSocialHandle({ platform: r.platform, handle: r.handle, url: r.profileUrl }) : "",
          tracking: trackingOf(r),
          href: brandAccountHref(brandSeg, r),
          externalUrl: r.externalUrl ?? null,
        };
      }),
      ...properties
        .filter((p) => !listed.has(p.id))
        .map((p): ProfileRow => ({
          id: `property:${p.id}`,
          account: null,
          property: p,
          platform: p.kind,
          name: p.display_name || platformLabel(p.kind),
          handle: "",
          tracking: "Listed",
          href: null,
          externalUrl: p.url || null,
        })),
    ];
  })();

  const columns: MatrxColumnDef<ProfileRow>[] = [
      {
        id: "account",
        label: "Account",
        header: "Account",
        width: 320,
        minWidth: 180,
        accessorFn: (r) => `${r.name} ${r.handle}`,
        copyValue: (r) => (r.handle ? `${r.name} (${r.handle})` : r.name),
        filter: "text",
        cell: (r) => {
          const a = r.account;
          const avatar =
            a?.profileId && a.avatarHint ? (
              <span className="relative h-7 w-7 shrink-0">
                <span className="relative block h-7 w-7 overflow-hidden rounded-full bg-muted">
                  <SocialImage
                    door={a.avatarFileId ? profileAvatarDoor(a.profileId) : null}
                    url={a.avatarHint}
                    fallback={<PropertyKindMark kind={a.platform} size={28} />}
                  />
                </span>
                <span className="absolute -bottom-1 -right-1">
                  <PlatformMark platform={a.platform} size={14} />
                </span>
              </span>
            ) : a ? (
              <PlatformMark platform={a.platform} size={28} />
            ) : (
              <PropertyKindMark kind={r.platform} size={28} />
            );
          // The handle is THE contact value (its own peek and copy), so it sits outside the row's link.
          const profileValue = a && r.handle ? (a.profileUrl || a.handle) : null;
          const handleValue = profileValue
            ? contactFactValue({ kind: "social_profile", value: profileValue, platform: a?.platform, className: "inline-flex min-w-0 text-xs" })
            : null;
          const nameLine = (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
              {a && showOwnerChip(a, brandKind) ? (
                <PersonOwnerChip canEdit={canEdit} propertyId={a.propertyId} ownerName={a.ownerName ?? null} organizationId={organizationId} brandId={brandId} />
              ) : null}
            </span>
          );
          const subLine =
            busyRow === r.id && progress ? (
              <span className="truncate text-xs text-primary">{progress}</span>
            ) : handleValue ? (
              <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <span className="shrink-0">{platformLabel(r.platform)} ·</span>
                {handleValue}
              </span>
            ) : (
              <span className="truncate text-xs text-muted-foreground">
                {[platformLabel(r.platform), r.handle || null].filter(Boolean).join(" · ")}
              </span>
            );
          const text = (
            <span className="flex min-w-0 flex-col leading-tight">
              {nameLine}
              {subLine}
            </span>
          );
          if (!r.href) {
            return (
              <span className="flex min-w-0 items-center gap-2.5">
                {avatar}
                {text}
              </span>
            );
          }
          if (!handleValue) {
            return (
              <Link href={r.href} className="block min-w-0 max-md:flex max-md:min-h-11 max-md:items-center" data-clickable="">
                <span className="flex min-w-0 items-center gap-2.5">
                  {avatar}
                  {text}
                </span>
              </Link>
            );
          }
          return (
            <span className="flex min-w-0 items-center gap-2.5 max-md:min-h-11">
              <Link href={r.href} className="shrink-0" data-clickable="" aria-label={r.name}>
                {avatar}
              </Link>
              <span className="flex min-w-0 flex-col leading-tight">
                <Link href={r.href} className="block min-w-0" data-clickable="">
                  {nameLine}
                </Link>
                {subLine}
              </span>
            </span>
          );
        },
      },
      {
        id: "platform",
        label: "Platform",
        header: "Platform",
        accessorFn: (r) => platformLabel(r.platform),
        hidden: true, // the platform name already sits under the account name; the column stays for filtering
        filter: "select",
      },
      {
        id: "tracking",
        label: "Tracking",
        header: "Tracking",
        width: 112,
        accessorFn: (r) => r.tracking,
        filter: "select",
        filterOptions: TRACKING_VALUES.map((v) => ({ value: v, label: v })),
        cell: (r) => {
          if (busyRow === r.id) return <span className="text-xs text-primary">Tracking…</span>;
          if (r.tracking === "Tracked") return <Badge tone="success">Tracked</Badge>;
          if (r.tracking === "Not tracked") {
            if (!canEdit) return <span className="text-muted-foreground">—</span>;
            const a = r.account;
            const read = a && (a.followers !== null || a.postsTracked > 0);
            return (
              <span title={read ? "Read once when the brand was set up. Track it to keep these numbers current." : undefined}>
                <Badge tone="warning">Not tracked</Badge>
              </span>
            );
          }
          const title =
            r.tracking === "Not supported"
              ? `${platformLabel(r.platform)} tracking is coming`
              : r.tracking === "Needs a handle"
                ? "Add the account handle to track it"
                : "Not a social profile";
          return <span className="text-xs text-muted-foreground" title={title}>{r.tracking}</span>;
        },
      },
      {
        id: "followers",
        label: "Followers",
        header: "Followers",
        width: 84,
        align: "right",
        accessorFn: (r) => r.account?.followers ?? null,
        filter: "number",
        cell: (r) => <span className="tabular-nums">{r.account ? formatCompact(r.account.followers) : "—"}</span>,
      },
      {
        id: "growth",
        label: "30d growth",
        header: "30d",
        width: 64,
        align: "right",
        accessorFn: (r) => r.account?.growth ?? null,
        copyValue: (r) => (r.account ? formatGrowth(r.account.growth) : ""),
        filter: "number",
        cell: (r) => (
          <span className="tabular-nums" title={r.account?.growthNote}>
            {r.account ? formatGrowth(r.account.growth) : "—"}
          </span>
        ),
      },
      {
        id: "posts",
        label: "Posts",
        header: "Posts",
        width: 64,
        align: "right",
        accessorFn: (r) => r.account?.postsTracked ?? null,
        filter: "number",
        cell: (r) => <span className="tabular-nums">{r.account ? r.account.postsTracked : "—"}</span>,
      },
      {
        id: "last_post",
        label: "Last post",
        header: "Last post",
        width: 104,
        accessorFn: (r) => r.account?.lastPostAt ?? null,
        copyValue: (r) => (r.account ? lastPostLabel(r.account.lastPostAt, r.account.postsTracked) : ""),
        filter: "date",
        cell: (r) =>
          r.account ? (
            <span className="whitespace-nowrap tabular-nums" title={r.account.lastPostAt ?? undefined}>
              {lastPostLabel(r.account.lastPostAt, r.account.postsTracked)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "best",
        label: "Best multiple (30d)",
        header: "Best 30d",
        hidden: true, // secondary: fits the table at desktop width; still in the Columns dialog
        width: 80,
        align: "right",
        accessorFn: (r) => r.account?.bestScore ?? null,
        copyValue: (r) => (r.account ? outlierBadgeModel(bestInput(r.account)).text : ""),
        filter: "number",
        cell: (r) => (r.account ? <OutlierBadge inTable input={bestInput(r.account)} /> : "—"),
      },
  ];

  // Every row draws the same slots in the same order; an action that does not apply is disabled in its
  // slot (never omitted), so the Actions column lines up row to row.
  const rowActions = (r: ProfileRow): MatrxTableIconAction[] => {
    const a = r.account;
    const actions: MatrxTableIconAction[] = [];
    // Never read (no profile, or tracked with nothing in it): the person's own browser can still get it.
    const canCapture = Boolean(
      a && GUIDED_CAPTURE_PLATFORMS.has(a.platform) && (!a.profileId || (a.trackedAccountId && a.postsTracked === 0)),
    );
    const captureAction: MatrxTableIconAction = {
      id: "capture",
      icon: Globe,
      label: "Capture with my browser",
      tooltip: canCapture ? "Capture with my browser" : "Nothing to capture",
      disabled: !canCapture || busyRow !== null,
      onClick: () => {
        if (!a || !canCapture) return;
        openCapture({
          platform: a.platform,
          handleOrUrl: a.profileUrl || a.externalUrl || a.handle,
          ...(a.profileId ? { profileId: a.profileId } : {}),
          ...(a.trackedAccountId ? { trackedAccountId: a.trackedAccountId } : {}),
          ...(a.propertyId ? { propertyId: a.propertyId } : {}),
          brandId,
        });
      },
    };
    if (canEdit) {
      const canTrack = Boolean(a && r.tracking === "Not tracked");
      actions.push({
        id: "track",
        icon: UserPlus,
        label: "Track",
        tooltip: canTrack ? "Track as Own" : a ? "Already tracked" : "No account to track",
        loading: busyRow === r.id,
        disabled: !canTrack || busyRow !== null,
        onClick: () => {
          if (a && canTrack) void trackOwn(a);
        },
      });
    }
    const url = r.externalUrl;
    actions.push({
      id: "external",
      icon: ExternalLink,
      label: url ? (a ? `Open on ${platformLabel(r.platform)}` : "Open link") : "No link to open",
      disabled: !url,
      onClick: () => {
        if (url) void openOutbound(url, "_blank", "noopener");
      },
    });
    const property = r.property;
    if (canEdit) {
      actions.push(
        {
          id: "edit",
          icon: Pencil,
          label: property ? "Edit property" : "No property to edit",
          disabled: !property,
          onClick: () => {
            if (property) onEdit(property);
          },
        },
        captureAction,
        {
          id: "delete",
          icon: Trash2,
          label: property ? "Delete property" : "No property to delete",
          tone: "destructive",
          disabled: !property,
          onClick: () => {
            if (property) onDelete(property);
          },
        },
      );
    }
    return actions;
  };

  return (
    <SectionCard
      title="Social profiles"
      copy={copy}
      action={canEdit ? { label: "Add property", onClick: onAdd } : undefined}
      headerExtra={
        <>
          {canEdit && untracked.length > 1 ? (
            <Button
              variant="outline"
              icon={<UserPlus />}
              disabled={busyRow !== null}
              title={"Track every profile not tracked yet"}
              onClick={() => void trackAllOwn(untracked)}
            >
              {busyRow === "bulk" ? "Tracking…" : `Track all (${untracked.length})`}
            </Button>
          ) : null}
          <Button variant="quiet" asChild>
            <Link href={marketingRoutes.brandSocials(brandSeg)}>Open Socials</Link>
          </Button>
        </>
      }
    >
      <MatrxDataTable<ProfileRow>
        tableId="marketing-brand-social-profiles"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        appearance="embedded"
        density="condensed"
        viewTabs={false}
        pageSize={0}
        {...NO_RAW_ROW_WINDOW}
        onRowOpen={(r) => {
          if (r.href) router.push(r.href);
        }}
        mobileCardsBreakpoint="md"
        mobileCards={(r, _i, controls) => <ProfileCard row={r} controls={controls} />}
        isLoading={accounts.isLoading}
        isFetching={accounts.isFetching}
        read={{
          status: accounts.isError ? "error" : accounts.isLoading ? "loading" : "ready",
          error: accounts.error ?? undefined,
          onRetry: () => void accounts.refetch(),
        }}
        toolbar={{ searchPlaceholder: "Search profiles…", singleRow: true }}
        rowActions={rowActions}
        rowActionsInline={3}
        emptyState={{
          title: "No social profiles yet",
          action: canEdit ? (
            <Button variant="outline" onClick={onAdd}>
              Add property
            </Button>
          ) : undefined,
        }}
      />
      {captureNode}
    </SectionCard>
  );
}
