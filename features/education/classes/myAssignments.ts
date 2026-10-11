// features/education/classes/myAssignments.ts
//
// The learner's CROSS-CLASS to-do: every deck/quiz assigned to them in every
// class they belong to, with their own status and the class it came from.
// Google Classroom's To-do is the bar — one list, across every class, newest
// due first, each row opening the work itself.
//
// Built only from the existing published reads (never a second resolver):
//   edu_my_classes()                         → the classes they joined (any org)
//   edu_class_student_progress(class, self)  → that class's assignments + my status
// Titles come from the shared entity-title service; routes from the education
// entityRoutes map. A class the caller OWNS is skipped — a teacher's own
// assignments are not their to-do. The active organization is never consulted:
// edu_my_classes reads across every organization the learner belongs to.
//
// Consumers: the Education home ("Assigned to you" block) and the study
// planner (assignments become dated plan blocks).

"use client";

import type { LucideIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fetchEntityTitles } from "@/features/scopes/service/entityTitles";
import {
  educationEntityRoute,
  educationEntityStudyHref,
} from "@/features/education/data/entityRoutes";
import { getClassStudentProgress, getMyClasses } from "./service";
import type { AssignmentStatus } from "./types";

export interface MyAssignment {
  key: string;
  classId: string;
  className: string;
  /** The class hub — where the assignment's context lives. */
  classHref: string;
  token: string;
  resourceId: string;
  title: string;
  /** ISO date (YYYY-MM-DD) or null. */
  dueDate: string | null;
  status: AssignmentStatus;
  scorePct: number | null;
  /** Opens the assigned thing (study/do link, else its view page). */
  href: string | null;
  Icon: LucideIcon;
}

export function classHubHref(classId: string): string {
  return `/education/classes/${classId}`;
}

/** Sort: dated first (soonest/overdue first), undated last, then title. */
function byDue(a: MyAssignment, b: MyAssignment): number {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate)
    return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return a.title.localeCompare(b.title);
}

/**
 * Every assignment across the learner's joined classes. Throws when the class
 * list itself cannot be read (a fault, never "no assignments"); a single class
 * whose read fails is logged and skipped so one class cannot blank the rest.
 */
export async function loadMyAssignments(): Promise<MyAssignment[]> {
  const { data: sessionData } = await createClient().auth.getSession();
  const userId = sessionData.session?.user.id ?? null;
  if (!userId) return [];

  const classes = (await getMyClasses()).filter(
    (c) => c.myRole !== "owner" && c.myStatus === "active",
  );
  if (classes.length === 0) return [];

  const perClass = await Promise.all(
    classes.map(async (c) => {
      try {
        const rows = await getClassStudentProgress(c.classId, userId);
        return rows.map((p) => ({ cls: c, p }));
      } catch (error) {
        console.error(
          `[education/assignments] class ${c.classId} assignments failed:`,
          error,
        );
        return [];
      }
    }),
  );
  const flat = perClass.flat();
  if (flat.length === 0) return [];

  // One title read per token (cached + chunked by the shared service).
  const idsByToken = new Map<string, string[]>();
  for (const { p } of flat) {
    const ids = idsByToken.get(p.token) ?? [];
    ids.push(p.resourceId);
    idsByToken.set(p.token, ids);
  }
  const titlesByToken = new Map<string, Map<string, string>>();
  await Promise.all(
    Array.from(idsByToken.entries()).map(async ([token, ids]) => {
      try {
        titlesByToken.set(token, await fetchEntityTitles(token, ids));
      } catch (error) {
        console.error(`[education/assignments] ${token} titles failed:`, error);
        titlesByToken.set(token, new Map());
      }
    }),
  );

  return flat
    .map(({ cls, p }): MyAssignment => {
      const route = educationEntityRoute(p.token);
      return {
        key: `${cls.classId}:${p.token}:${p.resourceId}`,
        classId: cls.classId,
        className: cls.name || "Class",
        classHref: classHubHref(cls.classId),
        token: p.token,
        resourceId: p.resourceId,
        title:
          titlesByToken.get(p.token)?.get(p.resourceId) ?? route.label,
        dueDate: p.dueDate ? p.dueDate.slice(0, 10) : null,
        status: p.status,
        scorePct: p.scorePct,
        href: educationEntityStudyHref(p.token, p.resourceId),
        Icon: route.Icon,
      };
    })
    .sort(byDue);
}

/** The to-do slice: everything not yet completed. */
export function openAssignments(all: MyAssignment[]): MyAssignment[] {
  return all.filter((a) => a.status !== "completed");
}
