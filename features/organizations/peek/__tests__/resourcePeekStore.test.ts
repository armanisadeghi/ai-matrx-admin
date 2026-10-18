import {
  closeResourcePeek,
  getOpenResourcePeeks,
  openResourcePeek,
  registerResourcePeekHost,
  resourcePeekRequested,
} from "../resourcePeekStore";

describe("resourcePeekStore", () => {
  it("with no host mounted, a request opens nothing and falls back to a new tab", () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(openResourcePeek({ kind: "note", id: "n1", fallbackHref: "/notes/n1" })).toBeNull();
    expect(open).toHaveBeenCalledWith("/notes/n1", "_blank", "noopener,noreferrer");
    expect(getOpenResourcePeeks()).toHaveLength(0);
    expect(resourcePeekRequested()).toBe(false);
    open.mockRestore();
    error.mockRestore();
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
    close!();
    expect(getOpenResourcePeeks()).toHaveLength(0);
    expect(second).toHaveBeenCalledTimes(1);

    openResourcePeek({ kind: "task", id: "t1", key: "k", onClose: second });
    closeResourcePeek("k", { notify: false });
    expect(second).toHaveBeenCalledTimes(1);
    unregister();
  });
});
