/**
 * A restore / Google update swap is dispose-then-create. If the create throws midway the unit is
 * gone: the grid went blank. The guard puts the previous content straight back and reports the
 * error (so the person is told). Red if the guard just lets the throw escape after the dispose.
 */
import { swapContentGuarded } from "@/lib/univer/openEditorContent";

function fakeEditor(initial: unknown) {
  let open: unknown = initial;
  return {
    shown: () => open,
    swap(snapshot: unknown) {
      open = null; // dispose
      if ((snapshot as { broken?: boolean }).broken) throw new Error("createWorkbook failed");
      open = snapshot; // create
    },
  };
}

describe("swapContentGuarded", () => {
  it("shows the new content when the swap works", () => {
    const e = fakeEditor({ id: "old" });
    expect(swapContentGuarded({ swap: e.swap, next: { id: "new" }, previous: { id: "old" } })).toEqual({ ok: true });
    expect(e.shown()).toEqual({ id: "new" });
  });

  it("a throw midway puts the old content back and still reports the error", () => {
    const e = fakeEditor({ id: "old" });
    const out = swapContentGuarded({ swap: e.swap, next: { broken: true }, previous: { id: "old" } });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect((out.error as Error).message).toBe("createWorkbook failed");
      expect(out.previousRestored).toBe(true);
    }
    expect(e.shown()).toEqual({ id: "old" });
  });

  it("with nothing to put back it says so rather than pretending", () => {
    const e = fakeEditor(null);
    const out = swapContentGuarded({ swap: e.swap, next: { broken: true }, previous: null });
    expect(out).toMatchObject({ ok: false, previousRestored: false });
  });
});
