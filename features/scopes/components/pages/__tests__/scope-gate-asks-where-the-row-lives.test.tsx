/**
 * @jest-environment jsdom
 */
/**
 * A SCOPE'S GATE ASKS WHERE THE ROW LIVES (walk-core 2026-10-18).
 *
 * Scope types, scopes and context items moved onto `custom.record` (same ids); the registry rows
 * `scope_type` / `scope` / `context_item` still named the dropped `context.*` tables, so
 * `access_denied_context('scope_type', id)` raised 42P01, PostgREST answered 404, and an archived
 * scope type read "We couldn't work out what happened". The gate must ask with `record`, which
 * answers "in Trash" with a Restore.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { ScopeNotFound } from "../ScopeNotFound";

jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => () => undefined,
  useAppSelector: (sel: (s: unknown) => unknown) =>
    sel({ scopesTree: { treeStatus: "ready", treeError: null } }),
}));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/features/scopes/redux/selectors/tree", () => ({
  selectTreeStatus: (s: { scopesTree: { treeStatus: string } }) => s.scopesTree.treeStatus,
  selectTreeError: (s: { scopesTree: { treeError: unknown } }) => s.scopesTree.treeError,
}));
jest.mock("@/features/scopes/redux/thunks/ensureScopeTree", () => ({ ensureScopeTree: () => ({ type: "noop" }) }));
jest.mock("@ai-matrx/sharing/access/react", () => ({
  ...jest.requireActual("@ai-matrx/sharing/access/react"),
  AccessGate: ({ token }: { token: string }) => <div data-gate-token={token} />,
}));


const ID = "d3c47bbb-38d1-4c58-99ad-4869cf4b0084";

describe("ScopeNotFound asks the gate with the token whose table holds the row", () => {
  it.each(["scope_type", "scope", "context_item"] as const)("%s asks as record", (token) => {
    const html = renderToStaticMarkup(
      <ScopeNotFound token={token} param={ID} entityLabel="scope type" backHref="/x" backLabel="Back" />,
    );
    expect(html).toContain('data-gate-token="record"');
  });
});
