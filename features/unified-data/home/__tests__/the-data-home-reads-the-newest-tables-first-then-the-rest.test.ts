/**
 * DEFECT 84 (L53b): the data home's first read is bounded. With `progressive` the corpus resolves on the
 * newest tables (`custom.data_home_first`), says so (`meta.partial`), then reads the whole home, swaps the
 * rows in and tells its listeners. A first read that does not answer falls back to the whole read.
 * Without `progressive` nothing changes (every other caller).
 */
import { createDataHomeCorpus } from "../dataHomeCorpus";
import { dataHome, dataHomeFirst } from "@/features/unified-data/hub/doors";

jest.mock("../dataHomeRows", () => ({
  ...jest.requireActual("../dataHomeRows"),
  buildDataHomeRows: async ({ answer }: { answer: { tables: Array<{ table_id: string }>; items: unknown[] } }) => ({
    rows: [...answer.tables, ...answer.items].map((t, i) => ({
      id: `table:o:${(t as { table_id?: string }).table_id ?? i}`, kind: "table", name: "n", organizationId: "o",
      organizationName: "O", platformOwned: false, updatedAt: null,
    })),
    refusals: [],
  }),
}));

const ok = <T,>(data: T) => ({ ok: true as const, data });
const tablesOf = (n: number) => Array.from({ length: n }, (_, i) => ({ table_id: `t${i}` }));
const ds = { rpc: async () => ({ data: [], error: null }) } as never;
const firstDoor = (rows: number, total: number) =>
  (async () => ok({ tables: tablesOf(rows), changed_by: [], total })) as unknown as typeof dataHomeFirst;
const wholeDoor = (rows: number) =>
  (async () => ok({ tables: tablesOf(rows), items: [{ item_id: "i" }], changed_by: [] })) as unknown as typeof dataHome;

describe("the first read", () => {
  it("resolves on the newest tables, says the rest is coming, then swaps the whole home in and tells the page", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    const whole = (async () => { await gate; return ok({ tables: tablesOf(30), items: [{ item_id: "i" }], changed_by: [] }); }) as unknown as typeof dataHome;
    const corpus = createDataHomeCorpus({} as never, ds, {
      progressive: true, dataHomeFirst: firstDoor(10, 30), dataHome: whole,
      dataHomeCustomFields: (async () => ok([])) as never,
    });
    let announced = 0;
    corpus.onAnswer(() => (announced += 1));
    const rows = await corpus.load();
    expect(rows).toHaveLength(10);
    expect(corpus.meta.partial).toEqual({ shown: 10, total: 30 });
    release();
    await new Promise((r) => setTimeout(r, 0));
    expect(corpus.loaded()).toHaveLength(31);
    expect(corpus.meta.partial).toBeNull();
    expect(announced).toBe(1);
  });

  it("falls back to the whole read when the first read does not answer", async () => {
    const corpus = createDataHomeCorpus({} as never, ds, {
      progressive: true,
      dataHomeFirst: (async () => ({ ok: false, error: { message: "x" } })) as never,
      dataHome: wholeDoor(5),
      dataHomeCustomFields: (async () => ok([])) as never,
    });
    expect(await corpus.load()).toHaveLength(6);
    expect(corpus.meta.partial).toBeNull();
  });

  it("names the rest when the whole read fails, and keeps the newest rows", async () => {
    const corpus = createDataHomeCorpus({} as never, ds, {
      progressive: true, dataHomeFirst: firstDoor(3, 9),
      dataHome: (async () => ({ ok: false, error: { message: "boom" } })) as never,
      dataHomeCustomFields: (async () => ok([])) as never,
    });
    expect(await corpus.load()).toHaveLength(3);
    await new Promise((r) => setTimeout(r, 0));
    expect(corpus.meta.refusals.map((r) => r.listing)).toEqual(["The rest of the home"]);
    expect(corpus.loaded()).toHaveLength(3);
  });

  it("does not ask the first door unless asked to be progressive", async () => {
    let asked = 0;
    const corpus = createDataHomeCorpus({} as never, ds, {
      dataHomeFirst: (async () => { asked += 1; return ok({ tables: [], changed_by: [], total: 0 }); }) as never,
      dataHome: wholeDoor(2), dataHomeCustomFields: (async () => ok([])) as never,
    });
    expect(await corpus.load()).toHaveLength(3);
    expect(asked).toBe(0);
  });
});
