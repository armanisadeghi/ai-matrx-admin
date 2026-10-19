import { selectScopeSelectionsContext } from "@/lib/redux/slices/appContextSlice";

type StateWithAppContext = Parameters<typeof selectScopeSelectionsContext>[0];

/**
 * THE RUN'S SCOPE SELECTION — what a workflow run-start request carries.
 *
 * The same selection the chat sends as `scope_ids` (the appContext scope
 * selection, `selectScopeSelectionsContext`), so a scope-bound item on the
 * workflow resolves the scopes the person chose. Present only when something
 * is chosen: a run with no selection carries no key and the server says
 * "No scope was chosen for this run". Every UI start-run request spreads this;
 * guard: `__tests__/a-run-start-carries-the-scope-selection.test.ts`.
 */
export function runScopeBody(state: StateWithAppContext): { scope_ids?: string[] } {
  const scope_ids = Object.values(selectScopeSelectionsContext(state) ?? {}).filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  return scope_ids.length > 0 ? { scope_ids } : {};
}

/** A thunk that reads `runScopeBody` from the live store at press time. */
export const readRunScopeBody =
  () =>
  (_dispatch: unknown, getState: () => StateWithAppContext) =>
    runScopeBody(getState());
