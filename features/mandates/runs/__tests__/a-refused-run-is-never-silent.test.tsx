/**
 * A refused Replay / Try run shows the server's own words, in view (CLAUDE.md law 4: nothing fails silently).
 *
 * Live defect 2026-10-20 (C): "Replay exactly" on the support run page answered 409 mandate_unfulfilled and
 * the page looked unchanged — the refusal WAS rendered, but under the run pane's own scroll fold, below the
 * button. The block now brings itself into view the moment a result or a live run appears.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

jest.mock("next/link", () => ({ __esModule: true, default: (p: { children: unknown }) => p.children }));
jest.mock("@ai-matrx/design-system/controls", () => ({ StatusToken: () => null, PropertyRow: () => null }));
jest.mock("@ai-matrx/records-ui/entity-ref", () => ({
  ...jest.requireActual("@ai-matrx/records-ui/entity-ref"),
  EntityRef: () => null,
}));
jest.mock("@/components/cost/useCostDisplay", () => ({ useCostDisplay: () => ({ unit: "points", rate: 1 }) }));
jest.mock("@/features/hindsight/subject-doors", () => ({ conversationHref: () => "/c" }));
jest.mock("@/features/mandates/run-history/format", () => ({
  absoluteWhen: () => "",
  costWords: () => "",
  durationWords: () => "",
}));
jest.mock("@ai-matrx/chat/agents/components/live-run/LiveRunDisplay", () => ({ LiveRunDisplay: () => null }));
jest.mock("@ai-matrx/agents/models", () => ({ selectModelNameById: () => null }));
jest.mock("@ai-matrx/chat/agents/identity/model-catalog", () => ({ readModelRecords: () => [] }));
jest.mock("@/features/admin/users/components/AdminUserRef", () => ({ AdminUserRef: () => null }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => null }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectIsSuperAdminPerson: () => false, selectUserId: () => null }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import { StreamedRunBlock } from "../RunFacts";
import type { StreamedRunState } from "../useStreamedRun";

const REFUSAL =
  "Mandate 'realtests.pb07_canary': no rung answers this job — the org rung for AI Matrx (no binding for this org).";

function state(over: Partial<StreamedRunState>): StreamedRunState {
  return { requestId: null, conversationId: null, running: false, result: null, stored: null, start: async () => {}, ...over };
}

let host: HTMLDivElement;
let root: Root;
const scrolled = jest.fn();

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  scrolled.mockClear();
  Element.prototype.scrollIntoView = scrolled;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("a refused run", () => {
  it("shows the server's words and brings them into view", () => {
    act(() => root.render(<StreamedRunBlock label="Replay" state={state({})} original={null} audience="admin" />));
    expect(scrolled).not.toHaveBeenCalled();

    act(() =>
      root.render(
        <StreamedRunBlock
          label="Replay"
          state={state({ result: { ok: false, error: REFUSAL, conversationId: null, durationMs: 469 } })}
          original={null}
          audience="admin"
        />,
      ),
    );
    expect(host.textContent).toContain(REFUSAL);
    expect(scrolled).toHaveBeenCalledTimes(1);
  });
});
