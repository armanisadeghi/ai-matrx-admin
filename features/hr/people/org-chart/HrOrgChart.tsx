"use client";

// features/hr/people/org-chart/HrOrgChart.tsx
//
// ROUTE 11 — `/hr/people/org-chart`. Paired with the directory as a route tab.
//
// THE FIVE RULES THIS SURFACE IS JUDGED ON (SPEC-EMPLOYEES §5.2):
//
//  1. NOBODY IS SILENTLY DROPPED. `unplaced[]` renders in an explicit "Not yet
//     placed" tray. A person with no manager on the as-of date is a fact about
//     the org, not a rendering problem to hide.
//  2. A CYCLE RENDERS A BADGE AND A DOOR TO FIX IT — never an infinite layout.
//     The badge comes from the server's `cycles[]` (plus any loop the forest
//     build itself refused); the termination guarantee is in the shared
//     `components/official/org-chart/forest.ts`.
//  3. NO-MANAGER-DATA IS AN EXPLICIT SCREEN with a door to bulk manager
//     assignment — never an empty canvas that looks broken.
//  4. THE AS-OF CHIP IS PERSISTENT AND TRAVELS. It stays on screen, it goes into
//     the export filename and is burned into the PNG/PDF, and changing it
//     RE-FETCHES WITHOUT RE-LAYING-OUT FROM SCRATCH — siblings sort by name, so
//     persisting nodes keep their slot and a reorg reads as a reorg.
//
// The drawing is THE org chart primitive (`components/official/org-chart/`):
// layout, pan/zoom, search, collapse, minimap and the one PNG/PDF export path.
// This file owns only the HR data, the HR card and the HR states.
//  5. THE HISTORY CONTROL IS ABSENT WHEN `history_available` IS FALSE. Not
//     disabled. An employee who may not see history does not learn that history
//     exists from a greyed date picker.
//
// The NL query box is specified to return A HIGHLIGHTED SET OF NODES ON THIS
// CHART, never a chat reply. The mandate `hr.employees.org_chart_query` is not
// registered, so the box renders honestly disabled with a registered promise
// behind it rather than pretending to work or silently vanishing.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarClock, Download, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  OrgChart,
  type OrgChartCrossLink,
  type OrgChartEdgeKind,
} from "@/components/official/org-chart/OrgChart";
import { buildParentForest } from "@/components/official/org-chart/forest";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { HrPageState } from "../../shared/HrStates";
import { useHrContext } from "../../shared/useHrContext";
import { useHrPersona } from "../../shared/useHrPersona";
import { useHrRequest } from "../shared/useHrRequest";
import { fetchHrOrgChart } from "../../service";
import { hrEmployeeHref, hrOrgChartHref, hrPeopleHref } from "../../routes";
import type {
  HrDenied,
  HrFailed,
  HrOrgChart as HrOrgChartData,
  HrOrgChartNode,
  HrOrgChartUnplaced,
} from "../../types";
import { formatFullDate } from "../shared/HrStatusChip";
import { HrWorkerClassChip } from "../shared/HrWorkerClassChip";
import { HrEmployeePhoto } from "../../shared/HrEmployeePhoto";
import {
  downloadOrgChartCsv,
  orgChartExportBase,
  orgChartExportName,
} from "./orgChartExport";
import { AGENT_ICON } from "@/components/icons/domain-icons";

const CARD_WIDTH = 220;
const CARD_HEIGHT = 104;

const HR_EDGE_KINDS: Record<string, OrgChartEdgeKind> = {
  manager: { label: "Reports to", color: "hsl(var(--muted-foreground) / 0.55)" },
  dotted: {
    label: "Dotted line",
    description: "A second reporting line beside the manager.",
    color: "hsl(var(--primary))",
    dashed: true,
  },
};

// ── The fetch ───────────────────────────────────────────────────────────────

type ChartRequest = { organizationId: string; on: string | null };

/** Module-level, so the read hook's dependency array holds a stable reference. */
function runChart(args: ChartRequest) {
  return fetchHrOrgChart(args);
}

function useOrgChart(organizationId: string | null, on: string | null) {
  const request =
    organizationId === null
      ? null
      : JSON.stringify({ organizationId, on } satisfies ChartRequest);

  const state = useHrRequest<ChartRequest, HrOrgChartData>(request, runChart);

  return {
    // While another date loads, keep the chart that is on screen (marked
    // "Updating…") — never flash "No managers assigned yet" and never unmount
    // the chart, which would throw away the person's zoom and pan.
    data: state.data ?? state.previousData,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: (state.denied ?? state.error) as HrDenied | HrFailed | null,
    refresh: state.refresh,
  };
}

// ── Quick chips for the as-of date ──────────────────────────────────────────

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function quickAsOfChips(): { label: string; value: string }[] {
  const now = new Date();
  const janFirst = new Date(now.getFullYear(), 0, 1);
  // Last quarter end = the last day of the most recently COMPLETED quarter.
  const quarter = Math.floor(now.getMonth() / 3);
  const lastQuarterEnd = new Date(now.getFullYear(), quarter * 3, 0);
  return [
    { label: "Today", value: isoDay(now) },
    { label: `1 Jan ${now.getFullYear()}`, value: isoDay(janFirst) },
    { label: "Last quarter end", value: isoDay(lastQuarterEnd) },
  ];
}

// ── The surface ─────────────────────────────────────────────────────────────

export function HrOrgChart() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { active, orgRef } = useHrContext();
  const { can } = useHrPersona();
  const organizationId = active?.organization_id ?? null;

  const asOfParam = searchParams?.get("as_of") ?? null;
  const focusParam = searchParams?.get("focus") ?? null;

  const chart = useOrgChart(organizationId, asOfParam);

  const [showDotted, setShowDotted] = useState(false);
  const data = chart.data;
  const nodes = data?.nodes ?? [];
  const employmentToEmployee = new Map(
    nodes.map((node) => [node.employment_id, node.employee_id]),
  );
  const focusEmployment = focusParam
    ? (nodes.find((node) => node.employee_id === focusParam)?.employment_id ??
      null)
    : null;

  // 🚨 SIBLING ORDER IS A FUNCTION OF THE PEOPLE (their names), not of what was
  // on screen a moment ago — so anyone under the same manager on both dates
  // occupies the same slot on both, and the only thing that moves is the thing
  // that actually changed. The build also carries the cycle guard: a reporting
  // loop is entered once and the closing link refused, never followed forever.
  const forest = buildParentForest(nodes, {
    id: (node) => node.employment_id,
    parentId: (node) => node.manager_employment_id,
    // A withheld node still sorts — by the label the viewer actually sees, so
    // the ordering they observe is stable and explicable.
    sortKey: (node) => node.display_name ?? withheldLabel(node).text,
    edgeKind: "manager",
  });
  const crossLinks: OrgChartCrossLink[] = showDotted
    ? (data?.dotted_lines ?? []).map((line) => ({
        key: `dotted:${line.manager_employment_id}->${line.employment_id}`,
        fromKey: line.manager_employment_id,
        toKey: line.employment_id,
        kind: "dotted",
      }))
    : [];

  const cycleEmployments = new Set([
    ...(data?.cycles ?? []),
    ...forest.cycleLinks.map((link) => link.childId),
  ]);
  // A transition, so the page's Suspense boundary keeps the chart on screen
  // while the new date loads. Without it the fallback replaced the chart and
  // remounted it, throwing away the person's zoom and pan on every date change.
  const [, startDateChange] = useTransition();
  const setAsOf = (value: string | null) => {
    startDateChange(() => {
      router.push(
        hrOrgChartHref({ org: orgRef, focus: focusParam, asOf: value }),
      );
    });
  };

  const historyAvailable = data?.history_available ?? false;
  const asOf = data?.as_of ?? null;
  const isHistorical = Boolean(
    asOf && data?.requested_on && asOf !== data.requested_on,
  );
  const isAsOfView = asOfParam !== null;

  return (
    <HrPageState
      loading={chart.isLoading}
      error={chart.error?.kind === "failed" ? chart.error : null}
      granted={chart.error?.kind !== "denied"}
      operation="The org chart"
      variant="panel"
      noAccessSentence="The org chart isn't yours here."
      onRetry={chart.refresh}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
          {/* 🚨 ABSENT when history is not available for this viewer. */}
          {historyAvailable ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <CalendarClock
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="date"
                aria-label="Show the chart as it was on this date"
                value={asOfParam ?? asOf ?? ""}
                min={data?.earliest_known_on ?? undefined}
                onChange={(event) => setAsOf(event.target.value || null)}
                className="w-[10.5rem]"
              />
              {quickAsOfChips().map((chip) => (
                <Button
                  key={chip.label}
                  type="button"
                  variant="quiet"
                  onClick={() => setAsOf(chip.value)}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex min-h-11 items-center gap-1.5 lg:min-h-0">
              <Switch
                id="hr-dotted-lines"
                checked={showDotted}
                onCheckedChange={setShowDotted}
                aria-label="Show dotted-line reporting"
              />
              {/* The label is the 44px touch target below desktop: a tap anywhere
                  on "Dotted lines" toggles the switch. */}
              <Label
                htmlFor="hr-dotted-lines"
                className="flex min-h-11 items-center text-xs text-muted-foreground lg:min-h-0"
              >
                Dotted lines
              </Label>
            </div>

            {/* PNG and PDF are the chart's own download buttons (one export path
                for every org chart); the CSV is HR's rows, so it lives here. */}
            <Button
              icon={<Download aria-hidden />}
              type="button"
              variant="outline"
              disabled={!data}
              onClick={() => {
                if (!data) return;
                downloadOrgChartCsv(data);
                toast.success(`Exported ${orgChartExportName(data.as_of, "csv")}`);
              }}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* ── The persistent as-of chip. It travels into every export. ───── */}
        {asOf ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5 sm:px-4">
            <Badge
              variant={isHistorical ? "default" : "secondary"}
              className="shrink-0"
            >
              As of {formatFullDate(asOf)}
            </Badge>
            {isHistorical ? (
              <span className="text-xs text-muted-foreground">
                This is the chart as it was on that date, not today&apos;s.
              </span>
            ) : null}
            {data?.earliest_known_on && isHistorical ? (
              <span className="text-xs text-muted-foreground">
                Earliest date we hold: {formatFullDate(data.earliest_known_on)}.
              </span>
            ) : null}
            {chart.isFetching ? (
              <span className="text-xs text-muted-foreground">Updating…</span>
            ) : null}
          </div>
        ) : null}

        {/* ── The natural-language query box ────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
          <AGENT_ICON
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <Input
            disabled
            placeholder="Ask this chart a question — “who reports to Dana two levels down”"
            aria-label="Ask the org chart a question"
            className="max-w-md"
          />
          <button
            type="button"
            onClick={() => void announceComingSoon("hr.people.org-chart-query")}
            className="inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground lg:min-h-0"
          >
            Why is this off?
          </button>
        </div>

        {/* ── The canvas, or the honest screen that replaces it ─────────── */}
        {nodes.length === 0 ? (
          <NoManagerData org={orgRef} canFix={can("identity.write")} />
        ) : focusEmployment === null && focusParam ? (
          <NotEmployedOnDate asOf={asOf} employeeId={focusParam} org={orgRef} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <OrgChart<HrOrgChartNode>
              className="flex-1"
              roots={forest.roots}
              edgeKinds={HR_EDGE_KINDS}
              crossLinks={crossLinks}
              cardWidth={CARD_WIDTH}
              cardHeight={CARD_HEIGHT}
              focusKey={focusEmployment}
              persistKey={organizationId ? `hr:${organizationId}` : undefined}
              // An as-of change redraws the chart; the view stays where it is so
              // the people who persist visibly keep their place.
              framing="once"
              getSearchText={(node) =>
                [
                  node.display_name ?? withheldLabel(node).text,
                  node.job_title,
                  node.department,
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              ariaLabel="Org chart"
              /*
                The export rasterises the LIVE cards, so withheld nodes stay
                statements rather than turning back into names on the way out.
                The as-of date comes from the loaded chart, never the picker — an
                export describes the data on screen.
              */
              exportTitle="Org chart"
              exportCaption={asOf ? `Org chart as of ${asOf}` : undefined}
              exportFileName={asOf ? orgChartExportBase(asOf) : undefined}
              renderCard={(placed, state) => {
                const node = placed.node.data;
                const employeeId =
                  employmentToEmployee.get(node.employment_id) ?? "";
                return (
                  <ChartNode
                    focused={state.selected}
                    highlighted={state.matched}
                    inCycle={cycleEmployments.has(node.employment_id)}
                    childCount={placed.childCount}
                    name={node.display_name ?? withheldLabel(node).text}
                    jobTitle={node.job_title}
                    department={node.department}
                    workerClass={node.worker_class}
                    nameWithheld={isWithheld(node)}
                    // Belt and braces: the door already nulls this for a
                    // withheld node, and a face is not a thing to leak twice.
                    photoFileId={isWithheld(node) ? null : node.photo_file_id}
                    statementAuthored={withheldLabel(node).authored}
                    // No door for a withheld node — see `ChartNode.href`.
                    href={
                      isWithheld(node)
                        ? null
                        : hrEmployeeHref(employeeId, null, { org: orgRef })
                    }
                    /*
                      🚨 A WITHHELD NODE GETS NO DOORS AT ALL, AND THE REPORTS
                      LINK IS THE ONE THAT LOOKED HARMLESS. It carries
                      `managerEmployeeId` — a working handle to the person whose
                      name we just withheld — so the node suppressed the name and
                      then published the id needed to go and read it. Verified
                      live: the id appeared in the href on a peer's chart.

                      It was also a DEAD END for that viewer. The directory
                      filtered by an opted-out manager returns 0 rows for a peer
                      (measured), so a node promising "2 reports" led to a list
                      showing none.

                      The count still renders, as text: the structure is not the
                      thing being hidden. Same treatment the as-of view already
                      gets, for the same reason — no door where the door cannot
                      answer.
                    */
                    reportsHref={
                      isAsOfView || isWithheld(node)
                        ? null
                        : hrPeopleHref({
                            org: orgRef,
                            managerEmployeeId: employeeId,
                          })
                    }
                  />
                );
              }}
            />
          </div>
        )}

        {/* ── Nobody is silently dropped ─────────────────────────────────── */}
        <UnplacedTray
          unplaced={data?.unplaced ?? []}
          org={orgRef}
          employmentToEmployee={employmentToEmployee}
        />
      </div>
    </HrPageState>
  );
}

// ── Canvas pieces ───────────────────────────────────────────────────────────

/**
 * 🚨 THE SUPPRESSION KEY IS THE NAME, NOT THE PREFERENCE. `hr_org_chart` sends
 * `opted_out` as the PERSON'S CHOICE — it is `true` for HR too — while
 * `display_name` is null exactly when THIS viewer may not have the name. Keying on
 * `opted_out` would blank the name for the people entitled to see it; verified live,
 * where one node arrives `{display_name: null, opted_out: true}` for a peer and
 * `{display_name: 'Priya Raman', opted_out: true}` for an hr_admin.
 */
function isWithheld(node: {
  display_name: string | null;
}): boolean {
  return node.display_name === null || node.display_name === "";
}

/**
 * What a withheld node says, and whose words they are.
 *
 * 🚨 THE ORG'S SENTENCE WINS, AND OURS MUST NOT IMPERSONATE IT. `hr_org_chart`
 * deliberately writes no default — composing a sentence on an employer's behalf is
 * exactly what `disclosure_existence_statements` exists to prevent — so when the knob
 * is empty the client supplies wording of its own. That fallback is rendered as
 * SYSTEM TEXT (see `ChartNode`), never as prose, so nobody can mistake it for
 * something their employer wrote about them.
 */
function withheldLabel(node: { disclosure_statement?: string | null }): {
  text: string;
  authored: boolean;
} {
  const statement = node.disclosure_statement?.trim();
  if (statement) return { text: statement, authored: true };
  return { text: "Name withheld", authored: false };
}

function ChartNode(props: {
  focused: boolean;
  highlighted: boolean;
  inCycle: boolean;
  /** Direct reports in the data. Collapsing the team is the chart's own toggle, which names nobody. */
  childCount: number;
  name: string;
  jobTitle: string | null;
  department: string | null;
  workerClass: string | null;
  /**
   * 🚨 NULL FOR A WITHHELD NODE. A person who opted out of the directory has a
   * node — structure is not the thing being hidden — but no door, because the
   * viewer cannot open their record and a link that refuses is a worse answer
   * than no link. Nothing else about the node changes.
   */
  href: string | null;
  reportsHref: string | null;
  /** True when `name` is a disclosure statement rather than somebody's name. */
  nameWithheld: boolean;
  /**
   * 🚨 THE CURRENT DIRECTORY PHOTO — AND NULL FOR A WITHHELD NODE.
   *
   * SPEC-EMPLOYEES §5.2 (amended 2026-08-28) names the photo on the chart: the
   * chart is Directory-tier data and SPEC-ACCESS §3.1's directory contract
   * already discloses the photo, so rendering it adds no disclosure.
   *
   * It is deliberately NOT as-of scoped. §5.2's as-of applies to POSITION facts —
   * who reported to whom on a date — and a photo identifies the PERSON, not the
   * date; showing a historical chart with today's faces is correct, and there is
   * no photo history to show even if it were not.
   *
   * The door already ties this to the name (`case when sup.nm is not null then
   * e.photo_file_id end`), so a withheld node arrives with none. This is passed
   * null again at the call site anyway: a face identifies somebody far more than
   * a name does, and this is the one node where that must not happen twice by
   * accident.
   */
  photoFileId: string | null;
  /**
   * True when the statement is the ORGANIZATION'S OWN WORDS. False when it is this
   * app's fallback, which must be styled so it cannot be read as the employer's.
   */
  statementAuthored: boolean;
}) {
  return (
    <div
      className={cn(
        // The transition is what makes an as-of change LEGIBLE AS A CHANGE:
        // a person who moved slides to their new place instead of the whole
        // chart blinking into a different arrangement.
        // The chart glides the card to its new place on an as-of change, which
        // makes a moved person LEGIBLE AS A CHANGE rather than a redraw.
        "flex h-full w-full flex-col justify-center rounded-lg border bg-card px-2.5 py-1.5 pb-3",
        props.focused
          ? "border-primary ring-2 ring-primary/30"
          : props.highlighted
            ? "border-primary/60"
            : "border-border",
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        {/* Absent on a withheld node — see `photoFileId`. */}
        {props.nameWithheld ? null : (
          <HrEmployeePhoto
            photoFileId={props.photoFileId}
            name={props.name}
            className="h-7 w-7"
            textClassName="text-[0.625rem]"
          />
        )}
        {props.href ? (
          <Link
            href={props.href}
            className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-foreground underline-offset-2 hover:text-primary hover:underline lg:min-h-0"
          >
            <span className="truncate text-xs font-semibold">{props.name}</span>
            <span className="truncate text-[0.6875rem] font-normal text-muted-foreground">
              {[props.jobTitle, props.department].filter(Boolean).join(" · ")}
            </span>
          </Link>
        ) : (
          /*
            The withheld node. It is a STATEMENT, not a name, so it is not
            truncated to one line and not styled as a person — and it carries no
            door. The subtitle still renders whatever the server chose to send:
            if the door withholds the job title too, nothing appears, and that is
            the server's decision to make rather than this component's.
          */
          <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center lg:min-h-0">
            {props.statementAuthored ? (
              /* The employer's own sentence, rendered as prose — their words. */
              <span className="text-[0.6875rem] italic leading-snug text-muted-foreground">
                {props.name}
              </span>
            ) : (
              /*
                🚨 OUR FALLBACK, AND IT MUST NOT LOOK LIKE A SENTENCE THE ORG WROTE.
                The door refuses to compose one; this is the app filling a gap, so it
                is rendered as UI chrome — a bordered, uppercase, tracked label — and
                not as prose. A reader can tell at a glance that nobody at their
                employer chose these words.
              */
              <span className="inline-flex w-fit items-center rounded-sm border border-dashed border-border px-1 py-px text-[0.5625rem] font-medium uppercase tracking-wide text-muted-foreground">
                {props.name}
              </span>
            )}
            {[props.jobTitle, props.department].filter(Boolean).length > 0 ? (
              <span className="truncate text-[0.6875rem] font-normal text-muted-foreground">
                {[props.jobTitle, props.department].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </div>
        )}
        <HrWorkerClassChip workerClass={props.workerClass} />
      </div>

      <div className="flex items-center gap-1">
        {props.childCount > 0 ? (
          <>
            {props.reportsHref ? (
              <Link
                href={props.reportsHref}
                className="inline-flex min-h-11 min-w-11 items-center text-[0.6875rem] text-muted-foreground underline-offset-2 hover:text-primary hover:underline lg:min-h-0 lg:min-w-0"
              >
                {props.childCount}{" "}
                {props.childCount === 1 ? "report" : "reports"}
              </Link>
            ) : (
              <span
                className="text-[0.6875rem] text-muted-foreground"
                title="Historical count — open today's chart to browse this team."
              >
                {props.childCount}{" "}
                {props.childCount === 1 ? "report" : "reports"}
              </span>
            )}
          </>
        ) : null}

        {/* 🚨 A CYCLE IS SHOWN AND HAS A DOOR, never an infinite layout. */}
        {props.inCycle ? (
          <button
            type="button"
            onClick={() =>
              void announceComingSoon("hr.people.bulk-manager-assignment")
            }
            className="ml-auto inline-flex items-center gap-1 rounded-sm text-[0.6875rem] text-warning underline-offset-2 hover:underline"
            title="This person's reporting line loops back on itself."
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Loop
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * `unplaced[]` — employments with no primary assignment or no manager on the
 * as-of date. An explicit tray, always, because a chart that quietly omits
 * people is a chart that gets believed.
 */
function UnplacedTray({
  unplaced,
  org,
  employmentToEmployee,
}: {
  unplaced: HrOrgChartUnplaced[];
  org: string | null;
  employmentToEmployee: Map<string, string>;
}) {
  if (unplaced.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-border bg-muted/20 px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground">
          Not yet placed ({unplaced.length})
        </span>
        <span className="text-xs text-muted-foreground">
          These people are employed here but have no reporting line on this
          date.
        </span>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {/*
          🚨 THE TRAY OBEYS THE SAME RULE AS THE CANVAS — the door's own words:
          "unplaced people are people. The same rule, one array over." A withheld
          person still appears (omitting them is the disclosure this whole design
          avoids) but carries no door, because the record behind it would refuse.
        */}
        {unplaced.map((person) => {
          const withheld = isWithheld(person);
          const label = person.display_name ?? withheldLabel(person).text;
          const authored = withheldLabel(person).authored;

          if (withheld) {
            return (
              <li key={person.employment_id}>
                <span
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-dashed border-border bg-card px-2 py-1 lg:min-h-0",
                    authored
                      ? "text-xs italic text-muted-foreground"
                      : "text-[0.5625rem] font-medium uppercase tracking-wide text-muted-foreground",
                  )}
                  title={person.reason}
                >
                  {label}
                </span>
              </li>
            );
          }

          return (
            <li key={person.employment_id}>
              <Link
                href={hrEmployeeHref(
                  person.employee_id ||
                    employmentToEmployee.get(person.employment_id) ||
                    "",
                  "job",
                  { org },
                )}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-accent lg:min-h-0"
                title={person.reason}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Never an empty canvas. */
function NoManagerData({
  org,
  canFix,
}: {
  org: string | null;
  canFix: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-start justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-4 sm:p-6">
        <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
        <h2 className="mt-2 text-sm font-semibold text-foreground">
          No managers assigned yet
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign managers and the chart draws itself.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
          >
            <Link href={hrPeopleHref({ org })}>Open the directory</Link>
          </Button>
          {canFix ? (
            <Button
              variant="primary"
              type="button"
              onClick={() =>
                void announceComingSoon("hr.people.bulk-manager-assignment")
              }
            >
              Assign managers
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * A focused node whose employment did not exist on the as-of date. It says so,
 * and it opens their actual spell dates — never an empty canvas and never a
 * silent drop of the thing the URL asked for.
 */
function NotEmployedOnDate({
  asOf,
  employeeId,
  org,
}: {
  asOf: string | null;
  employeeId: string;
  org: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-start justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">
          Not employed on {asOf ? formatFullDate(asOf) : "that date"}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" asChild>
            <Link href={hrEmployeeHref(employeeId, "job", { org })}>
              See their employment dates
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link href={hrOrgChartHref({ org, focus: employeeId })}>
              Show today&apos;s chart
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
