// features/unified-data/base/__tests__/archive-base.test.ts — TEMPLATE-UI-POLISH (2026-10-20).
//
// THE USE CASE. A person archives a base from its page: every table goes away through the one table door, then the base's name
// row; a leftover name row with no tables archives on its own; a stopped run says exactly what is left and leaves the name.
import { archiveBase } from "../archiveBase";

const T = [{ id: "t1", name: "Staff" }, { id: "t2", name: "Offices" }];

it("archives each table in order, then the name row, and reports progress", async () => {
  const calls: string[] = [];
  const progress: string[] = [];
  const r = await archiveBase(T, {
    archiveTable: async (id) => { calls.push(id); return { ok: true }; },
    archiveIdentity: async () => { calls.push("identity"); },
    onProgress: (d, t) => progress.push(`${d}/${t}`),
  });
  expect(r).toEqual({ ok: true, tables: 2 });
  expect(calls).toEqual(["t1", "t2", "identity"]);
  expect(progress).toEqual(["0/2", "1/2", "2/2"]);
});

it("a base with no tables left archives its name row alone", async () => {
  const identity = jest.fn(async () => undefined);
  const r = await archiveBase([], { archiveTable: jest.fn(), archiveIdentity: identity });
  expect(r).toEqual({ ok: true, tables: 0 });
  expect(identity).toHaveBeenCalledTimes(1);
});

it("a table that will not archive stops the run, names what is left, and leaves the base's name alone", async () => {
  const identity = jest.fn(async () => undefined);
  const r = await archiveBase(T, {
    archiveTable: async (id) => (id === "t2" ? { ok: false, message: "That took too long." } : { ok: true }),
    archiveIdentity: identity,
  });
  expect(r).toMatchObject({ ok: false, left: 1 });
  expect((r as { sentence: string }).sentence).toContain("“Offices” could not be archived (1 of 2 tables are still live): That took too long.");
  expect(identity).not.toHaveBeenCalled();
});

it("an unnamed base archives its tables only", async () => {
  const r = await archiveBase(T, { archiveTable: async () => ({ ok: true }), archiveIdentity: null });
  expect(r).toEqual({ ok: true, tables: 2 });
});
