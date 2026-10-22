// The class hub scope says, per list, whether it is loading, ready or failed
// (feedback edfc7338: an agent saw neither assignments nor study_content and
// could not tell a slow read from a broken one).

import {
  buildClassHubMemberScope,
  buildClassHubOwnerScope,
} from "../classHubSurfaceScope";
import type { UseClassAccessReturn } from "../hooks/useClassAccess";
import type { UseClassAssignmentsReturn } from "../hooks/useClassAssignments";
import type { UseClassContentReturn } from "../hooks/useClassContent";
import type { UseClassRosterReturn } from "../hooks/useClassRoster";
import type {
  UseClassProgressOverviewReturn,
  UseMyClassProgressReturn,
} from "../hooks/useClassProgress";
import type { ClassAccessState, StudyClass } from "../types";

const cls = {
  id: "629c8cd4-87d2-4c70-8f7e-49a38117bb1f",
  slug: "agent-test-chemistry",
  name: "Agent Test Chemistry",
  description: "",
  organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f",
  settings: { accessMode: "open", examDates: [] },
} as unknown as StudyClass;

const access = {
  state: { myStatus: "active", memberCount: 1, pendingCount: 0 },
} as unknown as UseClassAccessReturn;

const read = <T,>(over: Partial<{ loading: boolean; error: string | null }> & T) =>
  ({ loading: false, error: null, ...over }) as T & { loading: boolean; error: string | null };

const roster = read({ members: [] }) as unknown as UseClassRosterReturn;
const progress = read({ overview: { students: [] } }) as unknown as UseClassProgressOverviewReturn;
const assignmentsReady = read({
  assignments: [
    { token: "fc_set", resourceId: "d1", title: "Moles deck", dueDate: null, href: "/x" },
  ],
}) as unknown as UseClassAssignmentsReturn;
const contentReady = read({
  groups: [
    {
      group: "Flashcards",
      items: [{ token: "fc_set", entityId: "d2", title: "Bonds", href: "/y" }],
    },
  ],
  totalCount: 1,
}) as unknown as UseClassContentReturn;

const owner = (
  assignments: UseClassAssignmentsReturn,
  content: UseClassContentReturn,
) =>
  buildClassHubOwnerScope({
    classParam: "agent-test-chemistry",
    cls,
    access,
    roster,
    assignments,
    progress,
    content,
  }) as unknown as Record<string, unknown>;

describe("class hub scope — owner", () => {
  it("emits assignments and study_content once loaded, and says they are ready", () => {
    const scope = owner(assignmentsReady, contentReady);
    expect(scope.assignments).toHaveLength(1);
    expect(scope.study_content).toHaveLength(1);
    expect(scope.study_content_count).toBe(1);
    expect(scope.load_status).toEqual({
      roster: "ready",
      assignments: "ready",
      class_progress: "ready",
      study_content: "ready",
    });
  });

  it("omits a list while it loads and says so", () => {
    const scope = owner(
      { ...assignmentsReady, loading: true },
      { ...contentReady, loading: true },
    );
    expect(scope).not.toHaveProperty("assignments");
    expect(scope).not.toHaveProperty("study_content");
    expect(scope.load_status).toMatchObject({
      assignments: "loading",
      study_content: "loading",
    });
  });

  it("names a failed read instead of looking like it is still loading", () => {
    const scope = owner(
      { ...assignmentsReady, error: "not authorized to view this class's assignments" },
      { ...contentReady, error: "timeout" },
    );
    expect(scope).not.toHaveProperty("assignments");
    expect(scope.load_status).toMatchObject({
      assignments: "failed: not authorized to view this class's assignments",
      study_content: "failed: timeout",
    });
  });
});

describe("class hub scope — member", () => {
  const state = {
    myStatus: "active",
    classId: cls.id,
    slug: cls.slug,
    name: cls.name,
    description: "",
    accessMode: "open",
  } as unknown as ClassAccessState;
  const myProgress = read({ progress: [] }) as unknown as UseMyClassProgressReturn;

  it("emits my_assignments and study_content with their load state", () => {
    const scope = buildClassHubMemberScope({
      classParam: cls.slug!,
      access,
      state,
      roster,
      assignments: assignmentsReady,
      myProgress,
      content: contentReady,
    }) as unknown as Record<string, unknown>;
    expect(scope.my_assignments).toHaveLength(1);
    expect(scope.study_content).toHaveLength(1);
    expect(scope.load_status).toEqual({
      roster: "ready",
      my_assignments: "ready",
      study_content: "ready",
    });
  });

  it("says my_assignments is loading while either read is", () => {
    const scope = buildClassHubMemberScope({
      classParam: cls.slug!,
      access,
      state,
      roster,
      assignments: assignmentsReady,
      myProgress: { ...myProgress, loading: true },
      content: contentReady,
    }) as unknown as Record<string, unknown>;
    expect(scope).not.toHaveProperty("my_assignments");
    expect(scope.load_status).toMatchObject({ my_assignments: "loading" });
  });
});
