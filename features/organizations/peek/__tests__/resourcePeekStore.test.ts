import {
  RESOURCE_PEEK_HOST_WAIT_MS,
  closeResourcePeek,
  getOpenResourcePeeks,
  openResourcePeek,
  registerResourcePeekHost,
  resourcePeekRequested,
} from "../resourcePeekStore";

describe("resourcePeekStore", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("with no host ever registering, a request waits, then falls back to a new tab and tells its owner", () => {
    jest.useFakeTimers();
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const onClose = jest.fn();
    openResourcePeek({ kind: "note", id: "n1", fallbackHref: "/notes/n1", onClose });
    // Still waiting: nothing opened, nothing fell back.
    expect(open).not.toHaveBeenCalled();
    expect(getOpenResourcePeeks()).toHaveLength(0);
    jest.advanceTimersByTime(RESOURCE_PEEK_HOST_WAIT_MS - 1);
    expect(open).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(open).toHaveBeenCalledWith("/notes/n1", "_blank", "noopener");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getOpenResourcePeeks()).toHaveLength(0);
    expect(resourcePeekRequested()).toBe(false);
    open.mockRestore();
    error.mockRestore();
  });

  it("a request made BEFORE the host registers (first commit) is drawn when it does — no 'no peek host'", () => {
    jest.useFakeTimers();
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    openResourcePeek({ kind: "task", id: "t-early", fallbackHref: "/tasks/t-early" });
    expect(getOpenResourcePeeks()).toHaveLength(0);
    const unregister = registerResourcePeekHost();
    expect(getOpenResourcePeeks().map((e) => e.key)).toEqual(["task:t-early"]);
    expect(resourcePeekRequested()).toBe(true);
    jest.advanceTimersByTime(RESOURCE_PEEK_HOST_WAIT_MS * 2);
    expect(open).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    closeResourcePeek("task:t-early", { notify: false });
    unregister();
    open.mockRestore();
    error.mockRestore();
  });

  it("a waiting request closed before the host arrives never opens", () => {
    jest.useFakeTimers();
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    const close = openResourcePeek({ kind: "note", id: "gone", fallbackHref: "/notes/gone" });
    close();
    jest.advanceTimersByTime(RESOURCE_PEEK_HOST_WAIT_MS);
    const unregister = registerResourcePeekHost();
    expect(getOpenResourcePeeks()).toHaveLength(0);
    expect(open).not.toHaveBeenCalled();
    unregister();
    open.mockRestore();
  });

  it("with a host, opens one peek per key, replaces on re-ask, and closes with onClose", () => {
    const unregister = registerResourcePeekHost();
    const first = jest.fn();
    const second = jest.fn();
    const close = openResourcePeek({ kind: "note", id: "n1", onClose: first });
    expect(resourcePeekRequested()).toBe(true);
    openResourcePeek({ kind: "note", id: "n1", onClose: second });
    expect(getOpenResourcePeeks()).toHaveLength(1);
    expect(first).toHaveBeenCalledTimes(1); // replaced → its owner hears it closed
    close();
    expect(getOpenResourcePeeks()).toHaveLength(0);
    expect(second).toHaveBeenCalledTimes(1);

    openResourcePeek({ kind: "task", id: "t1", key: "k", onClose: second });
    closeResourcePeek("k", { notify: false });
    expect(second).toHaveBeenCalledTimes(1);

    // An owner-scoped close leaves a peek another opener replaced it with.
    const mine = jest.fn();
    const theirs = jest.fn();
    openResourcePeek({ kind: "task", id: "t2", onClose: mine });
    openResourcePeek({ kind: "task", id: "t2", onClose: theirs });
    closeResourcePeek("task:t2", { notify: false, owner: mine });
    expect(getOpenResourcePeeks().map((e) => e.key)).toEqual(["task:t2"]);
    closeResourcePeek("task:t2", { notify: false, owner: theirs });
    expect(getOpenResourcePeeks()).toHaveLength(0);
    unregister();
  });
});
