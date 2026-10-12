/**
 * The Model view sends the SAME draft definition the real Test run sends: the body is the shared
 * assembler's payload (prompt blocks included), never a second copy built here.
 */
const callApi = jest.fn((args: unknown) => ({ args }));
jest.mock("@/lib/api/call-api", () => ({ callApi: (a: unknown) => callApi(a) }));
const assembleManualRequest = jest.fn();
jest.mock("@ai-matrx/chat/agents/redux/execution-system/thunks/execute-manual-instance.thunk", () => ({
  assembleManualRequest: (...a: unknown[]) => assembleManualRequest(...a),
}));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/thunks/refresh-surface-scope.thunk", () => ({
  refreshSurfaceScope: () => ({ type: "noop" }),
}));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/context-rules/context-rules.thunks", () => ({
  ensureContextRulesReady: () => ({ type: "noop" }),
}));
jest.mock("@ai-matrx/api", () => ({ getUserMessage: () => "error" }));

import { requestModelView, SERVER_BEHIND_MESSAGE } from "../requestModelView";

function run(payload: Record<string, unknown>, draftBlocks: unknown, data: unknown = { request: { body_text: "{}" } }) {
  callApi.mockClear();
  assembleManualRequest.mockResolvedValue(payload);
  const state = { agentDefinition: { agents: { a1: { promptBlocks: draftBlocks } } } };
  const dispatch = jest.fn(async (action: unknown) => {
    const a = action as { args?: unknown };
    return a && "args" in a ? { data } : undefined;
  });
  return requestModelView(dispatch as never, (() => state) as never, "conv-1", "a1").then(() => {
    return (callApi.mock.calls[0][0] as { body: Record<string, unknown> }).body;
  });
}

describe("requestModelView sends the run's own definition", () => {
  it("uses the prompt blocks the shared assembler put on the payload", async () => {
    const body = await run({ ai_model_id: "m", prompt_blocks: ["tone"] }, [{ name: "other" }]);
    expect(body.prompt_blocks).toEqual(["tone"]);
    expect(body.dry_run).toBe(true);
  });

  it("falls back to the draft's declared blocks for an assembler that predates them", async () => {
    const body = await run({ ai_model_id: "m" }, [{ name: "tone" }, "house_rules"]);
    expect(body.prompt_blocks).toEqual(["tone", "house_rules"]);
  });

  it("adds nothing when the draft declares none", async () => {
    const body = await run({ ai_model_id: "m" }, []);
    expect(body.prompt_blocks).toBeUndefined();
  });

  it("says the server is behind when a 200 carries no captured request", async () => {
    await expect(run({ ai_model_id: "m" }, [], { ok: true })).rejects.toThrow(SERVER_BEHIND_MESSAGE);
  });
});
