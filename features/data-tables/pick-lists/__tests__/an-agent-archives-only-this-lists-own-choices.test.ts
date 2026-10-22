/**
 * `delete_list_items` — the agent's archive of pick-list choices. Runs the REAL handler
 * (`buildListSurfaceWriteHandlers`) with only the service's archive stubbed, and the REAL
 * `archiveChoice` with only the store read and the records client stubbed.
 *
 * Breaks if: an id that is not one of the list's choices reaches the archive (the store's
 * `recordDelete` would archive ANY record the seat may admin); the check is skipped while the
 * list's choices are unknown; a non-owner's archive reaches the approval card; validate reports
 * only the first problem; or a partial failure is reported as success.
 */

const archived: string[] = [];
let failOn: string | null = null;

jest.mock("../service", () => ({
  addChoices: jest.fn(),
  updateChoice: jest.fn(),
  updateList: jest.fn(),
  archiveChoice: jest.fn(async (_listId: string, id: string) => {
    if (id === failOn) throw new Error("the store refused it");
    archived.push(id);
  }),
}));

import type { SurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { buildListSurfaceWriteHandlers, type ListSurfaceWriteOptions } from "../surface-write-handlers";

const LIST = "list-1";
const TARGET = "delete_list_items";

function handlersWith(over: Partial<ListSurfaceWriteOptions> = {}) {
  const afterWrite = jest.fn();
  const handlers: SurfaceWriteHandlers = buildListSurfaceWriteHandlers({
    resolveListId: () => LIST,
    knownItemIds: () => ["c1", "c2", "c3"],
    canEditList: () => true,
    afterWrite,
    ...over,
  });
  const handler = handlers[TARGET];
  if (typeof handler === "function" || !handler.validate) throw new Error("delete_list_items must have a validate step");
  return { validate: handler.validate, apply: handler.apply, afterWrite };
}

beforeEach(() => {
  archived.length = 0;
  failOn = null;
});

it("archives the list's own choices and refreshes the read", async () => {
  const { validate, apply, afterWrite } = handlersWith();
  expect(() => validate(["c1", { id: "c3" }])).not.toThrow();
  await apply(["c1", { id: "c3" }]);
  expect(archived).toEqual(["c1", "c3"]);
  expect(afterWrite).toHaveBeenCalledWith(LIST);
});

it("refuses an id that is not a choice of this list, before the approval card", async () => {
  const { validate, apply } = handlersWith();
  expect(() => validate(["c1", "some-other-record"])).toThrow(/item 2 \(some-other-record\) is not a choice of this list/);
  await expect(apply(["c1", "some-other-record"])).rejects.toThrow(/Nothing was archived/);
  expect(archived).toEqual([]);
});

it("refuses when the list's choices are not known (loading, failed, none open) instead of skipping the check", async () => {
  const { validate, apply } = handlersWith({ knownItemIds: () => null });
  expect(() => validate(["c1"])).toThrow(/choices are not loaded/);
  await expect(apply(["c1"])).rejects.toThrow(/Nothing was archived/);
  expect(archived).toEqual([]);
});

it("refuses a person who cannot edit the list, and one whose edit right is not known yet", async () => {
  expect(() => handlersWith({ canEditList: () => false }).validate(["c1"])).toThrow(/only its owner can archive/);
  expect(() => handlersWith({ canEditList: () => null }).validate(["c1"])).toThrow(/not known yet/);
  await expect(handlersWith({ canEditList: () => false }).apply(["c1"])).rejects.toThrow(/Nothing was archived/);
  expect(archived).toEqual([]);
});

it("reports every problem at once", () => {
  const { validate } = handlersWith({ canEditList: () => false });
  let message = "";
  try {
    validate(["c1", 7, "c1", "stranger"]);
  } catch (e) {
    message = (e as Error).message;
  }
  expect(message).toMatch(/only its owner can archive/);
  expect(message).toMatch(/item 2 is not a choice id/);
  expect(message).toMatch(/item 3 repeats id c1/);
  expect(message).toMatch(/item 4 \(stranger\) is not a choice of this list/);
  expect(message).toMatch(/Nothing was archived/);
});

it("says exactly what landed when the store refuses part way", async () => {
  failOn = "c2";
  const { apply, afterWrite } = handlersWith();
  await expect(apply(["c1", "c2", "c3"])).rejects.toThrow(
    /archived 1 of 3 \(c1\), then stopped: the store refused it\. The rest were not attempted\./,
  );
  expect(archived).toEqual(["c1"]);
  expect(afterWrite).toHaveBeenCalledWith(LIST);
});
