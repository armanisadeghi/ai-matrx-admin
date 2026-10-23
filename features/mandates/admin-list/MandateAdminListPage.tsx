"use client";

// features/mandates/admin-list/MandateAdminListPage.tsx
//
// /administration/intelligence/mandates — the NEW admin mandate list, built
// beside the original console (since removed, its capabilities carried over
// untouched) on the canonical `EntityListPage`.
//
// TWO PAGES, ONE COMPONENT (Arman, 2026-09-26 — asked five times):
//   lane "system"   /administration/intelligence/mandates — THE management
//                   page: creating, editing, binding and updating the SYSTEM
//                   mandates. No scope tabs, no owner column, no org or person
//                   rows anywhere (the database door is system-only).
//   lane "support"  /administration/intelligence/mandates/support — Mandate
//                   support lookup: Organizations / Users / All with an Owner
//                   column, for looking into a tenant's mandates during tech
//                   support. Never linked as the main mandates page.
// The admin seat never acts as itself on either (no Mine, no My Orgs). The
// table's own title row carries search, saved views and the column picker. The
// whole query lives in the URL, so Back restores scope, search, filters and sort.

import { useEffect, useRef } from "react";
import Link from "@/components/navigation/AppLink";
import { useRouter } from "next/navigation";
import { ArrowUpCircle, BrainCircuit, Loader2, Trash2 } from "lucide-react";
import { Select } from "@ai-matrx/design-system/controls";
import { commitUrlParams } from "@ai-matrx/kit/url-state";
import { useListSearchParams } from "@/lib/entity-list/useListSearchParams";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { AdminPoints } from "@/components/cost/AdminCost";
import {
  ADMIN_MANDATES_HOME,
  adminMandateRecordHref,
} from "@/features/mandates/admin-routes";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { softDeleteMandate } from "@/features/mandates/admin/service";
import { removeMandate } from "./listConfig";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAccessToken,
  selectAuthReady,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";
import { useServerOrganizationId } from "@/lib/api/useServerOrganizationId";
import { onMandateCacheInvalidated } from "@ai-matrx/chat/mandates/service";
import {
  batchEligibilityOf,
  groupImpactByMandate,
  isSafeGreen,
  rungIdentityOf,
  type ImpactVerdict,
} from "@/features/mandates/admin/impact";
import { useImpactAdvance } from "@/features/mandates/admin/impact-advance";
import { AdvanceResultsCard, ImpactLegend } from "@/features/mandates/admin/impact-cells";
import {
  SurfaceRuntimeProvider,
  type SurfaceWriteHandlers,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  AGENT_MANDATES_WRITE_TARGETS,
  MANDATES_SURFACE_NAME,
  createMandatesScope,
} from "@/features/surfaces/manifests/mandates.manifest";
import {
  advanceWorkflowPins,
  workflowAdvanceEligibility,
} from "@/features/mandates/admin/workflow-advance";
import type { WorkflowImpactVerdict } from "@/features/mandates/admin/workflow-impact";
import { recordToast, toast } from "@/lib/toast";
import { useOpenImpactBatchWindow } from "@/features/overlays/definitions/impactBatchWindow.overlay";
import { adminMandateListConfig, supportMandateListConfig } from "./listConfig";
import { withCodeLocationColumn } from "@/features/mandates/code-location/CodeLocationCell";
import { selectIsSuperAdmin } from "@/lib/redux/slices/userSlice";
import type { MandateAdminLane } from "./rpc";
import { MandateAdminPagesNav } from "./MandateAdminPagesNav";
import {
  MandateAdminListActionsContext,
  useMandateAdminListState,
} from "./context";
import {
  ensureMandateRuns,
  invalidateMandateAdminList,
  retryMandateAdminFailures,
} from "./store";
import {
  DEFAULT_SPEND_PERIOD,
  SPEND_PERIODS,
  SPEND_PERIOD_PARAM,
  parseSpendPeriod,
} from "./spend";
import { EntitySourceFailures } from "@/lib/entity-list/components/EntitySourceFailures";
import { createMandateAdminService } from "./service";
import { healthSummaryOf, toMandateSummary } from "./surface-scope";
import type { MandateAdminRow } from "./types";
import { useBuiltinAgents } from "@ai-matrx/chat/agents/identity/agent-catalog-lists";
import { ensureAgentCatalog } from "@ai-matrx/chat/agents/identity/agent-identity";

/** What each secondary read feeds, in the words of the columns it fills. */
const SOURCE_LABEL: Record<string, string> = {
  codeTruth: "Code declarations",
  coverage: "Coverage",
  catalogue: "Goals",
  serves: "Serves",
  impact: "Grades",
  workflowImpact: "Workflow grades",
  inputs: "Inputs",
  sources: "Where each mandate is declared and called",
  spend: "Cost",
  runs: "Runs",
};

export function MandateAdminListPage({
  lane = "system",
}: {
  /** `system` = the management page; `support` = Mandate support lookup. */
  lane?: MandateAdminLane;
} = {}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const systemAgentCount = useBuiltinAgents().length;
  const accessToken = useAppSelector(selectAccessToken);
  const authReady = useAppSelector(selectAuthReady);
  // The Code column (repo · file:lines) is confidential: super admins only (Arman, 2026-10-09).
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const organizationId = useServerOrganizationId();
  // The server reports ride the organization header: when a workspace is
  // chosen (or changed) after the rows loaded, they are asked again.
  const reportsOrg = useRef(organizationId);
  useEffect(() => {
    if (reportsOrg.current === organizationId) return;
    reportsOrg.current = organizationId;
    invalidateMandateAdminList(true);
  }, [organizationId]);
  const listState = useMandateAdminListState();

  // THE COST PERIOD lives in the address (`?period=7d`), default the last 30
  // days; the management page reads the period's runs and their cost once per period.
  const period = parseSpendPeriod(useListSearchParams().get(SPEND_PERIOD_PARAM));
  const support = lane === "support";
  useEffect(() => {
    if (support || !userId) return;
    ensureMandateRuns(period);
  }, [support, period, userId]);

  // Any mandate write anywhere (the Enabled switch included) re-asks the list.
  useEffect(() => onMandateCacheInvalidated(() => invalidateMandateAdminList()), []);

  // The Health cell's twin fixes read the agent lineage index.
  useEffect(() => {
    if (accessToken) ensureAgentCatalog();
  }, [accessToken, dispatch]);

  const verdictByRung = new Map<string, ImpactVerdict>();
  for (const verdict of listState.reports.impact?.verdicts ?? []) {
    verdictByRung.set(rungIdentityOf(verdict.apply_token), verdict);
  }
  const writes = useImpactAdvance({
    verdictByRung,
    onWritten: () => invalidateMandateAdminList(true),
  });
  const openImpactBatchWindow = useOpenImpactBatchWindow();

  // "Advance all safe": every system mandate whose OWN default rung is behind
  // its holder's newest saved version and graded safe to move — the whole
  // standing report, not just the page on screen.
  const safeDefaults: ImpactVerdict[] = [];
  for (const grouped of groupImpactByMandate(listState.reports.impact?.verdicts ?? []).values()) {
    if (grouped.defaultVerdict && isSafeGreen(grouped.defaultVerdict)) {
      safeDefaults.push(grouped.defaultVerdict);
    }
  }

  // ── Batch work over the selection — "Review as batch", "Advance selected" and Remove, ONE
  // declaration each (the bulk twin rule). A selected mandate a verb does not fit (no pin to
  // review, nothing to advance) is SKIPPED AND NAMED by the shell, never filtered out of the
  // selection. ─────────────────────────────────────────────────────────────────────────────
  const agentIdOf = (row: MandateAdminRow) => row.defaultVerdict?.agent_id ?? row.agentId ?? null;
  const advanceableOf = (row: MandateAdminRow) => ({
    verdicts: row.defaultVerdict && batchEligibilityOf(row.defaultVerdict).batchable ? [row.defaultVerdict] : [],
    // Workflow parity: every workflow-held rung that can move to its newest published version.
    // THE ADMIN SEAT: no pin is "mine" here — a person's own pin is theirs to advance, the admin's included.
    workflowVerdicts: row.workflowVerdicts.filter((v): v is WorkflowImpactVerdict => workflowAdvanceEligibility(v).batchable),
  });
  const reviewRows = (rows: MandateAdminRow[]) => {
    const agentIds = [...new Set(rows.map(agentIdOf).filter((id): id is string => Boolean(id)))];
    if (agentIds.length === 0) {
      toast.info("The batch panel reviews agent pins. Workflow pins are graded in the Grade column; use Advance selected to move them.");
      return;
    }
    openImpactBatchWindow({
      agentIds,
      mode: "post_batch",
      batchLabel: "Mandate list",
      sourceSentence: `${rows.length} mandate${rows.length === 1 ? "" : "s"} selected on the mandate list`,
      preselectedRungIds: rows
        .map((row) => row.defaultVerdict)
        .filter((v): v is ImpactVerdict => v !== null)
        .map((v) => rungIdentityOf(v.apply_token)),
      surfaceName: "administration-mandates",
    });
  };
  const advanceRows = async (rows: MandateAdminRow[]) => {
    const verdicts = rows.flatMap((row) => advanceableOf(row).verdicts);
    const workflowVerdicts = rows.flatMap((row) => advanceableOf(row).workflowVerdicts);
    let ran = false;
    // `advance` opens its own confirm naming what moves (useImpactAdvance); null = canceled.
    if (verdicts.length > 0) {
      ran = (await writes.advance(verdicts, `Mandate list: ${rows.length} selected`)) !== null;
    }
    if (workflowVerdicts.length > 0) {
      const results = await advanceWorkflowPins(dispatch, workflowVerdicts);
      if (results) {
        ran = true;
        const moved = results.filter((r) => r.moved).length;
        const refused = results.filter((r) => !r.moved);
        if (moved > 0) {
          toast.success(`Moved ${moved} workflow pin${moved === 1 ? "" : "s"} to the newest published version.`);
          invalidateMandateAdminList(true);
        }
        // Each row's own sentence, on its mandate's record toast.
        const refOf = (key: string) => {
          const row = rows.find((candidate) => candidate.mandateKey === key);
          return { type: "mandate", id: row?.id ?? key, title: key };
        };
        for (const row of refused) {
          recordToast.error(refOf(row.verdict.mandate_key), row.sentence ?? "Not moved.");
        }
        for (const row of results.filter((r) => r.moved && r.sentence)) {
          recordToast.info(refOf(row.verdict.mandate_key), row.sentence as string);
        }
      }
    }
    return ran;
  };
  const { bulkActions } = defineRowVerbs<MandateAdminRow>(
    [
      {
        id: "review-batch", icon: BrainCircuit, label: "Review as batch",
        appliesTo: (row) => agentIdOf(row) !== null, unavailableTooltip: "No agent pin to review",
        onClick: (row) => reviewRows([row]),
        bulk: {
          variant: "outline",
          done: "Opened for review",
          run: async (t) => {
            reviewRows(t.rows);
            return {};
          },
        },
      },
      {
        id: "advance", icon: ArrowUpCircle, label: "Advance selected",
        appliesTo: (row) => advanceableOf(row).verdicts.length + advanceableOf(row).workflowVerdicts.length > 0,
        unavailableTooltip: "Already current, blocked, or a person's own pin",
        onClick: (row) => void advanceRows([row]),
        bulk: {
          done: "Advanced",
          run: async (t) => {
            // undefined = the person canceled the confirm; nothing ran, so no "Advanced" line.
            return (await advanceRows(t.rows)) ? {} : undefined;
          },
        },
      },
      {
        id: "remove", icon: Trash2, label: "Remove", tone: "destructive",
        onClick: (row) => void removeMandate(row),
        bulk: {
          done: "Removed",
          removesRows: true,
          confirm: (t) => ({
            title: `Remove ${t.ids.length} ${t.ids.length === 1 ? "mandate" : "mandates"}?`,
            description:
              "Lists, pickers and calls stop finding each one, and its customizations stop applying. An admin can restore them.",
            confirmLabel: "Remove",
            variant: "destructive",
          }),
          run: async (t) => {
            const settled = await Promise.allSettled(t.ids.map((id) => softDeleteMandate(id)));
            invalidateMandateAdminList();
            return {
              failed: settled.flatMap((r, i) =>
                r.status === "rejected"
                  ? [{ id: t.ids[i], reason: r.reason instanceof Error ? r.reason.message : String(r.reason) }]
                  : [],
              ),
            };
          },
        },
      },
    ],
    { noun: "mandate", getRowId: (row) => row.id, getRowName: (row) => row.name || row.mandateKey },
  );

  // 🚨 READING NEVER WAITS ON AN ORGANIZATION (review 2026-09-25; access is
  // personal). The list itself is one database read that needs no workspace;
  // only the server reports ride the organization header, and each of those
  // that cannot run says so in the notice below — the rows never wait for it.
  const ready = authReady && Boolean(accessToken);
  const baseService = createMandateAdminService(dispatch, lane);

  // THE AGENT SURFACE (`matrx-admin/mandates`): the page on screen, read at
  // Run time. The last answered page is kept in a ref the service writes, so
  // the surface scope and `select_mandate` see what the admin sees.
  const pageRef = useRef<{ rows: MandateAdminRow[]; total: number }>({ rows: [], total: 0 });
  const service: typeof baseService = {
    ...baseService,
    fetchPage: async (query, sort) => {
      const page = await baseService.fetchPage(query, sort);
      pageRef.current = { rows: page.rows, total: page.total };
      return page;
    },
  };
  const getSurfaceScope = () => {
    const { rows, total } = pageRef.current;
    const summaries = rows.map(toMandateSummary);
    return createMandatesScope({
      mandate_count: total,
      mandates_summary: summaries,
      health_summary: healthSummaryOf(rows),
      unhealthy_mandates: summaries.filter((summary) => summary.health !== "ok"),
      system_agent_count: systemAgentCount,
      selection: window.getSelection()?.toString() || undefined,
    });
  };
  const getWriteHandlers = (): SurfaceWriteHandlers => ({
    [AGENT_MANDATES_WRITE_TARGETS.selectMandate]: (value: unknown) => {
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(
          "select_mandate takes a non-empty string — a mandate's `id` (UUID) or its `mandate_key`, both of which are in `mandates_summary`.",
        );
      }
      const key = value.trim();
      const rows = pageRef.current.rows;
      const match = rows.find((row) => row.id === key) ?? rows.find((row) => row.mandateKey === key);
      if (!match) {
        const known = rows.map((row) => row.mandateKey).join(", ");
        throw new Error(
          `No mandate on this page matches "${key}". Pass a mandate id (UUID) or mandate_key from \`mandates_summary\`.` +
            (known ? ` Mandate keys on this page: ${known}.` : ""),
        );
      }
      router.push(adminMandateRecordHref(match.mandateKey));
    },
    [AGENT_MANDATES_WRITE_TARGETS.exemplarDraft]: () => {
      throw new Error(
        "The mandate list has no test-case composer. Test cases are composed on the mandate's own page, on its Test tab — open the mandate with select_mandate and tell the admin to compose the test case there.",
      );
    },
  });

  if (!ready) {
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <div className="space-y-2" aria-busy="true" aria-label="Loading mandates">
          <div className="h-8 w-72 animate-pulse rounded-md bg-muted" />
          <div className="h-64 w-full animate-pulse rounded-md bg-muted/60" />
        </div>
      </div>
    );
  }

  const list = (
    <MandateAdminListActionsContext.Provider
      value={{
        advancing: writes.busy !== null,
        advanceAnyway: (verdict) => void writes.advance([verdict], `List: ${verdict.mandate_key}`),
      }}
    >
      <EntityListPage
        config={{
          ...(support ? supportMandateListConfig : adminMandateListConfig),
          ...(isSuperAdmin
            ? {
                columns: withCodeLocationColumn(
                  (support ? supportMandateListConfig : adminMandateListConfig).columns,
                ),
              }
            : {}),
          service,
          serviceKey: `${lane}:${userId ?? ""}:${listState.version}`,
          // The batch actions work on grades, which measure system holders
          // only — the support lookup is a read-only look into a tenant.
          bulkActions: support ? [] : bulkActions,
          bulkSelection: support ? undefined : {
            noun: "mandate",
          },
        }}
        // admin-support-only: /administration/intelligence/mandates/support
        defaultScope={support ? { kind: "platform_all" } : { kind: "system" }}
        // The management page has ONE corpus — the platform's own mandates —
        // so it draws no scope tabs at all.
        scopeTabs={support}
        clearsShellHeader={false}
        notice={
          <>
            <EntitySourceFailures
              operation={support ? "Load the mandate support lookup's columns" : "Load the admin mandate list's columns"}
              failures={Object.entries(listState.failures).map(([source, message]) => ({
                label: SOURCE_LABEL[source] ?? source,
                error: message,
              }))}
              onRetry={retryMandateAdminFailures}
            />
            {/* What an advance moved, with its revert door (renders nothing
                until something was advanced from this page). */}
            {support ? null : (
              <AdvanceResultsCard
                batches={writes.batches}
                verdictsOf={writes.verdictsOf}
                busy={writes.busy}
                onRevert={(batch, rowId) => void writes.revert(batch, rowId)}
                onDismiss={writes.clear}
              />
            )}
          </>
        }
        // The page's verb (Advance all safe) is one action: the header draws it, the frame's "…"
        // carries it. Spend, legend and the pages nav are the header's read-outs, not verbs.
        actions={
          !support && safeDefaults.length > 0
            ? [
                {
                  id: "advance-safe",
                  label: writes.busy === "advance" ? "Advancing…" : `Advance all safe (${safeDefaults.length})`,
                  icon: writes.busy === "advance" ? Loader2 : ArrowUpCircle,
                  disabled: writes.busy !== null,
                  onPress: () => void writes.advance(safeDefaults, "Mandate list: all safe"),
                },
              ]
            : undefined
        }
        headerActions={
          support ? (
            <MandateSupportLookupLabel />
          ) : (
            <>
              <MandateSpendHeader
                period={period}
                totalUsd={listState.spend.total}
                pending={!listState.spend.settled}
                folded={listState.spend.folded}
              />
              <ImpactLegend />
              <MandateAdminPagesNav />
            </>
          )
        }
      />
    </MandateAdminListActionsContext.Provider>
  );

  // The support lookup is a read-only look into a tenant: no agent surface.
  if (support) return list;
  return (
    <SurfaceRuntimeProvider
      surfaceName={MANDATES_SURFACE_NAME}
      getScope={getSurfaceScope}
      getWriteHandlers={getWriteHandlers}
      isEditable={false}
    >
      {list}
    </SurfaceRuntimeProvider>
  );
}

/**
 * The cost period and the total of every mandate the filters match — in the
 * list's own header bar, never a row of its own.
 */
function MandateSpendHeader({
  period,
  totalUsd,
  pending,
  folded,
}: {
  period: string;
  totalUsd: number | null;
  pending: boolean;
  folded: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Cost period"
        value={period}
        options={SPEND_PERIODS.map((preset) => ({ value: preset.key, label: preset.label }))}
        onValueChange={(next) =>
          commitUrlParams({ [SPEND_PERIOD_PARAM]: next === DEFAULT_SPEND_PERIOD ? null : next }, "replace")
        }
      />
      {pending ? (
        <span className="type-secondary text-muted-foreground animate-pulse">Totalling…</span>
      ) : totalUsd !== null ? (
        <span
          className="type-secondary tabular-nums whitespace-nowrap"
          title={
            folded
              ? "Some costs were not answered"
              : "Cost of every run of the mandates the filters match"
          }
        >
          {formatAdminUsd(totalUsd)} · <AdminPoints usd={totalUsd} />
        </span>
      ) : null}
    </div>
  );
}

/**
 * The support lookup names itself plainly: it is a tech-support tool over
 * organizations' and people's mandates, not where mandates are managed.
 */
function MandateSupportLookupLabel() {
  return (
    <div className="flex items-center gap-2 type-secondary text-muted-foreground">
      <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300">
        Support tool
      </span>
      <span className="hidden sm:inline">
        Organizations&apos; and people&apos;s mandates, for tech support.
      </span>
      <Link href={ADMIN_MANDATES_HOME} className="font-medium text-foreground hover:underline">
        Manage system mandates
      </Link>
    </div>
  );
}
