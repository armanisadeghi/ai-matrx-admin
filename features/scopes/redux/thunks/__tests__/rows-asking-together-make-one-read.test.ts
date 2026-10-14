jest.mock("@/features/scopes/service/scopesService", () => ({
  scopesService: {
    getEntityScopes: jest.fn(),
    getEntityScopesBulk: jest.fn(async (_type: string, ids: string[]) => ({
      ok: true,
      data: { byEntity: Object.fromEntries(ids.map((id) => [id, [`scope-of-${id}`]])) },
    })),
  },
}));

import { scopesService } from "@/features/scopes/service/scopesService";
import { ensureEntityScopes } from "../ensureEntityScopes";

type Action = { type: string; payload?: { key?: string; scope_ids?: string[] } };

function harness() {
  const entries: Record<string, { status: string }> = {};
  const actions: Action[] = [];
  const getState = () => ({ scopesTree: { entityScopesByKey: entries } }) as never;
  const dispatch = ((action: Action) => {
    actions.push(action);
    const key = action.payload?.key;
    if (key && action.type.endsWith("Pending")) entries[key] = { status: "loading" };
    if (key && action.type.endsWith("Fulfilled")) entries[key] = { status: "ready" };
    return action;
  }) as never;
  return { dispatch, getState, actions };
}

it("a list of rows asking for their scope tags in one moment is ONE bulk read", async () => {
  const { dispatch, getState, actions } = harness();
  await Promise.all(
    ["f1", "f2", "f3", "f1"].map((id) => ensureEntityScopes("file", id)(dispatch, getState, undefined)),
  );
  expect(scopesService.getEntityScopesBulk).toHaveBeenCalledTimes(1);
  expect(scopesService.getEntityScopesBulk).toHaveBeenCalledWith("file", ["f1", "f2", "f3"]);
  expect(scopesService.getEntityScopes).not.toHaveBeenCalled();
  const fulfilled = actions.filter((a) => a.type.endsWith("Fulfilled")).map((a) => a.payload?.key);
  expect(fulfilled.sort()).toEqual(["file:f1", "file:f2", "file:f3"]);
});
