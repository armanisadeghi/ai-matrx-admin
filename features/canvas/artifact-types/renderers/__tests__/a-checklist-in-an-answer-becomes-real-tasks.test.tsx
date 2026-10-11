/**
 * "Things in our system are real and don't die in the AI response."
 *
 * A checklist an AI answer draws inline (a routed `task_list`, not a saved artifact) must offer
 * ONE click to real tasks. It used to draw ticks only: the Save-as-Tasks row was hidden on every
 * inline checklist, so the answer's to-do list could not become tasks unless the person first
 * opened the canvas. The button must open the canonical import (ImportTasksModal) carrying THIS
 * checklist's items.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/features/block-state/useBlockState", () => ({
  useBlockState: () => ({ state: null, loaded: true, patch: jest.fn(), saveError: null, hosted: false }),
}));
// The modal stand-in reports what the canonical import would receive.
jest.mock(
  "@/features/tasks/components/ImportTasksModal",
  () =>
    function ImportTasksModal(props: { isOpen: boolean; tasks: Array<{ title?: string; text?: string }> }) {
      return props.isOpen ? (
        <div data-testid="import-open">{`import:${props.tasks.length}`}</div>
      ) : null;
    },
);
jest.mock("@/features/tasks/utils/importConverters", () => ({ convertTimelineToTasks: () => [] }));

import { TooltipProvider } from "@/components/ui/tooltip";
import { ArtifactRender } from "../../artifact-renderers";

const CHECKLIST = "## Plan\n- [ ] Define scope\n- [ ] Set the budget\n- [ ] Kick off the work";

async function mount(): Promise<{ host: HTMLElement; unmount: () => void }> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <TooltipProvider>
        <ArtifactRender canvasType="tasks" mode="artifact" serverData={{ content: CHECKLIST }} />
      </TooltipProvider>,
    );
  });
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

describe("an inline checklist in an answer", () => {
  it("offers Make tasks, and one click opens the real import with this list's items", async () => {
    const { host, unmount } = await mount();
    const button = host.querySelector<HTMLButtonElement>('button[aria-label="Make tasks"]');
    expect(button).not.toBeNull();
    expect(host.querySelector('[data-testid="import-open"]')).toBeNull();
    await act(async () => {
      button!.click();
    });
    const open = host.querySelector('[data-testid="import-open"]');
    expect(open).not.toBeNull();
    expect(open!.textContent).toMatch(/^import:[1-9]/);
    unmount();
  });

  it("does not bring back the Reset / Save pair the host owns", async () => {
    const { host, unmount } = await mount();
    const labels = Array.from(host.querySelectorAll("button")).map((b) => b.textContent ?? "");
    expect(labels.some((t) => /^\s*Save\s*$/.test(t))).toBe(false);
    expect(labels.some((t) => /Reset/.test(t))).toBe(false);
    unmount();
  });
});
