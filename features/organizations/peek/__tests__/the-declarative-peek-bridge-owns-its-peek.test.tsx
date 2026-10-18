/**
 * The declarative ResourcePeekHost bridge (PersonPeekHost, useReferenceDoor, AgentOrgCard,
 * OrgResourceList, GroundingConsole, AgentResourcesManager) OWNS its peek — adversarial review
 * 2026-10-18 IMPORTANT-3/4 and finding 7:
 *   - its key is stable (kind:id or the caller's peekKey): unmount + remount while "open" is ONE peek;
 *   - unmounting closes the peek it opened (a caller that drops its target leaves no stray peek);
 *   - it never closes a peek another opener replaced it with;
 *   - a bridge mounted before the app's one host registers (first commit) is drawn when it does;
 *   - with no host at all it opens the record's route in a new tab after the bounded wait.
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ResourcePeekHost } from "../ResourcePeekHost";
import {
  RESOURCE_PEEK_HOST_WAIT_MS,
  closeAllResourcePeeks,
  getOpenResourcePeeks,
  openResourcePeek,
  registerResourcePeekHost,
} from "../resourcePeekStore";

jest.mock("../peekHref", () => ({ peekHref: (token: string, id: string) => `/route/${token}/${id}` }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let roots: Root[] = [];
function mount(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(node));
  roots.push(root);
  return {
    rerender: (next: React.ReactNode) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  };
}

const keys = () => getOpenResourcePeeks().map((e) => e.key);

afterEach(() => {
  for (const r of roots) act(() => r.unmount());
  roots = [];
  act(() => closeAllResourcePeeks());
  jest.useRealTimers();
});

describe("ResourcePeekHost bridge", () => {
  it("keys by kind:id, so a remount while open is one peek, and unmount closes it", () => {
    const unregister = registerResourcePeekHost();
    const onClose = jest.fn();
    const a = mount(<ResourcePeekHost kind="task" id="t1" onClose={onClose} />);
    expect(keys()).toEqual(["task:t1"]);
    // The hosting card unmounts and remounts while the caller still says open.
    a.unmount();
    expect(keys()).toEqual([]);
    const b = mount(<ResourcePeekHost kind="task" id="t1" onClose={onClose} />);
    const c = mount(<ResourcePeekHost kind="task" id="t1" onClose={onClose} />);
    expect(keys()).toEqual(["task:t1"]);
    b.unmount();
    c.unmount();
    expect(keys()).toEqual([]);
    // Unmount is the caller going away, never the person closing it.
    expect(onClose).toHaveBeenCalledTimes(1); // c replaced b's request → b's owner heard it once
    unregister();
  });

  it("honours the caller's key, and an id change closes the old peek", () => {
    const unregister = registerResourcePeekHost();
    const view = mount(<ResourcePeekHost kind="user" id="u1" peekKey="person-peek" onClose={() => {}} />);
    expect(keys()).toEqual(["person-peek"]);
    view.rerender(<ResourcePeekHost kind="user" id={null} peekKey="person-peek" onClose={() => {}} />);
    expect(keys()).toEqual([]);
    view.rerender(<ResourcePeekHost kind="user" id="u2" onClose={() => {}} />);
    view.rerender(<ResourcePeekHost kind="user" id="u3" onClose={() => {}} />);
    expect(keys()).toEqual(["user:u3"]);
    unregister();
  });

  it("never closes a peek another opener took over", () => {
    const unregister = registerResourcePeekHost();
    let open = true;
    const view = mount(<ResourcePeekHost kind="task" id="t9" onClose={() => (open = false)} />);
    // The person clicks the same record's quick look elsewhere: the imperative path replaces it.
    act(() => void openResourcePeek({ kind: "task", id: "t9" }));
    expect(open).toBe(false);
    view.unmount();
    expect(keys()).toEqual(["task:t9"]);
    unregister();
  });

  it("a bridge mounted before the host registers is drawn when the host arrives", () => {
    jest.useFakeTimers();
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const windowOpen = jest.spyOn(window, "open").mockImplementation(() => null);
    mount(<ResourcePeekHost kind="party" id="p1" onClose={() => {}} />);
    expect(keys()).toEqual([]);
    const unregister = registerResourcePeekHost();
    expect(keys()).toEqual(["party:p1"]);
    act(() => void jest.advanceTimersByTime(RESOURCE_PEEK_HOST_WAIT_MS * 2));
    expect(error).not.toHaveBeenCalled();
    expect(windowOpen).not.toHaveBeenCalled();
    unregister();
    error.mockRestore();
    windowOpen.mockRestore();
  });

  it("with no host on the page ((link) layout), opens the record's route in a new tab", () => {
    jest.useFakeTimers();
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const windowOpen = jest.spyOn(window, "open").mockImplementation(() => null);
    const onClose = jest.fn();
    mount(<ResourcePeekHost kind="party" id="p2" onClose={onClose} />);
    act(() => void jest.advanceTimersByTime(RESOURCE_PEEK_HOST_WAIT_MS));
    expect(windowOpen).toHaveBeenCalledWith("/route/party/p2", "_blank", "noopener,noreferrer");
    expect(onClose).toHaveBeenCalledTimes(1);
    error.mockRestore();
    windowOpen.mockRestore();
  });
});
