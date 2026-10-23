"use client";

// features/hr/shared/HrRecordPageHeader.tsx
//
// AN HR RECORD CRUMB OPENS EVERY OTHER RECORD OF ITS KIND (crumb-door law, features/shell/FEATURE.md
// § Every crumb is a door). HR lists read through the employer scope the /hr layout resolved
// (`useHrContext`), so their reads cannot be context-free loaders in
// `features/shell/breadcrumbs/record-siblings.ts`. This header builds the loader here, from the SAME
// read each list page uses, and hands it to `RecordPageHeader record.loadSiblings` — nothing is read
// until the person opens the record's door. Switching keeps the view and the `?org=` (the address
// with the record's segment swapped).
import type { ComponentProps } from "react";

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import type { CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import { SIBLINGS_MAX, siblingHref } from "@/features/shell/breadcrumbs/record-siblings";
import { useHrContext } from "@/features/hr/shared/useHrContext";
import { fanOutHr, toRowEmployer } from "@/features/hr/shared/hrScope";

/** The HR record kinds whose crumb opens the others (each reads what its own list page reads). */
export type HrSiblingKind = "relations-case" | "task" | "time-off-policy" | "review-cycle" | "review";

type Row = { id: string; label: string };
type Reader = (ctx: ReturnType<typeof useHrContext>) => Promise<Row[]>;

const READERS: Record<HrSiblingKind, Reader> = {
  // /hr/people/relations — `useHrRelationsCases`: one read per employer in scope, newest first.
  "relations-case": async ({ scope }) => {
    const { fetchHrRelationsCases } = await import("@/features/hr/people/relations/service");
    const answer = await fanOutHr(scope.employers.map(toRowEmployer), (organizationId) => fetchHrRelationsCases(organizationId));
    if (!answer.ok) return [];
    return answer.data.parts
      .flatMap((p) => p.data.cases)
      .sort((a, b) => (b.occurredOn ?? "").localeCompare(a.occurredOn ?? ""))
      .map((c) => ({ id: c.id, label: [c.kindLabel, c.subjectName].filter(Boolean).join(" · ") || "Case" }));
  },
  // /hr/tasks — `useHrInbox` "mine": what waits on me, then the queue rows I can see.
  task: async () => {
    const { fetchHrInbox } = await import("@/features/hr/tasks/service");
    const envelope = await fetchHrInbox("mine");
    if (!envelope.granted) return [];
    const seen = new Set<string>();
    return [...envelope.data.needs_my_decision, ...envelope.data.scope_rows]
      .filter((r) => !seen.has(r.instance_id) && Boolean(seen.add(r.instance_id)))
      .map((r) => ({ id: r.instance_id, label: r.title || r.flow_label || r.step_label || "HR request" }));
  },
  // /hr/me/time-off — `MyTimeOffSurface`: my policies (each opens its ledger).
  "time-off-policy": async ({ active }) => {
    const { fetchMyTimeOff } = await import("@/features/hr/leave/api/service");
    const res = await fetchMyTimeOff({ employmentId: active?.employment_id ?? null });
    if (!res.ok) return [];
    return res.data.policies.flatMap((p) => (p.policyId ? [{ id: p.policyId, label: p.policyName || "Time-off policy" }] : []));
  },
  // /hr/performance — `StandardHome`: the employer's review cycles.
  "review-cycle": async ({ active }) => {
    if (!active) return [];
    const { listCycles } = await import("@/features/employee-performance-reviews/standard/service");
    const res = await listCycles(active.organization_id);
    return res.ok ? res.data.cycles.map((c) => ({ id: c.cycleId, label: c.name || "Review cycle" })) : [];
  },
  // /hr/performance — `StandardHome`: my reviews.
  review: async ({ active }) => {
    const { listMyReviews } = await import("@/features/employee-performance-reviews/standard/service");
    const res = await listMyReviews(active?.organization_id ?? null);
    return res.ok ? res.data.map((r) => ({ id: r.reviewId, label: [r.employeeName, r.cycleName].filter(Boolean).join(" · ") || "Review" })) : [];
  },
};

/** The current address with the record swapped (keeps the view and `?org=`). */
function hrefFor(currentId: string, id: string): string {
  if (typeof window === "undefined") return "";
  return `${siblingHref(window.location.pathname, currentId, id)}${window.location.search}`;
}

/** A loader for the record's door: the kind's own list read, capped, the current record marked. */
export function useHrSiblingsLoader(kind: HrSiblingKind, currentId: string): () => Promise<CrumbOption[]> {
  const ctx = useHrContext();
  return async () => {
    const rows = await READERS[kind](ctx);
    return rows.slice(0, SIBLINGS_MAX).map((r) => ({ label: r.label, href: hrefFor(currentId, r.id), active: r.id === currentId }));
  };
}

type Props = Omit<ComponentProps<typeof RecordPageHeader>, "record" | "level"> & {
  record: NonNullable<ComponentProps<typeof RecordPageHeader>["record"]>;
  siblingsOf: { kind: HrSiblingKind; id: string };
};

/** `RecordPageHeader` for an HR record, its door reading the kind's own list (server pages render this). */
export function HrRecordPageHeader({ siblingsOf, record, ...rest }: Props) {
  const loadSiblings = useHrSiblingsLoader(siblingsOf.kind, siblingsOf.id);
  return <RecordPageHeader {...rest} record={{ ...record, loadSiblings }} />;
}
