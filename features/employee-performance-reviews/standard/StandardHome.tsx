"use client";

// /hr/performance — the STANDARD performance review home: the reviews I am in (mine, and the ones
// I write), and for an HR seat the employer's cycles with "New cycle". The 360 trial is a separate
// process at /hr/performance/360 and shares nothing with this.

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus, Target, Users } from "lucide-react";
import { Badge, Button, EmptyState } from "@ai-matrx/design-system/controls";
import { MatrxDataTable, type MatrxColumnDef, type MatrxDataTableCopyConfig } from "@ai-matrx/design-system/data-table";

import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useAfterCreateOpenAccessSetup } from "@/features/access-setup/afterCreate";
import { HrPageState } from "@/features/hr/shared/HrStates";
import { useHrContext } from "@/features/hr/shared/useHrContext";
import { hrPerformance360Href, hrPerformanceCycleHref, hrPerformanceGoalsHref, hrPerformanceReviewHref } from "@/features/hr/routes";

import { useReloadOnReviewsChanged } from "./invalidation";
import { NewCycleDialog } from "./NewCycleDialog";
import { toast } from "@/lib/toast";

import { listCycles, listMyReviews, listStartCandidates, myPeerRequests, startReview, type PeerRequest } from "./service";
import { dueOn, formatDay, nextStep, periodLabel, statusLabel, statusTone } from "./status";
import type { CycleSummary, ReviewSummary, StartCandidate } from "./types";

/** A person the viewer may start a review for, with the employer it would be filed under. */
type StartRow = StartCandidate & { organizationId: string; employerName: string };

const SEAT_LABEL: Record<string, string> = {
  employee: "Your review",
  manager: "You write",
  hr: "HR",
  skip_level: "Skip-level",
  upper_management: "Upper management",
};

/** A person may hold several seats on one review; the column names the first in this order. */
const roleLabel = (seats: readonly string[]): string => {
  const seat = Object.keys(SEAT_LABEL).find((s) => seats.includes(s)) ?? seats[0] ?? "";
  return SEAT_LABEL[seat] ?? seat;
};

/** `employerKey`: the scope's employers as JSON `[id, name][]` — a string, so the effect re-runs only when the scope changes. */
function useReviewsData(organizationId: string | null, employerKey: string) {
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const [cycles, setCycles] = useState<CycleSummary[] | null>(null);
  const [requests, setRequests] = useState<PeerRequest[]>([]);
  const [people, setPeople] = useState<StartRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useReloadOnReviewsChanged(reload);

  useEffect(() => {
    let live = true;
    void (async () => {
      const mine = await listMyReviews(organizationId);
      if (!live) return;
      if (!mine.ok) {
        setError(mine.message);
        return;
      }
      setReviews(mine.data);
      // Peer requests are a separate door; a failure here must not hide the reviews, and "none" is the common answer.
      void myPeerRequests().then((p) => live && p.ok && setRequests(p.data));
      // Who this person may start a review for, in every employer the list reads (direct reports;
      // everyone where they are HR). A list surface reads the scope's employers, never one active org.
      const employerList = JSON.parse(employerKey) as [string, string][];
      void Promise.all(
        employerList.map(async ([id, name]) => {
          const p = await listStartCandidates(id);
          return p.ok ? p.data.map((c) => ({ ...c, organizationId: id, employerName: name })) : [];
        }),
      ).then((rows) => live && setPeople(rows.flat()));
      if (!organizationId) {
        setCycles(null);
        return;
      }
      const cyc = await listCycles(organizationId);
      if (!live) return;
      // not_permitted is the normal answer for a person who is not an HR seat: no cycles section, no error.
      if (cyc.ok) setCycles(cyc.data);
      else if (cyc.reason === "not_permitted") setCycles(null);
      else setError(cyc.message);
    })();
    return () => {
      live = false;
    };
  }, [organizationId, employerKey, tick]);

  return { reviews, cycles, requests, people, error, reload };
}

export function StandardHome() {
  const hr = useHrContext();
  const org = hr.active?.organization_id ?? null;
  const orgRef = hr.orgRef;
  const employers = hr.scope.employers;
  const { reviews, cycles, requests, people, error, reload } = useReviewsData(
    org,
    JSON.stringify(employers.map((e) => [e.organization_id, e.name])),
  );
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [, startNavigation] = useTransition();
  const router = useRouter();
  const afterCreateOpenAccessSetup = useAfterCreateOpenAccessSetup();

  // access-setup PLAN §7: a manager (or HR) starts one review; People involved opens for it (§5b).
  const start = async (person: StartRow) => {
    if (starting) return;
    const ok = await confirm({
      title: `Start a review for ${person.name}?`,
      description: "They can begin their self-evaluation right away.",
      confirmLabel: "Start review",
    });
    if (!ok) return;
    setStarting(person.employmentId);
    const r = await startReview(person.employmentId, person.organizationId);
    setStarting(null);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    toast.success(`Review started for ${person.name}`);
    startNavigation(() => router.push(hrPerformanceReviewHref(r.data.reviewId, orgRef)));
    afterCreateOpenAccessSetup(r.data.accessSetup, person.name);
  };

  const reviewColumns: MatrxColumnDef<ReviewSummary>[] = [
    {
      id: "employee",
      header: "Employee",
      accessorFn: (r) => r.employeeName,
      filter: "text",
      width: 240,
      frozen: true,
      cell: (r) => (
        <Link className="hover:underline" href={hrPerformanceReviewHref(r.reviewId, orgRef)}>
          {r.employeeName}
        </Link>
      ),
    },
    { id: "cycle", header: "Cycle", accessorFn: (r) => r.cycleName, filter: "text", width: 220 },
    {
      id: "role",
      header: "Your role",
      accessorFn: (r) => roleLabel(r.seats),
      filter: "select",
      filterOptions: Object.values(SEAT_LABEL).map((v) => ({ value: v, label: v })),
      width: 130,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (r) => statusLabel(r.status),
      filter: "text",
      width: 150,
      cell: (r) => <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>,
    },
    { id: "next", header: "Next step", accessorFn: (r) => nextStep(r), filter: "text", width: 200 },
    { id: "due", header: "Due", accessorFn: (r) => dueOn(r), filter: "date", width: 130, cell: (r) => formatDay(dueOn(r)) },
  ];

  const cycleColumns: MatrxColumnDef<CycleSummary>[] = [
    {
      id: "name",
      header: "Cycle",
      accessorFn: (c) => c.name,
      filter: "text",
      width: 260,
      frozen: true,
      cell: (c) => (
        <Link className="hover:underline" href={hrPerformanceCycleHref(c.cycleId, orgRef)}>
          {c.name}
        </Link>
      ),
    },
    { id: "status", header: "Status", accessorFn: (c) => c.status, filter: "text", width: 110, cell: (c) => <Badge tone={c.status === "open" ? "primary" : "neutral"}>{c.status}</Badge> },
    { id: "period", header: "Period", accessorFn: (c) => c.periodEnd, filter: "date", width: 240, cell: (c) => periodLabel(c.periodStart, c.periodEnd) },
    { id: "reviews", header: "Reviews", accessorFn: (c) => c.reviewCount, filter: "number", width: 100 },
    { id: "done", header: "Acknowledged", accessorFn: (c) => c.acknowledgedCount, filter: "number", width: 130 },
    { id: "out", header: "Outstanding", accessorFn: (c) => c.outstandingCount, filter: "number", width: 120 },
  ];

  const peopleColumns: MatrxColumnDef<StartRow>[] = [
    { id: "name", header: "Employee", accessorFn: (p) => p.name, filter: "text", width: 240, frozen: true },
    ...(employers.length > 1
      ? [{ id: "employer", header: "Employer", accessorFn: (p: StartRow) => p.employerName, filter: "text" as const, width: 200 }]
      : []),
    {
      id: "relation",
      header: "Relation",
      accessorFn: (p) => (p.relation === "report" ? "Direct report" : "Employee"),
      filter: "select",
      filterOptions: [
        { value: "Direct report", label: "Direct report" },
        { value: "Employee", label: "Employee" },
      ],
      width: 140,
    },
    {
      id: "review",
      header: "Review",
      accessorFn: (p) => (p.openReviewId ? "Open" : "None"),
      filter: "text",
      width: 150,
      cell: (p) =>
        p.openReviewId ? (
          <Link className="hover:underline" href={hrPerformanceReviewHref(p.openReviewId, orgRef)}>
            Open review
          </Link>
        ) : (
          <Button variant="outline" disabled={starting !== null} onClick={() => void start(p)}>
            {starting === p.employmentId ? "Starting…" : "Start review"}
          </Button>
        ),
    },
  ];
  const peopleCopy: MatrxDataTableCopyConfig<StartRow> = {
    label: "person to review",
    listLabel: "people to review (this view)",
    location: "Performance",
    rowKind: "review-candidate",
    listKind: "review-candidate-list",
    rowDescription: "One person you may start a review for, and whether one is open.",
    listDescription: "The people you may start a review for, as currently shown.",
    humanRow: (p) => [`Employee: ${p.name}`, `Relation: ${p.relation === "report" ? "Direct report" : "Employee"}`, `Open review: ${p.openReviewId ? "yes" : "no"}`].join("\n"),
  };

  const requestColumns: MatrxColumnDef<PeerRequest>[] = [
    {
      id: "employee",
      header: "Feedback on",
      accessorFn: (r) => r.employeeName,
      filter: "text",
      width: 240,
      frozen: true,
      cell: (r) => (
        <Link className="hover:underline" href={hrPerformanceReviewHref(r.reviewId, orgRef)}>
          {r.employeeName}
        </Link>
      ),
    },
    { id: "cycle", header: "Cycle", accessorFn: (r) => r.cycleName, filter: "text", width: 220 },
    { id: "due", header: "Due", accessorFn: (r) => r.dueOn, filter: "date", width: 130, cell: (r) => formatDay(r.dueOn) },
    { id: "status", header: "Status", accessorFn: (r) => (r.responseStatus === "submitted" ? "Sent" : "To do"), filter: "text", width: 110, cell: (r) => <Badge tone={r.responseStatus === "submitted" ? "success" : "warning"}>{r.responseStatus === "submitted" ? "Sent" : "To do"}</Badge> },
  ];
  const requestCopy: MatrxDataTableCopyConfig<PeerRequest> = {
    label: "feedback request",
    listLabel: "feedback requests (this view)",
    location: "Performance",
    rowKind: "peer-feedback-request",
    listKind: "peer-feedback-request-list",
    rowDescription: "One request to give peer feedback: who it is about, the cycle and the due date.",
    listDescription: "The peer feedback requests you have received, as currently shown.",
    humanRow: (r) => [`Feedback on: ${r.employeeName}`, `Cycle: ${r.cycleName}`, `Due: ${formatDay(r.dueOn)}`].join("\n"),
  };

  const reviewCopy: MatrxDataTableCopyConfig<ReviewSummary> = {
    label: "performance review",
    listLabel: "performance reviews (this view)",
    location: "Performance",
    rowKind: "performance-review",
    listKind: "performance-review-list",
    rowDescription: "One performance review: employee, cycle, your role, status and next step.",
    listDescription: "The performance reviews you are part of, as currently shown.",
    humanRow: (r) => [`Employee: ${r.employeeName}`, `Cycle: ${r.cycleName}`, `Status: ${statusLabel(r.status)}`, `Next step: ${nextStep(r)}`].join("\n"),
  };
  const cycleCopy: MatrxDataTableCopyConfig<CycleSummary> = {
    label: "review cycle",
    listLabel: "review cycles (this view)",
    location: "Performance",
    rowKind: "review-cycle",
    listKind: "review-cycle-list",
    rowDescription: "One review cycle: period, status and how many reviews are acknowledged.",
    listDescription: "The review cycles of the selected employer, as currently shown.",
    humanRow: (c) => [`Cycle: ${c.name}`, `Status: ${c.status}`, `Reviews: ${c.reviewCount}`, `Acknowledged: ${c.acknowledgedCount}`].join("\n"),
  };

  const loading = reviews === null && error === null;

  return (
    <HrPageState loading={loading} error={error ? new Error(error) : null} onRetry={reload} operation="Performance reviews" employerScope="all" variant="table">
      <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">
        <div className="mx-3 mt-3 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" icon={<Target />}>
              <Link href={hrPerformanceGoalsHref(orgRef)}>Goals</Link>
            </Button>
            <Button asChild variant="outline" icon={<Users />}>
              <Link href={hrPerformance360Href(orgRef)}>360 review (trial)</Link>
            </Button>
          </div>
          <section aria-label="My reviews">
            {reviews && reviews.length > 0 ? (
              <MatrxDataTable<ReviewSummary>
                tableId="hr/performance/my-reviews"
                data={reviews}
                columns={reviewColumns}
                getRowId={(r) => r.reviewId}
                pageSize={0}
                density="condensed"
                viewTabs={false}
                toolbar={{ title: "My reviews", searchPlaceholder: "Search reviews" }}
                detail={{ enabled: false }}
                copy={reviewCopy}
                emptyState={{ title: "No reviews yet" }}
              />
            ) : (
              <EmptyState icon={<ClipboardCheck />} title="No reviews yet" line="Reviews you are in, or write, appear here" />
            )}
          </section>

          {people.length > 0 ? (
            <section aria-label="Start a review">
              <MatrxDataTable<StartRow>
                tableId="hr/performance/start-a-review"
                data={people}
                columns={peopleColumns}
                getRowId={(p) => p.employmentId}
                pageSize={0}
                density="condensed"
                viewTabs={false}
                toolbar={{ title: "Start a review", searchPlaceholder: "Search people" }}
                detail={{ enabled: false }}
                copy={peopleCopy}
                emptyState={{ title: "No one to review" }}
              />
            </section>
          ) : null}

          {requests.length > 0 ? (
            <section aria-label="Feedback requested">
              <MatrxDataTable<PeerRequest>
                tableId="hr/performance/feedback-requested"
                data={requests}
                columns={requestColumns}
                getRowId={(r) => r.reviewId}
                pageSize={0}
                density="condensed"
                viewTabs={false}
                toolbar={{ title: "Feedback requested", searchPlaceholder: "Search requests" }}
                detail={{ enabled: false }}
                copy={requestCopy}
                emptyState={{ title: "No requests" }}
              />
            </section>
          ) : null}

          {org && cycles !== null ? (
            <section aria-label="Review cycles">
              {cycles.length > 0 ? (
                <MatrxDataTable<CycleSummary>
                  tableId="hr/performance/cycles"
                  data={cycles}
                  columns={cycleColumns}
                  getRowId={(c) => c.cycleId}
                  pageSize={0}
                  density="condensed"
                  viewTabs={false}
                  toolbar={{
                    title: "Cycles",
                    searchPlaceholder: "Search cycles",
                    add: { onAdd: () => setCreating(true) },
                  }}
                  detail={{ enabled: false }}
                  copy={cycleCopy}
                  emptyState={{ title: "No cycles yet" }}
                />
              ) : (
                <EmptyState
                  icon={<ClipboardCheck />}
                  title="No review cycles yet"
                  action={
                    <Button icon={<Plus />} variant="primary" onClick={() => setCreating(true)}>
                      New cycle
                    </Button>
                  }
                />
              )}
            </section>
          ) : null}
        </div>
      </div>
      {org ? <NewCycleDialog open={creating} onOpenChange={setCreating} organizationId={org} orgRef={orgRef} /> : null}
    </HrPageState>
  );
}
