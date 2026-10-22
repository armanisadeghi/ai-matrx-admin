"use client";

// features/mandates/record-next/MandateRecordPage.tsx
//
// THE MANDATE RECORD PAGE — /administration/intelligence/mandates/<key> (and
// the member seats) per common-docs/systems/intelligence/mandates/UI-REGISTER.md.
//
// Shape: the agents-style record header (EntityModeHeader — back | name |
// actions), the name shown ONCE, the existing tabs with short labels (./record-tabs.ts), and the selected tab in the URL
// (`?tab=`) so refresh, deep links and browser Back all work. The tabs sit in
// their own row under the header (`RecordTabStrip`), every tab NAMED on one
// row at desktop widths; only a narrow screen moves the ones that do not fit
// into a "More" menu, which lists them by name. (They used to ride in the
// header's mode pill, which shares the bar with the name and the actions and
// collapsed eleven tabs to a single "Definition" pill at 1440px.)

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, Workflow } from "lucide-react";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { SuspenseLoader } from "@ai-matrx/design-system";
import { pushAppHref } from "@/lib/deployment/navigate";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";
import { EntityModeHeader } from "@/features/shell/components/header/templates/EntityModeHeader";
import { useMandateSystemSeat } from "@/features/mandates/admin/useMandateSystemSeat";
import { usePromoteToSystemMandate } from "@/features/mandates/admin/mandate-actions";
import { useStartMandateWorkflow } from "@ai-matrx/chat/mandates/useStartMandateWorkflow";
import {
  SurfaceRuntimeProvider,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  MANDATE_WORKSPACE_SURFACE_NAME,
  createMandateWorkspaceScope,
} from "@/features/surfaces/manifests/mandate-workspace.manifest";
import type { MandateWorkspaceData } from "@/features/mandates/workspace/useMandateWorkspaceData";
import { MandateRecordBody } from "./MandateRecordBody";
import { RecordTabStrip } from "./RecordTabStrip";
import {
  DEFAULT_RECORD_TAB,
  MANDATE_LIST_PREVIEW_HREF,
  parseRecordTabFrom,
  recordTabsForLevel,
  tabRowOf,
  withTabCount,
  type RecordLevel,
  type RecordTabId,
} from "./record-tabs";
import { useRecordBackHref } from "./useRecordBackHref";
import { useCandidateCount } from "./useCandidateCount";
import { readMandateAddress } from "@/features/mandates/mandate-address";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { useRecordTitle } from "@/lib/record-title/record-title";
import { useMandateShareAction } from "./MandateVisibilityControl";
import { useMandateStatusActions } from "@/features/mandates/status/MandateStatusControl";
import { MandateStatusBadge } from "@/features/mandates/status/MandateStatusBadge";
import { mandateStatusOfRow } from "@/features/mandates/status/mandate-status";
import { seatCanManageMandate } from "@/features/mandates/status/can-manage";

/**
 * Which seat opens the record. `system` (the default) is the admin route,
 * unchanged. `person` is /mandates/record-preview/<key>; `organization` is
 * /organizations/<org>/mandates/<key> — same page, same body, the level only
 * decides the tabs, the principal, and which header actions exist.
 */
export interface MandateRecordPageProps {
  /** The route segment: a mandate key, or a row id (the support lookup). */
  mandateKeyOrId: string;
  level?: RecordLevel;
  /** Organization level: the route's organization id. */
  orgId?: string | null;
  /** Organization level: the viewer is an owner/admin of `orgId`. */
  canManageOrg?: boolean;
  /** Where Back goes when the tab did not come from a list. */
  listHref?: string;
  /**
   * Admin routes only. `system` (default) = the MANAGEMENT page, which opens
   * system mandates only; `support` = Mandate support lookup, which opens an
   * organization's or a person's mandate by id (Arman, 2026-09-26).
   */
  lane?: "system" | "support";
}

export function MandateRecordPage(props: MandateRecordPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <SuspenseLoader />
        </div>
      }
    >
      <MandateRecordPageInner {...props} />
    </Suspense>
  );
}

function MandateRecordPageInner({
  mandateKeyOrId,
  level = "system",
  orgId = null,
  canManageOrg = false,
  listHref = MANDATE_LIST_PREVIEW_HREF,
  lane = "system",
}: MandateRecordPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const readOnly = level === "organization" && !canManageOrg;
  const tabs = recordTabsForLevel(level, { readOnly });
  const activeTab = parseRecordTabFrom(searchParams.get("tab"), tabs);
  const backHref = useRecordBackHref(listHref);
  // The Candidates tab's badge — read by key (the support lookup opens by id,
  // and its badge waits for the tab body instead).
  const candidateCount = useCandidateCount(
    readMandateAddress(mandateKeyOrId) === "key" ? storedMandateKey(mandateKeyOrId) : null,
  );

  const hrefFor = (tab: RecordTabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === DEFAULT_RECORD_TAB) params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  // A tab change is a push: browser Back steps back through tabs, while the
  // header's Back (useRecordBackHref) skips them and leaves the record.
  const onTabChange = (tab: RecordTabId) =>
    router.push(hrefFor(tab), { scroll: false });

  return (
    <SurfaceRuntimeProvider
      surfaceName={MANDATE_WORKSPACE_SURFACE_NAME}
      getScope={() => ({
        ...createMandateWorkspaceScope({
          mandate_key: mandateKeyOrId,
          selection: window.getSelection()?.toString() || undefined,
        }),
      })}
    >
      <div className="h-full overflow-y-auto" data-matrx-page-scroll>
        {/* Under /administration the content already starts below the
            header; a (core) member page sits under the glass shell header and
            clears it, exactly as EntityListPage's clearsShellHeader does.
            A flex column at least one screen tall (less the page end — a
            constant, never what floats, which floating chrome may not move): a tab that reads a long body — the Runs split — grows
            into the space left instead of a fixed height. No bottom padding:
            the scroller's runway IS the page end (styles/shell.css). */}
        <div
          className={
            level === "system"
              ? "flex min-h-[calc(100%-var(--matrx-page-end))] w-full min-w-0 flex-col px-4 pt-3 sm:px-6"
              : "mx-auto flex min-h-[calc(100%-var(--matrx-page-end))] w-full min-w-0 max-w-6xl flex-col px-4 pt-[calc(var(--shell-header-h)+0.75rem)] sm:px-6"
          }
        >
          <MandateRecordBody
            mandateKeyOrId={mandateKeyOrId}
            host={level === "system" ? "admin-route" : "route"}
            principal={
              level === "organization" && orgId
                ? { kind: "org", orgId }
                : { kind: "user" }
            }
            tabs={tabs}
            showAdminPanels={level === "system" ? undefined : false}
            readOnly={readOnly}
            systemOnly={level === "system" && lane === "system"}
            activeTab={activeTab}
            onTabChange={onTabChange}
            listHref={listHref}
            renderChrome={({ name, data, exportSession, openExport, refresh }) => (
              <>
                <RecordHeader
                  name={name}
                  data={data}
                  exportSession={exportSession}
                  openExport={openExport}
                  refresh={refresh}
                  backHref={backHref}
                  level={level}
                  orgId={orgId}
                  canManageOrg={canManageOrg}
                  listHref={listHref}
                  readOnly={readOnly}
                  canCreateAgent={tabs.some((tab) => tab.id === "create-agent")}
                  onTabChange={onTabChange}
                />
                {/* The admin route is super-admin gated by its layout, so
                    every tab shows there; a member page shows only the tabs
                    its seat may use (record-tabs.ts `recordTabsForLevel`). */}
                <RecordTabStrip
                  tabs={tabRowOf(withTabCount(tabs, "candidates", candidateCount))}
                  value={activeTab}
                  onChange={onTabChange}
                  className="mb-3"
                />
              </>
            )}
          />
        </div>
      </div>
    </SurfaceRuntimeProvider>
  );
}

/**
 * May this seat remove the mandate? The admin route always could; a person
 * only their own soft mandate; an organization's manager only that
 * organization's own soft mandate. Pure — exported for tests.
 */
export function recordCanRemove(
  mandate: Pick<MandateWorkspaceData["mandate"], "organization_id" | "created_by" | "origin">,
  seat: { level: RecordLevel; userId: string | null; orgId: string | null; canManageOrg: boolean },
): boolean {
  // One rule for removing AND for changing status (features/mandates/status/can-manage.ts).
  return seatCanManageMandate(mandate, seat);
}

function RecordHeader({
  name,
  data,
  exportSession,
  openExport,
  refresh,
  backHref,
  level,
  orgId,
  canManageOrg,
  listHref,
  readOnly,
  canCreateAgent,
  onTabChange,
}: {
  name: string;
  data: MandateWorkspaceData;
  /** The export with no trigger of its own (mounted here; the "Copy or export" action opens it). */
  exportSession: React.ReactNode;
  openExport: () => void;
  refresh: () => void;
  backHref: string;
  level: RecordLevel;
  orgId: string | null;
  canManageOrg: boolean;
  listHref: string;
  readOnly: boolean;
  /** The seat may open the protected "Create Agent" body (a header action). */
  canCreateAgent: boolean;
  onTabChange: (tab: RecordTabId) => void;
}) {
  const router = useRouter();
  // The browser tab and the admin breadcrumb say the mandate's name, never
  // "Mandate" or its key.
  useRecordTitle(name);
  const { starting, startWorkflow } = useStartMandateWorkflow();
  const userId = useAppSelector(selectUserId);
  const canRemove = recordCanRemove(data.mandate, { level, userId, orgId, canManageOrg });
  const systemSeat = useMandateSystemSeat(data.mandate);
  // Sharing is the creator's call, on their own soft mandate — from the person seat or an
  // organization seat alike (the list kebab uses the same rule: canShareMemberRow).
  const canShare =
    level !== "system" &&
    data.mandate.origin !== "code" &&
    Boolean(userId) &&
    data.mandate.created_by === userId;

  const status = mandateStatusOfRow(data.mandate, data.bindings);
  // THE STATUS is the badge beside the name; changing it (Enable, Disable, Archive — the soft
  // removal — and a draft's Set a Mandate Holder) is part of the page's ONE action list, so the
  // line, its Actions menu, the frame's "…" and the phone sheet all carry the same rows.
  const statusActions = useMandateStatusActions({
    mandateId: data.mandate.id,
    name,
    status,
    // The system seat may change a SYSTEM mandate's status from here
    // (admin feature "mandate.system-seat").
    canManage: canRemove || systemSeat,
    systemSeat,
    onSetHolder: readOnly ? undefined : () => onTabChange("holder"),
    onChanged: (next) => (next === "archived" ? pushAppHref(router, listHref) : refresh()),
  });
  const share = useMandateShareAction(data.mandate, refresh);
  const promote = usePromoteToSystemMandate(data.mandate, refresh);

  return (
    <>
    {exportSession}
    {share.dialog}
    <EntityModeHeader
      backHref={backHref}
      entityLabel={name}
      entityStatus={<MandateStatusBadge status={status} size="lg" />}
      actions={[
        // Workflow parity: a job is filled by an agent OR a workflow — both
        // start here. "New agent" opens the protected Create Agent body; a
        // workflow starts here — pre-wired with this
        // job's inputs and output kind, opened in the studio — and is then
        // picked on the Binding tab once it has steps.
        ...(canCreateAgent && !readOnly
          ? [
              {
                label: "New agent",
                icon: AGENT_ICON,
                showLabel: true,
                onPress: () => onTabChange("create-agent"),
              },
            ]
          : []),
        ...(readOnly
          ? []
          : [
              {
                label: starting ? "Starting workflow…" : "New workflow",
                icon: Workflow,
                showLabel: true,
                disabled: starting,
                onPress: () =>
                  void startWorkflow(storedMandateKey(data.mandate.mandate_key)).then((created) => {
                    if (created) onTabChange("holder");
                  }),
              },
            ]),
        ...(canShare ? [share.action] : []),
        { label: "Copy or export", icon: Copy, placement: "menu" as const, onPress: openExport },
        ...(level === "system" && promote.action ? [promote.action] : []),
        ...statusActions,
      ]}
    />
    {promote.refusal}
    </>
  );
}
