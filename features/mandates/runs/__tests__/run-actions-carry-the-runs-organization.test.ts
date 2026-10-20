/**
 * Acting on a stored mandate run carries the RUN's organization, never the active one
 * (ensureOrgId(recordOrg) — CLAUDE.md "ONE active organization").
 *
 * Live defect 2026-10-20 (C): on the support run page, "Replay exactly", the Try "Run" and the
 * placement preview went out in the admin's ACTIVE organization (AI Matrx) for a run owned by
 * Safety Net Real Tests → 409 mandate_unfulfilled ("the org rung for AI Matrx (no binding for this org)").
 */
const callApi = jest.fn((args: unknown) => ({ args }));
jest.mock("@/lib/api/call-api", () => ({ callApi: (a: unknown) => callApi(a) }));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/thunks/adopt-foreign-stream", () => ({
  adoptForeignStream: () => ({ type: "adopt" }),
}));
jest.mock("@ai-matrx/api", () => ({ streamErrorText: () => null }));
jest.mock("@/features/workflow-runtime/transport/debug-view", () => ({
  withRunDebugView: (path: string) => `${path}${path.includes("?") ? "&" : "?"}debug_view=1`,
}));
const ACTIVE_ORG = "5dc930e9-0000-4000-8000-00000000a1a1";
jest.mock("@/lib/organizations/ensureOrgId", () => ({
  ensureOrgId: async (org: string | null | undefined) => org || ACTIVE_ORG,
}));

import { previewPlacement, streamReplay, streamTestRun } from "../service";

const RUN_ORG = "226be635-194d-42dd-87c8-7a9562f70939";
const HOLDER = { type: "agent" as const, id: "40379907-a685-4d59-93db-6533c5fdcb75", version_id: null };

function dispatchAnswering(data: unknown) {
  return jest.fn(async (action: unknown) => {
    const a = action as { args?: unknown };
    return a && "args" in a ? { data } : undefined;
  });
}

function sentConfig(): { path: string; scopeOverrides?: { organization_id?: string } } {
  return callApi.mock.calls[0][0] as { path: string; scopeOverrides?: { organization_id?: string } };
}

beforeEach(() => callApi.mockClear());

describe("run page actions carry the run's own organization", () => {
  it("Replay exactly", async () => {
    await streamReplay(dispatchAnswering({}) as never, "068523e4", "realtests.pb07_canary" as never, RUN_ORG, () => {});
    expect(sentConfig().scopeOverrides?.organization_id).toBe(RUN_ORG);
    // AI Watch: the replay asks for the watched view; the server admits only a permitted viewer.
    expect(sentConfig().path).toContain("debug_view=1");
  });

  it("Try a new intelligence: Run", async () => {
    await streamTestRun(
      dispatchAnswering({}) as never,
      "realtests.pb07_canary" as never,
      { provisions: { canary_code: "x" }, holder: HOLDER, configOverrides: {}, userInput: null },
      RUN_ORG,
      () => {},
    );
    expect(sentConfig().scopeOverrides?.organization_id).toBe(RUN_ORG);
  });

  it("the placement preview", async () => {
    await previewPlacement(
      dispatchAnswering({ placement: { provisions: [], variables: [] }, problems: [] }) as never,
      "realtests.pb07_canary" as never,
      { provisions: {}, holder: HOLDER, configOverrides: {} },
      RUN_ORG,
    );
    expect(sentConfig().scopeOverrides?.organization_id).toBe(RUN_ORG);
  });

  it("falls back to the active organization only when the server sent no run organization", async () => {
    await streamReplay(dispatchAnswering({}) as never, "068523e4", "realtests.pb07_canary" as never, null, () => {});
    expect(sentConfig().scopeOverrides?.organization_id).toBe(ACTIVE_ORG);
  });
});
