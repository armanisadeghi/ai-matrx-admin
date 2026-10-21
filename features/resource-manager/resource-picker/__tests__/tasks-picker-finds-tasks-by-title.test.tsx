/**
 * "Bring in: Tasks" must find a task by its title, with or without a project.
 *
 * SUT: `TasksResourcePicker` search at the project level. It OWNS listing tasks
 * that match the query, including a task that belongs to no project (which is in
 * no project's own list). Doubles: the projects hook and the all-tasks read.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const task = (id: string, title: string, project_id: string | null) =>
  ({ id, title, project_id, status: "incomplete", description: null, priority: null, due_date: null }) as never;

const PROJECTS = [
  { id: "p1", name: "Turnover", tasks: [task("t1", "Schedule the painter", "p1")] },
];
const ALL = [task("t1", "Schedule the painter", "p1"), task("t2", "Order lanyards", null)];

jest.mock("@/features/tasks/hooks/useTaskManager", () => ({
  useProjectsWithTasks: () => ({ projects: PROJECTS, loading: false, error: null, refresh: jest.fn() }),
}));
jest.mock("@/features/tasks/services/taskService", () => ({ getUserTasks: jest.fn(async () => ALL) }));
jest.mock("@ai-matrx/rich-content/levels/RichContent", () => ({ RichContent: () => null }));
jest.mock("../usePickerInputFocus", () => ({ usePickerInputFocus: () => ({ current: null }) }));

import { TasksResourcePicker } from "../TasksResourcePicker";

function setValue(input: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("TasksResourcePicker search", () => {
  it("finds a task with no project by title and picks it", async () => {
    const onSelect = jest.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(<TasksResourcePicker onBack={jest.fn()} onSelect={onSelect} />));
    const input = host.querySelector("input") as HTMLInputElement;
    await act(async () => setValue(input, "lanyards"));
    await act(async () => {});
    expect(host.textContent).toContain("Order lanyards");
    const row = Array.from(host.querySelectorAll("button, [role=button]")).find((e) =>
      e.textContent?.includes("Order lanyards"),
    ) as HTMLElement;
    await act(async () => row.click());
    expect(onSelect).toHaveBeenCalledWith({ type: "task", data: expect.objectContaining({ id: "t2" }) });
    act(() => root.unmount());
  });
});
