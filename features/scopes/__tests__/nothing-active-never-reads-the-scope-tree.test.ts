/**
 * GUARD — with no scope selected, resolving "active scopes by type" never reads the scope tree.
 *
 * Live 2026-10-16 (/chat/new, admin): every composer's context rail ran
 * `selectActiveScopeIdsByType` at paint; its input selector read `state.scopesTree.organizations`
 * unconditionally, and the first read of `state.scopesTree` starts the ~1 s shared tree load
 * (scopeTreeDemand.ts). Nobody had selected anything.
 *
 * RED on the old tree: `scopesTree` is read with nothing active.
 */
import { selectActiveScopeIdsByType } from "@/features/scopes/redux/selectors/active-context";
import type { RootState } from "@/lib/redux/rootReducer";

function watched(appContext: Record<string, unknown>, tree: Record<string, unknown>) {
  const reads: string[] = [];
  const state = new Proxy({ appContext, scopesTree: tree } as Record<string, unknown>, {
    get(target, key, receiver) {
      if (typeof key === "string") reads.push(key);
      return Reflect.get(target, key, receiver);
    },
  }) as unknown as RootState;
  return { state, reads };
}

const baseContext = { organization_id: "o1", scope_selections: {}, active_scope_type_ids: [] };

it("nothing selected: an empty answer, the scope tree untouched", () => {
  const { state, reads } = watched(baseContext, { organizations: {} });
  expect(selectActiveScopeIdsByType(state)).toEqual({});
  expect(reads).not.toContain("scopesTree");
});

it("a selected scope still resolves to its type through the tree", () => {
  const { state, reads } = watched(
    { ...baseContext, scope_selections: { t1: "s1" } },
    { organizations: { o1: { scope_types: [{ id: "t1", scopes: [{ id: "s1" }] }] } } },
  );
  expect(selectActiveScopeIdsByType(state)).toEqual({ t1: ["s1"] });
  expect(reads).toContain("scopesTree");
});
