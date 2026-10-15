import { leaveTrashedRecord, LEAVE_GRACE_MS, type LeaveDeps } from "../leaveTrashedRecord";

function harness(stalls: boolean) {
  let path = "/documents/abc";
  const timers: Array<() => void> = [];
  const log: string[] = [];
  const deps: LeaveDeps = {
    push: (href) => {
      log.push(`push ${href}`);
      if (!stalls) path = href;
    },
    currentPath: () => path,
    hardNavigate: (href) => {
      log.push(`hard ${href}`);
      path = href;
    },
    later: (fn, ms) => {
      expect(ms).toBe(LEAVE_GRACE_MS);
      timers.push(fn);
    },
  };
  return { deps, timers, log, path: () => path };
}

describe("trashing from inside an open record", () => {
  it("lands on the list when the router navigates", () => {
    const h = harness(false);
    leaveTrashedRecord("/documents", "/documents/abc", h.deps);
    h.timers.forEach((t) => t());
    expect(h.path()).toBe("/documents");
    expect(h.log).toEqual(["push /documents"]);
  });

  it("navigates hard when the router stalls and the record is still open", () => {
    const h = harness(true);
    leaveTrashedRecord("/documents", "/documents/abc", h.deps);
    expect(h.path()).toBe("/documents/abc");
    h.timers.forEach((t) => t());
    expect(h.path()).toBe("/documents");
    expect(h.log).toEqual(["push /documents", "hard /documents"]);
  });

  it("navigates hard when the router lands somewhere else (the record's In Trash screen at another address)", () => {
    const stuck = harness(true);
    stuck.deps.currentPath = () => "/workbooks/abc/trash";
    leaveTrashedRecord("/workbooks", "/workbooks/abc", stuck.deps);
    stuck.timers.forEach((t) => t());
    expect(stuck.log).toEqual(["push /workbooks", "hard /workbooks"]);
  });

  it("does nothing more once the list is showing", () => {
    const h = harness(false);
    leaveTrashedRecord("/presentations", "/presentations/abc", h.deps);
    h.timers.forEach((t) => t());
    expect(h.log).toEqual(["push /presentations"]);
  });
});
