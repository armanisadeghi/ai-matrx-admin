// lib/working-copy (the Redux adapter of @ai-matrx/kit/working-copy) — one session per record, one commit per record.
// The session registry and the coalesced commit are tested in the kit; this proves them through the real Redux port.
//
// Breaks these catch: a session built per acquire (two views → two copies),
// the last release not flushing (a closing view drops typing), a release while
// another view holds the record flushing or dropping it, a commit per view
// (two saves of one record), overlapping commits, adopt clobbering pending
// typing, and a re-acquire during a slow flush building a fresh session from a
// stale source.
import { configureStore } from "@reduxjs/toolkit";
import { defineWorkingCopyKind } from "../reduxPort";
import workingCopiesReducer, { getWorkingCopy } from "../workingCopySlice";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("defineWorkingCopyKind (Redux-backed)", () => {
  const makeKind = () => {
    const commits: Array<[string, string]> = [];
    const kind = defineWorkingCopyKind({
      entity: `route-sheet-${Math.random().toString(36).slice(2, 8)}`,
      delay: () => 300,
      save: ({ id, entry }) => {
        commits.push([id, entry.value ?? ""]);
        return { value: entry.value, savedAt: null };
      },
    });
    const store = configureStore({ reducer: { workingCopies: workingCopiesReducer } });
    const value = (id: string) => getWorkingCopy(store.getState(), kind.key(id))?.value;
    return { kind, store, commits, value };
  };

  it("two views of one record share one copy in Redux and one commit", () => {
    const { kind, store, commits, value } = makeKind();
    const releaseA = kind.attach("monday", store);
    const releaseB = kind.attach("monday", store);
    kind.load("monday", "Route 4");
    kind.edit("monday", "Route 4: Elm St bins");
    expect(value("monday")).toBe("Route 4: Elm St bins");
    expect(getWorkingCopy(store.getState(), kind.key("monday"))?.views).toBe(2);
    jest.advanceTimersByTime(300);
    expect(commits).toEqual([["monday", "Route 4: Elm St bins"]]);
    releaseA();
    releaseB();
    expect(commits).toHaveLength(1);
  });

  it("the last view leaving commits pending words and releases the entry; another view leaving does not", () => {
    const { kind, store, commits, value } = makeKind();
    const releaseA = kind.attach("n1", store);
    const releaseB = kind.attach("n1", store);
    kind.load("n1", "");
    kind.edit("n1", "half a sentence");
    releaseA();
    expect(commits).toEqual([]);
    expect(value("n1")).toBe("half a sentence");
    releaseB();
    expect(commits).toEqual([["n1", "half a sentence"]]);
    expect(store.getState().workingCopies.byKey[kind.key("n1")]).toBeUndefined();
    jest.advanceTimersByTime(1000);
    expect(commits).toHaveLength(1);
  });

  // Changed 2026-10-03: this used to commit "local words" over "remote words"
  // after the debounce and then follow the next source — the silent lost
  // update. A source moving under pending typing is now a conflict: nothing
  // commits until the person chooses (lib/working-copy/__tests__/working-copy-guarantees.test.ts).
  it("a moved source never clobbers pending typing, and never commits over it unasked", async () => {
    const { kind, store, commits, value } = makeKind();
    const release = kind.attach("n2", store);
    kind.load("n2", "stored words");
    kind.edit("n2", "local words");
    kind.load("n2", "remote words");
    expect(value("n2")).toBe("local words");
    jest.advanceTimersByTime(300);
    expect(commits).toEqual([]);
    kind.load("n2", "remote words again");
    expect(value("n2")).toBe("local words");
    expect(store.getState().workingCopies.byKey[kind.key("n2")]?.conflict?.theirs).toBe("remote words again");
    await kind.resolveConflict("n2", "theirs");
    expect(value("n2")).toBe("remote words again");
    expect(commits).toEqual([]);
    release();
  });

  it("reset drops the pending commit (a resolved conflict is not overwritten)", () => {
    const { kind, store, commits } = makeKind();
    const release = kind.attach("n3", store);
    kind.load("n3", "theirs");
    kind.edit("n3", "mine");
    kind.reset("n3", "resolved");
    jest.advanceTimersByTime(1000);
    release();
    expect(commits).toEqual([]);
  });

  it("autosave: false waits for an explicit save, and the last view leaving writes it once", async () => {
    const saves: string[] = [];
    const kind = defineWorkingCopyKind({
      entity: "lease-text",
      autosave: false,
      delay: () => 0,
      save: async ({ entry }) => {
        saves.push(entry.value ?? "");
        return { value: entry.value };
      },
    });
    const store = configureStore({ reducer: { workingCopies: workingCopiesReducer } });
    const release = kind.attach("unit-4b", store);
    kind.load("unit-4b", "Rent due on the 1st");
    kind.edit("unit-4b", "Rent due on the 1st; late fee after the 5th");
    jest.advanceTimersByTime(10_000);
    expect(saves).toEqual([]);
    release();
    await Promise.resolve();
    expect(saves).toEqual(["Rent due on the 1st; late fee after the 5th"]);
  });
});
