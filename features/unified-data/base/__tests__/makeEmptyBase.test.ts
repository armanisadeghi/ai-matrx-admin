import { BASE_NOT_MADE_SENTENCE, makeEmptyBase, type MakeEmptyBaseDeps } from "../makeEmptyBase";

const TIMEOUT = "canceling statement due to statement timeout";
const there = { tableId: "t1", homeId: "h1", organizationId: "o1" };

function deps(over: Partial<MakeEmptyBaseDeps>): MakeEmptyBaseDeps {
  return {
    ensure: async () => ({ ok: true, tableId: "t1", homeId: "h1" }),
    findTable: async () => there,
    save: async () => undefined,
    ...over,
  };
}

it("a create that finished before the database cancelled the answer is a success", async () => {
  const save = jest.fn(async () => undefined);
  const r = await makeEmptyBase("Scratch", deps({ ensure: async () => ({ ok: false, message: TIMEOUT }), save }));
  expect(r).toEqual({ ok: true, homeId: "h1" });
  expect(save).toHaveBeenCalledWith("o1", "h1", "Scratch");
});

it("a naming write cancelled once is asked again, and the base opens either way", async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error(TIMEOUT)).mockResolvedValueOnce(undefined);
  expect(await makeEmptyBase("Scratch", deps({ save }))).toEqual({ ok: true, homeId: "h1" });
  expect(save).toHaveBeenCalledTimes(2);
  const dead = jest.fn().mockRejectedValue(new Error(TIMEOUT));
  expect(await makeEmptyBase("Scratch", deps({ save: dead }))).toEqual({ ok: true, homeId: "h1" });
});

it("a create that is really not there fails with a sentence, never the database's words", async () => {
  const r = await makeEmptyBase("Scratch", deps({ ensure: async () => ({ ok: false, message: TIMEOUT }), findTable: async () => null }));
  expect(r).toEqual({ ok: false, sentence: BASE_NOT_MADE_SENTENCE });
  expect(JSON.stringify(r)).not.toMatch(/statement timeout/);
  const thrown = await makeEmptyBase("Scratch", deps({ ensure: async () => { throw new Error(TIMEOUT); }, findTable: async () => { throw new Error(TIMEOUT); } }));
  expect(thrown).toEqual({ ok: false, sentence: BASE_NOT_MADE_SENTENCE });
});
