"use client";

/**
 * Accounts (UI-SPEC §3): the brand's own accounts and the competitor /
 * inspiration accounts it tracks, in ONE `MatrxDataTable`. One column
 * per sortable/filterable value; Role filters as a column, so "group by role"
 * is the table's own filter + drill-down, not a hand-built grouping.
 *
 * Row actions are declared once (`rowActionDefs`): every row carries the same strip in the same
 * order, an action that does not apply drawn disabled in its slot. Refresh all sits in the toolbar.
 * Above the table, `AccountsOverview` shows the brand's KPIs, platforms, competitors and top posts.
 * Role is editable inline (Layer B edit under RLS).
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSurfaceRuntimeRegistration, useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { collectionWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { parseCreateAccounts, parseUpdateAccounts } from "../agent-writes";
import { sumCostFigures, useSocialSpend } from "../cost";
import { countOf, withCostOn } from "../social-actions";
import { xmlElement, xmlList } from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import { createSocialAccountsScope, SOCIAL_ACCOUNTS_SURFACE_NAME } from "@/features/surfaces/manifests/marketing-social-accounts.manifest";
import { useMemo, useState, type ReactNode } from "react";
import { Activity, Globe, Link2, Plus, RefreshCw, Trash2, UserCog, UserPlus } from "lucide-react";

import {
  Badge,
  Button,
  Select,
  type SelectOption,
} from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type {
  MatrxColumnDef,
  MatrxDataTableMobileCardControls,
  MatrxTableRowActionDef,
} from "@ai-matrx/design-system/data-table/types";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { recordToast, toast } from "@/lib/toast";
import { useRefusedRead } from "../gated/RefusedReadOffer";
import { GUIDED_CAPTURE_PLATFORMS } from "../gated/guidedJob";

import { useAccountRows, useInvalidateSocial } from "../hooks";
import { CONNECTION_STATE_LABELS, CONNECTION_STATE_TONES } from "../connection-state";
import { useConnectionStates } from "../useConnectionStates";
import { frequencyLabel, useConnectedPlans } from "../useConnectedPlans";
import {
  accountLabels,
  accountName,
  formatGrowth,
  lastPostLabel,
  refreshSummary,
  relativeAge,
  showOwnerChip,
} from "../mappers";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { formatCompact, formatPercentile, outlierBadgeModel } from "../outlier";
import {
  refreshConnectedAccount,
  refreshProfile,
  setConnectedFrequency,
  socialErrorCode,
  socialErrorMessage,
  trackAccount,
  untrackAccount,
} from "../server";
import { setTrackedRole } from "../service";
import {
  SOCIAL_PLATFORM_LABELS,
  TRACKED_ROLES,
  TRACKED_ROLE_LABELS,
  TRACKABLE_PLATFORMS,
  isSocialPlatform,
  type AccountRow,
  type TrackedRole,
} from "../types";
import { PersonOwnerChip } from "../../components/brands/PersonOwnerChip";
import { AccountOwnerDialog } from "../../components/brands/AccountOwnerDialog";
import { socialRowOpen } from "../row-open";
import { accountHref } from "../account-href";
import { brandAccountHref } from "../property-account-href";
import { AccountSummary } from "./AccountSummary";
import { AccountsOverview } from "./AccountsOverview";
import { OutlierBadge } from "./OutlierBadge";
import { PlatformMark } from "./PlatformMark";
import { ConnectAccountMenu, useStartConnection } from "./ConnectAccountMenu";
import { CONNECTION_RETURN_PARAMS, ManageConnectionsDialog } from "./ManageConnectionsDialog";
import { useSocials } from "./SocialsContext";
import { privateTrackingLine } from "../tracking-privacy";
import { trackableOwn, useTrackOwn } from "./useTrackOwn";
import { formatSocialHandle } from "@/features/marketing/lib/social-handle";
import { fetchOutcomeText } from "./FetchLines";
import { COUNT_UNREADABLE_MESSAGE, rememberedMaxPosts, rememberedMaxPostsPlain, resolveCount, usePostCount, useProfilePostsMax } from "../post-count";
import { PostCountControl } from "./PostCountControl";

const ROLE_OPTIONS: SelectOption<TrackedRole>[] = TRACKED_ROLES.map((r) => ({
  value: r,
  label: TRACKED_ROLE_LABELS[r],
}));

export { accountHref };

/** A phone's row: who it is and the numbers that matter, with the table's own actions. */
function AccountCard({
  row: r,
  controls,
}: {
  row: AccountRow;
  controls: MatrxDataTableMobileCardControls;
}) {
  const stat = (label: string, value: ReactNode) => (
    <span className="flex items-baseline gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums text-foreground">{value}</span>
    </span>
  );
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="min-w-0">{controls.renderCell("account")}</div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {stat("Followers", formatCompact(r.followers))}
        {stat("30d", formatGrowth(r.growth))}
        {stat("Posts", r.postsTracked)}
        {stat("Best", <OutlierBadge inTable input={{ score: r.bestScore, baselineViews: null, percentile: null, baselineWindow: null, ageHours: null, accountPosts: r.postsTracked }} />)}
        {stat("Last post", lastPostLabel(r.lastPostAt, r.postsTracked))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* One chip, the table's own Status: tracking first, then a non-own role, then the connection. */}
        <div className="min-w-0">{controls.renderCell("status")}</div>
        <div className="ml-auto shrink-0">{controls.actions}</div>
      </div>
    </div>
  );
}

export function AccountsTab() {
  const { brandId, brandSeg, organizationId, openTrack, canEdit } = useSocials();
  const brand = useMarketingBrand();
  const brandKind = brand.kind;
  const router = useRouter();
  const searchParams = useSearchParams();
  // A provider's consent sends the person back here: its follow-up steps (pick the account) live in the hub.
  const [manageOpen, setManageOpen] = useState(() => CONNECTION_RETURN_PARAMS.some((k) => searchParams?.has(k)));
  const [summaryRow, setSummaryRow] = useState<AccountRow | null>(null);
  const [ownerRow, setOwnerRow] = useState<AccountRow | null>(null);
  const accounts = useAccountRows(organizationId, brandId);
  const connections = useConnectionStates(organizationId);
  const plans = useConnectedPlans(organizationId, canEdit);
  const invalidate = useInvalidateSocial();
  const {
    busyRow,
    progress,
    setBusyRow,
    trackOwn,
    trackOwnRow,
    trackAllOwn,
    refreshAllOwn,
  } = useTrackOwn(organizationId, brandId);
  const { agentCost, confirmPosts } = useSocialSpend(organizationId);
  const { choice: countChoice } = usePostCount();
  const postsMax = useProfilePostsMax();
  const askedPosts = resolveCount(countChoice, postsMax.value);

  const {
    show: showRefused,
    open: openCapture,
    node: captureNode,
  } = useRefusedRead(organizationId, () => void invalidate());
  const [refusedRows, setRefusedRows] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const captureTarget = (row: AccountRow) => ({
    platform: row.platform,
    handleOrUrl: row.profileUrl || row.handle,
    ...(row.profileId ? { profileId: row.profileId } : {}),
    ...(row.trackedAccountId ? { trackedAccountId: row.trackedAccountId } : {}),
    ...(row.propertyId ? { propertyId: row.propertyId } : {}),
    brandId,
  });

  async function refresh(row: AccountRow) {
    if (!row.profileId) return;
    let n: number;
    try {
      n = await rememberedMaxPosts();
    } catch {
      toast.error(COUNT_UNREADABLE_MESSAGE);
      return;
    }
    const ok = await confirmPosts(row.platform, n, {
      title: `Refresh ${accountName(row)}?`,
      confirmLabel: "Refresh",
    });
    if (!ok) return;
    setBusyRow(row.rowId);
    try {
      const result = await refreshProfile(
        row.profileId,
        { maxPosts: n },
        { organizationId },
      );
      await invalidate();
      toast.success(fetchOutcomeText(refreshSummary(result), result));
    } catch (err) {
      setRefusedRows((prev) => new Set(prev).add(row.rowId));
      if (!showRefused(err, captureTarget(row)))
        toast.error(socialErrorMessage(err, "Refresh failed"));
    } finally {
      setBusyRow(null);
    }
  }

  async function remove(row: AccountRow) {
    if (!row.trackedAccountId) return;
    const ok = await confirm({
      title: `Stop tracking ${accountName(row)}?`,
      description:
        "Archives this tracked account for your organization. Saved posts and history stay in the shared cache.",
      confirmLabel: "Stop tracking",
      variant: "destructive",
    });
    if (!ok) return;
    setBusyRow(row.rowId);
    try {
      await untrackAccount(row.trackedAccountId, { organizationId });
      await invalidate();
      toast.success("Account removed");
    } catch (err) {
      toast.error(socialErrorMessage(err, "Couldn't remove the account"));
    } finally {
      setBusyRow(null);
    }
  }

  /** An own account attached through a connection, not yet on this brand: link it (property + brand). */
  async function addToBrand(row: AccountRow) {
    if (!row.profileId) return;
    setBusyRow(row.rowId);
    try {
      await trackAccount(
        { profileId: row.profileId, role: "own", brandId, pages: 0, allowEmpty: true },
        { organizationId },
      );
      await invalidate();
      recordToast.success(
        { type: "social_profile", id: row.profileId, title: accountName(row) },
        `${accountName(row)} added to ${brand.name}`,
      );
    } catch (err) {
      toast.error(socialErrorMessage(err, "Couldn't add the account to this brand"));
    } finally {
      setBusyRow(null);
    }
  }

  /** Refresh on click: an own account read once through its connection (profile, today's figures, posts, private per-post figures). */
  async function syncConnection(row: AccountRow) {
    if (!row.trackedAccountId) return;
    setBusyRow(row.rowId);
    try {
      const done = await refreshConnectedAccount(row.trackedAccountId, { organizationId });
      await invalidate();
      const missing = Object.values(done.not_granted ?? {});
      toast.success("Refreshed");
      if (missing.length) toast.info(missing.join(" "));
    } catch (err) {
      toast.error(socialErrorMessage(err, "Couldn't refresh the account"));
    } finally {
      setBusyRow(null);
    }
  }

  /** How often a free connected account updates automatically (0 = Off). Paid reads have no choice: Refresh only. */
  async function changeFrequency(row: AccountRow, hours: number) {
    if (!row.trackedAccountId) return;
    setBusyRow(row.rowId);
    try {
      await setConnectedFrequency(row.trackedAccountId, hours, { organizationId });
      await invalidate();
      toast.success(`Updates: ${frequencyLabel(hours)}`);
    } catch (err) {
      toast.error(socialErrorMessage(err, "Couldn't change updates"));
    } finally {
      setBusyRow(null);
    }
  }

  const startConnect = useStartConnection(organizationId, brandSeg, () => setManageOpen(true));

  async function changeRole(row: AccountRow, role: TrackedRole) {
    if (!row.trackedAccountId || role === row.role) return;
    try {
      await setTrackedRole(row.trackedAccountId, role);
      await invalidate();
    } catch (err) {
      toast.error(socialErrorMessage(err, "Couldn't change the role"));
    }
  }

  /** An own account's connection state (competitors and inspiration are read-only follows: no connection). */
  const connectionOf = (r: AccountRow) => {
    if (r.role !== "own") return null;
    const c = connections.of(r.platform);
    return c ? { ...c, label: CONNECTION_STATE_LABELS[c.state], tone: CONNECTION_STATE_TONES[c.state] } : null;
  };

  const columns = useMemo<MatrxColumnDef<AccountRow>[]>(
    () => [
      {
        id: "account",
        width: 170,
        label: "Account",
        header: "Account",
        accessorFn: (r) =>
          `${r.displayName} ${formatSocialHandle({ platform: r.platform, handle: r.handle, url: r.profileUrl })}`,
        copyValue: (r) =>
          `${r.displayName} (${formatSocialHandle({ platform: r.platform, handle: r.handle, url: r.profileUrl })})`,
        filter: "text",
        minWidth: 160,
        cell: (r) => {
          const href = brandAccountHref(brandSeg, r);
          const labels = accountLabels(r.displayName, r.handle, r.platform);
          const platformName = isSocialPlatform(r.platform)
            ? SOCIAL_PLATFORM_LABELS[r.platform]
            : r.platform;
          const body = (
            <span className="flex min-w-0 items-center gap-2">
              <PlatformMark platform={r.platform} size={20} />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {labels.primary}
                  </span>
                  {showOwnerChip(r, brandKind) ? (
                    <span className="shrink-0"><Badge>Personal</Badge></span>
                  ) : null}
                  {showOwnerChip(r, brandKind) ? (
                    <PersonOwnerChip
                      canEdit={canEdit}
                      propertyId={r.propertyId ?? null}
                      ownerName={r.ownerName ?? null}
                      organizationId={organizationId}
                      brandId={brandId}
                    />
                  ) : null}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[
                    platformName,
                    labels.secondary
                      ? formatSocialHandle({
                          platform: r.platform,
                          handle: r.handle,
                          url: r.profileUrl,
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </span>
          );
          return href ? (
            <Link href={href} className="block min-w-0 max-md:flex max-md:min-h-11 max-md:items-center" data-clickable="">
              {body}
            </Link>
          ) : (
            body
          );
        },
      },
      {
        id: "platform",
        label: "Platform",
        header: "Platform",
        accessorKey: "platform",
        copyValue: (r) =>
          isSocialPlatform(r.platform)
            ? SOCIAL_PLATFORM_LABELS[r.platform]
            : r.platform,
        hidden: true, // the platform name already sits under the account name; the column stays for filtering
        filter: "select",
        filterOptions: Object.entries(SOCIAL_PLATFORM_LABELS).map(
          ([value, label]) => ({ value, label }),
        ),
        cell: (r) =>
          isSocialPlatform(r.platform)
            ? SOCIAL_PLATFORM_LABELS[r.platform]
            : r.platform,
      },
      {
        id: "role",
        width: 124,
        hidden: true, // the Status column names a non-own role; the column stays for filtering and editing
        label: "Role",
        header: "Role",
        accessorKey: "role",
        copyValue: (r) => TRACKED_ROLE_LABELS[r.role],
        filter: "select",
        filterOptions: TRACKED_ROLES.map((r) => ({
          value: r,
          label: TRACKED_ROLE_LABELS[r],
        })),
        cell: (r) =>
          r.trackedAccountId ? (
            <Select
              aria-label={`Role for ${accountName(r)}`}
              value={r.role}
              options={ROLE_OPTIONS}
              onValueChange={(v) => void changeRole(r, v)}
            />
          ) : (
            TRACKED_ROLE_LABELS[r.role]
          ),
      },
      {
        id: "connection",
        width: 108,
        hidden: true, // shown beside the account name; the column stays for filtering
        label: "Connection",
        header: "Connection",
        accessorFn: (r) => connectionOf(r)?.label ?? "",
        filter: "select",
        filterOptions: [...new Set(Object.values(CONNECTION_STATE_LABELS))].map((label) => ({ value: label, label })),
        cell: (r) => {
          const c = connectionOf(r);
          return c ? <Badge tone={c.tone}>{c.label}</Badge> : null;
        },
      },
      {
        id: "updates",
        width: 128,
        label: "Updates",
        header: "Updates",
        accessorFn: (r) => {
          const plan = r.trackedAccountId ? plans.byTracked.get(r.trackedAccountId) : undefined;
          return plan ? (plan.automatic ? frequencyLabel(plan.frequency_hours) : "Refresh only") : "";
        },
        filter: "select",
        filterOptions: ["Off", "Every hour", "Every 6 hours", "Every 12 hours", "Daily", "Refresh only"].map((l) => ({ value: l, label: l })),
        cell: (r) => {
          const plan = r.trackedAccountId ? plans.byTracked.get(r.trackedAccountId) : undefined;
          if (!plan) return null;
          if (!plan.automatic) {
            return (
              <span className="text-muted-foreground" title="This account updates only when you click Refresh">
                Refresh only
              </span>
            );
          }
          if (!canEdit) return frequencyLabel(plan.frequency_hours);
          return (
            <Select
              aria-label={`Updates for ${accountName(r)}`}
              value={String(plan.frequency_hours)}
              options={plan.frequency_options.map((h) => ({ value: String(h), label: frequencyLabel(h) }))}
              disabled={busyRow !== null || (!plan.connected && plan.frequency_hours === 0)}
              onValueChange={(v) => void changeFrequency(r, Number(v))}
            />
          );
        },
      },
      {
        id: "followers",
        width: 72,
        label: "Followers",
        header: "Followers",
        accessorFn: (r) => r.followers,
        align: "right",
        filter: "number",
        cell: (r) => (
          <span className="tabular-nums">{formatCompact(r.followers)}</span>
        ),
      },
      {
        id: "growth",
        width: 64,
        label: "30d growth",
        header: "30d",
        accessorFn: (r) => r.growth,
        copyValue: (r) => formatGrowth(r.growth),
        align: "right",
        filter: "number",
        cell: (r) => (
          <span className="tabular-nums" title={r.growthNote}>
            {formatGrowth(r.growth)}
          </span>
        ),
      },
      {
        id: "posts",
        width: 60,
        label: "Posts tracked",
        header: "Posts",
        accessorFn: (r) => r.postsTracked,
        align: "right",
        filter: "number",
        cell: (r) =>
          r.trackedAccountId && r.postsTracked === 0 ? (
            <span title="No posts stored for this account. Check the handle, or Refresh.">
              <Badge tone="warning">No posts</Badge>
            </span>
          ) : (
            <span className="tabular-nums">{r.postsTracked}</span>
          ),
      },
      {
        id: "best",
        width: 72,
        label: "Best multiple",
        header: "Best",
        accessorFn: (r) => r.bestScore,
        copyValue: (r) =>
          outlierBadgeModel({
            score: r.bestScore,
            baselineViews: null,
            percentile: null,
            baselineWindow: null,
            ageHours: null,
            accountPosts: r.postsTracked,
          }).text,
        align: "right",
        filter: "number",
        cell: (r) => (
          <OutlierBadge
            inTable
            input={{
              score: r.bestScore,
              baselineViews: null,
              percentile: null,
              baselineWindow: null,
              ageHours: null,
              accountPosts: r.postsTracked,
            }}
          />
        ),
      },
      {
        id: "last_post",
        width: 84,
        label: "Last post",
        header: "Last post",
        accessorFn: (r) => r.lastPostAt,
        filter: "date",
        copyValue: (r) => lastPostLabel(r.lastPostAt, r.postsTracked),
        cell: (r) => (
          <span
            className="tabular-nums"
            title={r.lastPostAt ?? "No post date stored"}
          >
            {lastPostLabel(r.lastPostAt, r.postsTracked)}
          </span>
        ),
      },
      {
        id: "status",
        width: 100,
        label: "Status",
        header: "Status",
        accessorKey: "status",
        filter: "select",
        // One badge says what matters most: tracking first, then a non-own role, then where the connection stands.
        cell: (r) => {
          if (busyRow === r.rowId && !r.trackedAccountId) return <span className="text-primary">{progress ?? "Tracking…"}</span>;
          if (r.status === "not_tracked") return canEdit ? <Badge tone="warning">Not tracked</Badge> : <span title={privateTrackingLine(brand.name)}>—</span>;
          if (r.status !== "active") return r.status;
          if (r.role !== "own") return <Badge tone="neutral">{TRACKED_ROLE_LABELS[r.role]}</Badge>;
          const c = connectionOf(r);
          return c ? <Badge tone={c.tone}>{c.label}</Badge> : "Active";
        },
      },
      {
        id: "refreshed",
        label: "Last refreshed",
        header: "Refreshed",
        accessorFn: (r) => r.lastRefreshedAt,
        filter: "date",
        hidden: true,
        cell: (r) => relativeAge(r.lastRefreshedAt),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brandSeg, organizationId, brandId, brandKind, busyRow, progress, connections.data, canEdit, plans.byTracked],
  );

  // A fixed order that does not depend on anything tracking changes (followers, name): tracking an
  // account never moves its row. Only the person's own column sort re-orders.
  const rows = useMemo(
    () =>
      [...(accounts.data ?? [])].sort(
        (a, b) =>
          a.platform.localeCompare(b.platform) ||
          a.handle.localeCompare(b.handle),
      ),
    [accounts.data],
  );
  const untrackedOwn = rows.filter(trackableOwn);
  const refreshable = rows.filter((r) => r.trackedAccountId && r.profileId);
  const oldestRefresh = refreshable.map((r) => r.lastRefreshedAt).filter((d): d is string => Boolean(d)).sort()[0] ?? null;

  // One fixed strip per row: every action keeps its slot on every row and is drawn disabled where
  // it does not apply (or for a viewer), so the column lines up and nothing appears or vanishes.
  const blocked = () => !canEdit || busyRow !== null;
  const ownConnection = (r: AccountRow) => (r.role === "own" ? connections.of(r.platform) : null);
  const canCapture = (r: AccountRow) =>
    GUIDED_CAPTURE_PLATFORMS.has(r.platform) &&
    (!r.profileId || refusedRows.has(r.rowId) || (r.status !== "active" && r.status !== "not_tracked"));
  const rowActionDefs: MatrxTableRowActionDef<AccountRow>[] = [
    {
      id: "refresh",
      icon: RefreshCw,
      label: "Refresh posts",
      tooltip: ["Refresh posts", askedPosts ? `${askedPosts} posts` : null].filter(Boolean).join(" · "),
      unavailableTooltip: "Track the account first",
      appliesTo: (r) => Boolean(r.trackedAccountId && r.profileId),
      loading: (r) => busyRow === r.rowId,
      disabled: blocked,
      onClick: (r) => void refresh(r),
    },
    {
      id: "track",
      icon: UserPlus,
      label: "Track as Own",
      unavailableTooltip: "Already tracked, or not supported yet",
      appliesTo: (r) => !r.trackedAccountId && trackableOwn(r),
      loading: (r) => busyRow === r.rowId && !r.trackedAccountId,
      disabled: blocked,
      onClick: (r) => void trackOwn(r),
    },
    {
      id: "sync-connection",
      icon: Activity,
      label: "Refresh private stats",
      unavailableTooltip: "Own accounts with a live connection only",
      appliesTo: (r) =>
        r.role === "own" && Boolean(r.trackedAccountId) && !r.unassigned && ownConnection(r)?.state === "connected",
      disabled: blocked,
      onClick: (r) => void syncConnection(r),
    },
    {
      id: "connect",
      icon: Link2,
      label: "Connect",
      tooltip: "Connect or reconnect for private stats",
      unavailableTooltip: "Already connected, or own accounts only",
      appliesTo: (r) => {
        const c = ownConnection(r);
        return Boolean(c && c.canConnect && c.state !== "connected");
      },
      disabled: blocked,
      onClick: (r) => {
        const c = ownConnection(r);
        if (c) startConnect(c);
      },
    },
    {
      id: "add-to-brand",
      icon: Plus,
      label: `Add to ${brand.name}`,
      unavailableTooltip: "Already on this brand",
      appliesTo: (r) => Boolean(r.unassigned && r.profileId),
      disabled: blocked,
      onClick: (r) => void addToBrand(r),
    },
    {
      id: "owner",
      icon: UserCog,
      label: "Whose account",
      tooltip: "Whose account: the brand's or a person's",
      unavailableTooltip: "Own accounts on this brand only",
      appliesTo: (r) => r.role === "own" && Boolean(r.propertyId) && !r.unassigned,
      disabled: blocked,
      onClick: (r) => setOwnerRow(r),
    },
    {
      id: "capture",
      icon: Globe,
      label: "Capture with my browser",
      tooltip: "Can't be read the usual way? Your own browser still can.",
      unavailableTooltip: "Not needed: this account reads normally",
      appliesTo: canCapture,
      disabled: blocked,
      onClick: (r) => openCapture(captureTarget(r)),
    },
    {
      id: "remove",
      icon: Trash2,
      label: "Stop tracking",
      tone: "destructive",
      unavailableTooltip: "Not tracked",
      appliesTo: (r) => Boolean(r.trackedAccountId),
      disabled: blocked,
      onClick: (r) => void remove(r),
    },
  ];

  // The agent surface: built from the rows already on screen (never a fetch).
  const surfaceScope = () =>
    createSocialAccountsScope(
      accounts.isError
        ? {
            accounts_loaded: false,
            load_error: socialErrorMessage(accounts.error, "Could not read the accounts."),
            brand_id: brandId,
            brand_name: brand.name,
            brand_kind: brandKind,
          }
        : accounts.isLoading
          ? ({ accounts_loaded: false, brand_id: brandId, brand_name: brand.name, brand_kind: brandKind } as never)
          : {
              accounts_loaded: true,
              brand_id: brandId,
              brand_name: brand.name,
              brand_kind: brandKind,
              account_count: rows.length,
              accounts_by_role: Object.fromEntries(
                TRACKED_ROLES.map((r) => [r, rows.filter((x) => x.role === r).length]),
              ),
              untracked_own_count: untrackedOwn.length,
              account_list: xmlList(
                "accounts",
                rows,
                (r) =>
                  xmlElement("account", {
                    id: r.profileId ?? r.rowId,
                    platform: r.platform,
                    handle: r.handle,
                    name: r.displayName,
                    role: r.role,
                    status: r.status,
                    followers: r.followers,
                    growth: r.growth === null ? null : formatGrowth(r.growth),
                    posts: r.postsTracked,
                    best_multiple: r.bestScore,
                    has_page: accountHref(brandSeg, r) !== null,
                  }),
                { maxRows: 40, attrs: { brand: brand.name, total: rows.length } },
              ),
              accounts: rows.map((r) => ({
                row_id: r.rowId,
                profile_id: r.profileId,
                platform: r.platform,
                handle: r.handle,
                display_name: r.displayName,
                role: r.role,
                status: r.status,
                followers: r.followers,
                growth: r.growth,
                posts_tracked: r.postsTracked,
                best_multiple: r.bestScore,
                last_post_at: r.lastPostAt,
                last_refreshed_at: r.lastRefreshedAt,
                has_page: accountHref(brandSeg, r) !== null,
              })),
            },
    );
  useSurfaceRuntimeRegistration({ surfaceName: SOCIAL_ACCOUNTS_SURFACE_NAME, getScope: surfaceScope, isEditable: true });

  // Agent writes: Track an account (the Track dialog's handle-or-link save), Track as Own, Stop
  // tracking, role change and Refresh — the same saves as the buttons, each approved on a card
  // first; anything that spends points names them before it runs (confirmSpend).
  const accountWrites = collectionWriteHandlers(
      {
        plural: "accounts",
        singular: "account",
        create: {
          parse: (value) => parseCreateAccounts(value),
          run: async (plan) => {
            const result = await trackAccount(
              { handleOrUrl: plan.handleOrUrl, platform: plan.platform, role: plan.role, brandId, maxPosts: await rememberedMaxPostsPlain() },
              { organizationId },
            );
            await invalidate();
            return { id: result.tracked_account_id, name: result.created ? plan.label : `${plan.label} (already tracked)` };
          },
          nameOf: (plan) => plan.label,
          refusalFor: (err, savedSoFar) =>
            err instanceof Error && err.message.startsWith("The person declined") && savedSoFar === 0 ? err.message : undefined,
        },
        update: {
          parse: (value) => parseUpdateAccounts(value, rows),
          run: async (plan) => {
            const { row } = plan;
            if (plan.tracked === false && row.trackedAccountId) await untrackAccount(row.trackedAccountId, { organizationId });
            if (plan.tracked === true) {
              if ((await trackOwnRow(row)) !== "ok") throw new Error(`${plan.label} could not be tracked.`);
            }
            if (plan.role && row.trackedAccountId) await setTrackedRole(row.trackedAccountId, plan.role);
            if (plan.refresh && row.profileId) {
              await refreshProfile(row.profileId, { maxPosts: await rememberedMaxPostsPlain() }, { organizationId });
            }
            await invalidate();
            return { id: row.rowId, name: plan.label };
          },
          nameOf: (plan) => plan.label,
          changedOf: (plan) => plan.changed,
          refusalFor: (err, savedSoFar) =>
            err instanceof Error && err.message.startsWith("The person declined") && savedSoFar === 0 ? err.message : undefined,
        },
      },
      refuseSurfaceWrite,
    );
  // The approval card names the points, however small: one track per account, one page per refresh.
  const flagged = (key: string) => (value: unknown) =>
    countOf(value, (item) => !!item && typeof item === "object" && (item as Record<string, unknown>)[key] === true);
  const accountCost = withCostOn(() => accountWrites);
  useSurfaceWriteHandlers(SOCIAL_ACCOUNTS_SURFACE_NAME, {
    ...accountWrites,
    ...accountCost("create_accounts", (value) => agentCost("track", countOf(value))),
    ...accountCost("update_accounts", (value) =>
      sumCostFigures([agentCost("track", flagged("tracked")(value)), agentCost("profile_page", flagged("refresh")(value))]),
    ),
  });

  return (
    <>
      <AccountOwnerDialog account={ownerRow} organizationId={organizationId} onClose={() => setOwnerRow(null)} />
      <ManageConnectionsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        organizationId={organizationId}
        brandId={brandId}
        brandSeg={brandSeg}
        onChanged={() => void invalidate()}
      />
      <AccountsOverview rows={rows} rowsLoading={accounts.isLoading} />
      <MatrxDataTable<AccountRow>
        tableId="marketing-social-accounts"
        urlState={{ id: "social-accounts" }}
        data={rows}
        columns={columns}
        getRowId={(r) => r.rowId}
        {...socialRowOpen<AccountRow>((r) => {
          // A row opens what it is: its account page when it has one, else a designed summary (never raw fields).
          const href = brandAccountHref(brandSeg, r);
          if (href) router.push(href);
          else setSummaryRow(r);
        })}
        mobileCardsBreakpoint="md"
        mobileCards={(r, _i, controls) => <AccountCard row={r} controls={controls} />}
        isLoading={accounts.isLoading}
        isFetching={accounts.isFetching}
        read={{
          status: accounts.isError
            ? "error"
            : accounts.isLoading
              ? "loading"
              : "ready",
          error: accounts.error ?? undefined,
          onRetry: () => void accounts.refetch(),
        }}
        toolbar={{
          searchPlaceholder: "Search accounts…",
          // A fixed set: each control keeps its place and is disabled, never removed, when it cannot act.
          actions: (
            <div className="flex flex-wrap items-center gap-2">
              {busyRow === "bulk-refresh" && progress ? (
                <span className="text-xs text-primary">{progress}</span>
              ) : oldestRefresh ? (
                <span className="text-xs text-muted-foreground" title="The least recently refreshed account">
                  Oldest refresh {relativeAge(oldestRefresh)}
                </span>
              ) : null}
              <PostCountControl organizationId={organizationId} disabled={!canEdit || busyRow !== null} />
              {canEdit ? (
                <ConnectAccountMenu
                  organizationId={organizationId}
                  start={startConnect}
                  onManage={() => setManageOpen(true)}
                />
              ) : null}
              <Button
                variant="outline"
                icon={<UserPlus />}
                disabled={!canEdit || busyRow !== null || untrackedOwn.length === 0}
                title={untrackedOwn.length ? "Track every own account not tracked yet" : "Every own account is tracked"}
                onClick={() => void trackAllOwn(untrackedOwn)}
              >
                {busyRow === "bulk" ? "Tracking…" : `Track all own (${untrackedOwn.length})`}
              </Button>
              <Button
                variant="primary"
                icon={<RefreshCw />}
                disabled={!canEdit || busyRow !== null || refreshable.length === 0}
                title={refreshable.length ? `Fetch new posts for all ${refreshable.length} tracked accounts` : "No tracked accounts yet"}
                onClick={() => void refreshAllOwn(refreshable)}
              >
                {busyRow === "bulk-refresh" ? "Refreshing…" : `Refresh all (${refreshable.length})`}
              </Button>
            </div>
          ),
        }}
        rowActionDefs={rowActionDefs}
        emptyState={{
          title: "No accounts yet",
          description: "Paste a profile link",
          action: canEdit ? (
            <Button variant="primary" icon={<Plus />} onClick={openTrack}>
              Track account
            </Button>
          ) : undefined,
        }}
      />
      {captureNode}
      <AccountSummary
        row={summaryRow}
        onClose={() => setSummaryRow(null)}
        canTrack={
          summaryRow !== null &&
          trackableOwn(summaryRow) &&
          !summaryRow.trackedAccountId
        }
        tracking={summaryRow !== null && busyRow === summaryRow.rowId}
        onTrack={(row) => void trackOwn(row).then(() => setSummaryRow(null))}
      />
    </>
  );
}
