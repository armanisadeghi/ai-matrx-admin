"use client";

// features/education/home/blocks/AssignedToYouBlock.tsx
//
// The cross-class "Assigned to you" to-do on the Education home — every deck or
// quiz a teacher assigned, across every class the learner belongs to, soonest
// due first (the Google Classroom To-do bar). Each row opens the assigned work;
// the class name opens its class hub. Renders only when something is open —
// the block's `signal` returns null otherwise.
//
// Rows reuse the class hub's own assignment display primitives
// (DueDateLabel / AssignmentStatusBadge / ScorePill) so an assignment looks the
// same here as inside its class.

import Link from "next/link";
import { ArrowUpRight, ClipboardList } from "lucide-react";
import {
  AssignmentStatusBadge,
  DueDateLabel,
  ScorePill,
} from "../../classes/components/assignmentDisplay";
import type { MyAssignment } from "../../classes/myAssignments";

/** Rows shown before deferring to the classes page. */
const VISIBLE_LIMIT = 6;

function AssignmentRow({ a }: { a: MyAssignment }) {
  const Icon = a.Icon;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        {a.href ? (
          <Link
            href={a.href}
            className="block truncate text-sm text-foreground hover:underline"
          >
            {a.title}
          </Link>
        ) : (
          <span className="block truncate text-sm text-foreground">
            {a.title}
          </span>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <Link
            href={a.classHref}
            className="max-w-[12rem] truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {a.className}
          </Link>
          <DueDateLabel dueDate={a.dueDate} />
          <AssignmentStatusBadge status={a.status} />
          {a.scorePct != null && <ScorePill scorePct={a.scorePct} />}
        </div>
      </div>
      {a.href && (
        <Link
          href={a.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          {a.status === "in_progress" ? "Continue" : "Start"}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </li>
  );
}

export function AssignedToYouBlock({
  assignments,
}: {
  assignments: MyAssignment[];
}) {
  const visible = assignments.slice(0, VISIBLE_LIMIT);
  const hidden = assignments.length - visible.length;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Assigned to you
          <span className="font-normal text-muted-foreground">
            ({assignments.length})
          </span>
        </h2>
        <Link
          href="/education/classes"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {hidden > 0 ? `All classes (+${hidden})` : "All classes"}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <ul className="space-y-1.5">
        {visible.map((a) => (
          <AssignmentRow key={a.key} a={a} />
        ))}
      </ul>
    </section>
  );
}
