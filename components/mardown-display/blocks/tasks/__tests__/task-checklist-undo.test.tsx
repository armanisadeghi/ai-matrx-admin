/**
 * Tasks undo (live-verify 2026-10-16): a Controls "Done" edit rewrites the block's source, and the
 * editor's Undo puts the old source back. The checklist must draw whatever its source says — the
 * tick state it keeps must follow a source change in BOTH directions, not shadow it with the tick
 * it seeded on first parse. Local ticks on rows the source did not touch stay.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import TaskChecklist from "@/components/mardown-display/blocks/tasks/TaskChecklist";
import { TooltipProvider } from "@/components/ui/tooltip";

jest.mock("@/features/tasks/components/ImportTasksModal", () => ({ __esModule: true, default: () => null }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

const BEFORE = "- [x] Open the yard\n- [ ] Weigh the truck\n- [ ] Print the ticket";
const AFTER = "- [x] Open the yard\n- [x] Weigh the truck\n- [ ] Print the ticket";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const show = async (content: string) => {
  await act(async () => {
    root.render(
      <TooltipProvider>
        <TaskChecklist content={content} hideTitle hideActions />
      </TooltipProvider>,
    );
  });
};
const main = () => /Main: (\d+) of (\d+)/.exec(container.textContent ?? "")?.slice(1, 3).join("/");
const ticked = () => Array.from(container.querySelectorAll("[data-task-id] [role='checkbox']")).map((c) => c.getAttribute("aria-checked"));

describe("TaskChecklist follows its source (Controls Done, then Undo)", () => {
  it("draws the edited source, then the restored source", async () => {
    await show(BEFORE);
    expect(main()).toBe("1/3");
    await show(AFTER); // Controls: Done on row 2
    expect(main()).toBe("2/3");
    expect(ticked()).toEqual(["true", "true", "false"]);
    await show(BEFORE); // the editor's Undo
    expect(main()).toBe("1/3");
    expect(ticked()).toEqual(["true", "false", "false"]);
  });

  it("keeps a local tick on a row the source change did not touch", async () => {
    await show(BEFORE);
    const last = container.querySelectorAll("[data-task-id] [role='checkbox']")[2] as HTMLElement;
    await act(async () => last.click());
    expect(ticked()).toEqual(["true", "false", "true"]);
    await show(AFTER);
    expect(ticked()).toEqual(["true", "true", "true"]);
    await show(BEFORE);
    expect(ticked()).toEqual(["true", "false", "true"]);
  });
});
