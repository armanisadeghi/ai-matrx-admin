// /files/all primed row scopes with 3 x N single dispatches (pending, fulfilled per row); with a few
// thousand files that was a ~10 s main-thread storm at boot (profiled 2026-10-21, `preview:ready
// /files` NOT READY). One page of rows must cost a constant number of dispatches.
jest.mock("@/features/scopes/service/scopesService", () => ({
  scopesService: {
    getEntityScopes: jest.fn(),
    getEntityScopesBulk: jest.fn(async (_t: string, ids: string[]) => ({
      ok: true,
      data: { byEntity: Object.fromEntries(ids.map((id) => [id, [`s-${id}`]])) },
    })),
  },
}));
import { ensureEntityScopesBulk } from "../ensureEntityScopes";

it("2000 rows prime with at most 2 dispatches", async () => {
  const ids = Array.from({ length: 2000 }, (_, i) => `f${i}`);
  const dispatch = jest.fn();
  const getState = () => ({ scopesTree: { entityScopesByKey: {} } }) as never;
  await ensureEntityScopesBulk("file", ids)(dispatch as never, getState, undefined);
  expect(dispatch.mock.calls.length).toBeLessThanOrEqual(2);
});
