"use client";

/**
 * "Projects and organizations" on /work/connections — which organization each coding project saves
 * to, and the projects held because nobody chose yet (the hook message points people here). One
 * row per project in the canonical table: every column sorts and filters, the choice is a row icon,
 * everything else is in the row's details. The state is the shared `useProjectOrganizations` from
 * @ai-matrx/coding-sessions (Matrx 2 can mount the same); this file supplies the authenticated,
 * contract-typed calls and the table.
 */

import { useMemo, useState } from "react";
import { Building2, Info } from "lucide-react";

import type {
  ProjectMoveReport,
  ProjectOrganizationsPort,
  ProjectOrganizationsReport,
  ProjectRow,
} from "@ai-matrx/coding-sessions/projects";
import { useProjectOrganizations, type ProjectOrganizationsState } from "@ai-matrx/coding-sessions/projects/react";
import type { components } from "@ai-matrx/api/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, ErrorNotice, StatusDot } from "@ai-matrx/design-system";
import { PropertyRow, Select } from "@ai-matrx/design-system/controls";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";

import { putJson } from "@/lib/python-client";
import { readCodingSessionConnectionOrganization, writeCodingSessionConnectionOrganization } from "@ai-matrx/api/code";
import { serverApi, callOptionsFrom } from "@/lib/api/server-api";
import { formatSessionTimestamp } from "@/features/agent-connections/coding-sessions/verdict";

type WireReport = components["schemas"]["CodingSessionConnectionOrganization"];
type WireMove = Omit<ProjectMoveReport, "report"> & { report: WireReport };

function toReport(wire: WireReport): ProjectOrganizationsReport {
  return {
    organization_id: wire.organization_id ?? null,
    projects: wire.projects ?? [],
    held_projects: wire.held_projects ?? [],
    known_projects: (wire.known_projects ?? []).map((p) => ({
      key: p.key,
      name: p.name,
      sessions: p.sessions ?? 0,
      organizations: p.organizations ?? {},
      last_active_at: p.last_active_at ?? null,
    })),
    ...(wire.choose_where ? { choose_where: wire.choose_where } : {}),
    organizations: wire.organizations ?? null,
  };
}

function toMove(wire: WireMove): ProjectMoveReport {
  return {
    project: wire.project,
    organization_id: wire.organization_id ?? null,
    moved: wire.moved ?? {},
    report: toReport(wire.report),
  };
}

const PATH = "/coding-sessions/connection/organization" as const;
const ASK_EACH = "__ask_each__";
const FOLLOW_ALL = "__follow_all__";
const CHOOSE = "__choose__";

type Status = { word: string; tone: "warning" | "success" | "neutral"; order: number };

/** The row's status, in the shared picker's words. */
function statusOf(row: ProjectRow, allProjects: string | null): Status {
  if (row.held) return { word: "Not saving", tone: "warning", order: 0 };
  if (row.chosen) return { word: "Chosen", tone: "success", order: 1 };
  if (allProjects) return { word: "Follows all projects", tone: "neutral", order: 2 };
  return { word: "Where it lives", tone: "neutral", order: 3 };
}

export function CodingProjectOrganizations() {
  const port = useMemo<ProjectOrganizationsPort>(
    () => ({
      read: async () => toReport(await readCodingSessionConnectionOrganization(serverApi, {})),
      // A choice is made IN the organization being chosen, so the write carries it even when
      // no organization is selected in the app (the client refuses an org-less write).
      chooseForAllProjects: async (organizationId) =>
        toReport(
          await writeCodingSessionConnectionOrganization(serverApi, { body: { organization_id: organizationId } }, callOptionsFrom(organizationId ? { organizationId } : {})),
        ),
      // PUT …/project is not in the published contract yet (next @ai-matrx/agents release);
      // switch to apiPut then. Shape: aidream CodingProjectMoveReport.
      chooseForProject: async (project, organizationId) =>
        toMove(
          (
            await putJson<WireMove>(
              `${PATH}/project`,
              { project, organization_id: organizationId },
              organizationId ? { organizationId } : {},
            )
          ).data,
        ),
    }),
    [],
  );
  const state = useProjectOrganizations(port);
  return (
    <div id="projects-and-organizations">
      <ProjectsTable state={state} />
    </div>
  );
}

function ProjectsTable({ state }: { state: ProjectOrganizationsState }) {
  const { report, rows, loading, error, notice, saving } = state;
  const [choosing, setChoosing] = useState<ProjectRow | null>(null);
  const organizations = report?.organizations ?? [];
  const allProjects = report?.organization_id ?? null;
  const held = rows.filter((r) => r.held).length;
  const orgNames = (ids: string[]) => ids.map((id) => state.organizationName(id)).join(", ");

  const columns: MatrxColumnDef<ProjectRow>[] = [
    { id: "project", header: "Project", accessorFn: (r) => r.name, filter: "text", width: 240, cell: (r) => <span className="truncate font-medium" title={r.name}>{r.name}</span> },
    {
      id: "status",
      header: "Status",
      accessorFn: (r) => statusOf(r, allProjects).word,
      sortValue: (r) => statusOf(r, allProjects).order,
      filter: "select",
      width: 170,
      cell: (r) => {
        const s = statusOf(r, allProjects);
        return (
          <span className="flex min-w-0 items-center gap-1.5">
            <StatusDot tone={s.tone} label={s.word} />
            <span className="truncate">{saving === r.key ? "Saving…" : s.word}</span>
          </span>
        );
      },
    },
    { id: "saves_to", header: "Saves to", accessorFn: (r) => (r.effective ? state.organizationName(r.effective) : ""), filter: "select", width: 220, cell: (r) => <span className={`truncate ${r.effective ? "" : "text-muted-foreground"}`}>{r.effective ? state.organizationName(r.effective) : "—"}</span> },
    { id: "organizations", header: "Organizations", accessorFn: (r) => r.livesIn.length, filter: "number", width: 120, align: "right", helpText: "How many organizations its saved sessions are in now; more than one means it is split" },
    { id: "sessions", header: "Sessions", accessorFn: (r) => r.sessions, filter: "number", width: 100, align: "right" },
    { id: "last_active", header: "Last active", accessorFn: (r) => r.lastActiveAt, filter: "date", width: 150, cell: (r) => <span className="text-muted-foreground">{r.lastActiveAt ? formatSessionTimestamp(r.lastActiveAt) : "—"}</span> },
  ];

  return (
    <section aria-label="Projects and organizations" className="space-y-2">
      {error ? <ErrorNotice message={error} size="inline" /> : null}
      {notice && !error ? <p className="text-xs text-muted-foreground" role="status">{notice}</p> : null}
      {report && report.organizations === null ? <ErrorNotice message="Your organizations couldn't be read right now. Refresh to try again." size="inline" /> : null}
      <MatrxDataTable<ProjectRow>
        tableId="work/connections/projects"
        data={rows}
        columns={columns}
        getRowId={(r) => r.key}
        pageSize={25}
        density="condensed"
        viewTabs={false}
        selection={false}
        defaultSort={{ id: "status", direction: "asc" }}
        toolbar={{
          title: "Projects and organizations",
          ...(held ? { titleCount: { value: held, label: "not saving" } } : {}),
          searchPlaceholder: "Search projects",
          refresh: { onRefresh: () => state.refresh(), label: "Read projects again" },
          actions: (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              All my projects
              <Select
                aria-label="Organization for all my projects"
                variant="inline"
                disabled={saving !== null || !report}
                value={allProjects ?? ASK_EACH}
                options={[{ value: ASK_EACH, label: "Ask for each project" }, ...organizations.map((o) => ({ value: o.id, label: o.name }))]}
                onValueChange={(id) => void state.chooseForAllProjects(id === ASK_EACH ? null : id)}
              />
            </span>
          ),
        }}
        rowActions={(r, controls) => [
          { id: "choose", icon: Building2, label: organizations.length ? `Choose where ${r.name} saves` : "Choose where it saves (your organizations couldn't be read)", onClick: () => setChoosing(r), disabled: saving !== null || !organizations.length },
          { id: "info", icon: Info, label: `Everything about ${r.name}`, onClick: controls.openDetail },
        ]}
        detail={{
          title: (r) => r.name,
          description: (r) => statusOf(r, allProjects).word,
          render: (r) => (
            <div className="space-y-3 p-1">
              <PropertyRow label="Project" value={r.name} />
              <PropertyRow label="Key" value={r.key} mono />
              <PropertyRow label="Status" value={statusOf(r, allProjects).word} />
              <PropertyRow label="Its own choice" value={r.chosen ? state.organizationName(r.chosen) : null} missing="None" />
              <PropertyRow label="Next session saves to" value={r.effective ? state.organizationName(r.effective) : null} missing="Held until you choose" />
              <PropertyRow label="Saved sessions are in" value={r.livesIn.length ? orgNames(r.livesIn) : null} missing="None yet" />
              <PropertyRow label="Sessions" value={String(r.sessions)} />
              <PropertyRow label="Last active" value={r.lastActiveAt ? formatSessionTimestamp(r.lastActiveAt) : null} missing="—" />
            </div>
          ),
        }}
        isLoading={loading && !report}
        read={{ status: loading && !report ? "loading" : error && !report ? "error" : "ready", error: error ?? undefined, onRetry: () => void state.refresh(), what: "your coding projects" }}
        emptyState={{ title: "No coding projects yet", description: "They appear after your first synced session" }}
      />
      <ChooseOrganizationDialog row={choosing} state={state} onClose={() => setChoosing(null)} />
    </section>
  );
}

/** Choose (or clear) one project's organization; its existing sessions move with it. */
function ChooseOrganizationDialog({ row, state, onClose }: { row: ProjectRow | null; state: ProjectOrganizationsState; onClose: () => void }) {
  const organizations = state.report?.organizations ?? [];
  const allProjects = state.report?.organization_id ?? null;
  const current = row?.chosen ?? (row && !row.held && allProjects ? FOLLOW_ALL : CHOOSE);
  const options = [
    ...(current === CHOOSE ? [{ value: CHOOSE, label: "Choose organization" }] : []),
    ...(allProjects || row?.chosen ? [{ value: FOLLOW_ALL, label: allProjects ? `${state.organizationName(allProjects)} (all projects)` : "Clear my choice" }] : []),
    ...organizations.map((o) => ({ value: o.id, label: o.name })),
  ];
  return (
    <Dialog open={row !== null} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? `Where ${row.name} saves` : ""}</DialogTitle>
          <DialogDescription>Its saved sessions and their files move to the organization you choose.</DialogDescription>
        </DialogHeader>
        {row ? (
          <Select
            aria-label={`Organization for ${row.name}`}
            value={current}
            disabled={state.saving !== null}
            options={options}
            onValueChange={(id) => {
              if (id === CHOOSE) return;
              if (id === FOLLOW_ALL) {
                if (row.chosen) void state.chooseForProject(row.name, null);
              } else void state.chooseForProject(row.name, id);
              onClose();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
