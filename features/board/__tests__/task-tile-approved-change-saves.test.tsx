/**
 * An approved change to a task's status, priority or due date SAVES to the task at once (Arman,
 * 2026-10-21: "Yes. As long as you don't mess up and create it in a way that constantly causes
 * renders and slowness."). The tile never says "Unsaved" for it, and the save is cheap:
 *
 *  - exactly ONE record write, carrying ONLY the approved field (the person's other staged edits,
 *    e.g. a title being typed, keep waiting for their Save);
 *  - only the touched tile re-renders; a neighbouring task tile renders zero extra times;
 *  - the three targets are entity-mode in the task manifest, so the approval card and the agent's
 *    receipt say "saved", never "you still review and save".
 *
 * Real store, real slices, real thunks; only the network (`taskService`) is stubbed.
 */
import React, { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(tree: ReactNode) {
  const root = createRoot(document.createElement("div"));
  act(() => root.render(tree));
  return root;
}
import { configureStore } from "@reduxjs/toolkit";

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/projectsDb", () => ({ projectsDb: () => ({}) }));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: () => "u1", getUserId: () => "u1" }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async (id: string) => id }));
jest.mock("@/features/agent-context/redux/hierarchyThunks", () => ({
  invalidateAndRefetchFullContext: () => ({ type: "test/noop" }),
}));
jest.mock("@/features/scopes/redux/thunks/setEntityScopes", () => ({ setEntityScopes: jest.fn() }));
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: async () => true }));

const updateTask = jest.fn();
const completeTask = jest.fn();
jest.mock("@/features/tasks/services/taskService", () => ({
  updateTask: (...args: unknown[]) => updateTask(...args),
  completeTask: (...args: unknown[]) => completeTask(...args),
  updateTaskLabels: jest.fn(async () => true),
  TASK_LABEL_OPTIONS: [],
}));
// Unrelated item hooks the status module imports; the task path uses the real slices.
jest.mock("@/features/notes/redux/selectors", () => ({ selectNoteById: () => () => undefined }));
jest.mock("@/features/files/redux/selectors", () => ({ selectFileById: () => undefined }));
jest.mock("@/features/workflow-runtime/run-status", () => ({ RUN_STATUS_LABEL: {} }));
jest.mock("@/features/meet/redux/meetingsSlice", () => ({ selectMeetingEntry: () => undefined }));

import tasksReducer, { upsertTaskWithLevel } from "@/features/agent-context/redux/tasksSlice";
import taskUiReducer, { patchTaskEdit } from "@/features/tasks/redux/taskUiSlice";
import { saveTaskFieldNowThunk } from "@/features/tasks/redux/thunks";
import { tasksManifest } from "@/features/surfaces/manifests/tasks.manifest";
import { buildSurfaceWriteApprovalChange } from "@ai-matrx/chat/agents/redux/execution-system/thunks/surface-write-approval-change";
import type { SurfaceWriteApprovalProposal } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { useTaskStatus } from "../items/item-status";
import type { NodeSource } from "../board/document";
import type { TaskRecord } from "@/features/agent-context/redux/tasksSlice";

function task(id: string, over: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id,
    title: `Task ${id}`,
    status: "inbox",
    priority: null,
    due_date: null,
    assignee_id: null,
    project_id: null,
    parent_task_id: null,
    organization_id: "org-1",
    description: null,
    settings: null,
    created_at: null,
    created_by: "u1",
    ...over,
  } as TaskRecord;
}

function makeStore() {
  const store = configureStore({
    reducer: { tasks: tasksReducer, tasksUi: taskUiReducer },
    middleware: (get) => get({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(upsertTaskWithLevel({ record: task("t1"), level: "full-data" }));
  store.dispatch(upsertTaskWithLevel({ record: task("t2"), level: "full-data" }));
  return store;
}

const renders: Record<string, number> = {};
const labels: Record<string, string | undefined> = {};
function Tile({ id }: { id: string }) {
  renders[id] = (renders[id] ?? 0) + 1;
  const status = useTaskStatus({ kind: "entity", entity: "task", id } as NodeSource);
  labels[id] = status?.label;
  return null;
}

beforeEach(() => {
  updateTask.mockReset();
  updateTask.mockImplementation(async (id: string, patch: Record<string, unknown>) => ({
    ...task(id),
    ...patch,
  }));
  for (const k of Object.keys(renders)) delete renders[k];
});

type Store = ReturnType<typeof makeStore>;
const save = (store: Store, patch: Parameters<typeof saveTaskFieldNowThunk>[0]["patch"]) =>
  act(async () => {
    await (store.dispatch as (a: unknown) => { unwrap: () => Promise<void> })(
      saveTaskFieldNowThunk({ taskId: "t1", patch }),
    ).unwrap();
  });

describe("an approved task change saves at once, cheaply", () => {
  it("writes the record once with only the approved field; the tile shows it, never Unsaved", async () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <Tile id="t1" />
        <Tile id="t2" />
      </Provider>,
    );
    expect(labels.t1).toBe("To do");
    const before = { ...renders };

    await save(store, { status: "active" });

    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith("t1", { status: "active" });
    expect(store.getState().tasks.entities.t1?.status).toBe("active");
    expect(store.getState().tasksUi.taskEdits.t1).toBeUndefined();
    expect(labels.t1).not.toBe("Unsaved");
    expect(labels.t1).not.toBe("To do");
    // Only the touched tile re-renders, once for its new status; the neighbour never.
    expect(renders.t2).toBe(before.t2);
    expect(renders.t1 - before.t1).toBeLessThanOrEqual(1);
  });

  it("keeps the person's other staged edits for their Save and drops only the saved field", async () => {
    const store = makeStore();
    store.dispatch(patchTaskEdit({ taskId: "t1", patch: { title: "Typing…", priority: "low" } }));
    const editsBefore = store.getState().tasksUi.taskEdits;

    await save(store, { priority: "high" });

    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith("t1", { priority: "high" });
    expect(store.getState().tasksUi.taskEdits.t1).toEqual({ title: "Typing…" });
    expect(store.getState().tasks.entities.t1?.priority).toBe("high");
    expect(editsBefore).not.toBe(store.getState().tasksUi.taskEdits);
  });

  it("leaves the draft map untouched when nothing for that field was staged", async () => {
    const store = makeStore();
    store.dispatch(patchTaskEdit({ taskId: "t2", patch: { title: "Other" } }));
    const editsBefore = store.getState().tasksUi.taskEdits;

    await save(store, { due_date: "2026-11-01" });

    expect(store.getState().tasksUi.taskEdits).toBe(editsBefore);
    expect(store.getState().tasks.entities.t1?.due_date).toBe("2026-11-01");
  });
});

describe("the task manifest declares them as saving targets", () => {
  it.each(["task_status", "task_priority", "task_due_date"])("%s is entity-mode", (name) => {
    const target = tasksManifest.writeTargets?.find((t) => t.name === name);
    expect(target?.mode).toBe("entity");
    expect(target?.description).not.toMatch(/still saves|Stages/);
    const change = buildSurfaceWriteApprovalChange({ target, value: "x" } as unknown as SurfaceWriteApprovalProposal);
    expect(change.description ?? "").not.toMatch(/you still review and save/);
  });

  it("title, description and labels still stage for the person's Save", () => {
    for (const name of ["task_title", "task_description", "task_labels"]) {
      expect(tasksManifest.writeTargets?.find((t) => t.name === name)?.mode).toBe("draft");
    }
  });
});
