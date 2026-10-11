/**
 * The Agent Studio's "Make this an agent" sends the studio door's fields through the ONE from-chat
 * client: door "studio", the approved answer, the doer's capture, the stage, and (stage 2) the
 * brief the person confirmed. Without them the server would build through the knob-gated door and
 * lose the approved answer as the first test case.
 */
describe("makeAgentFromChat — studio door", () => {
  it("sends door, approved answer, capture, stage and the confirmed brief", async () => {
    const calls: Record<string, unknown>[] = [];
    jest.resetModules();
    jest.doMock("@/lib/api/call-api", () => ({ callApi: (a: Record<string, unknown>) => { calls.push(a); return a; } }));
    jest.doMock("@/lib/api/adminDoor", () => ({ adminDoorOpen: () => false }));
    jest.doMock("@/features/masterwork/service", () => ({ createDraftRulebook: jest.fn() }));
    jest.doMock("@/utils/supabase/client", () => ({ supabase: {} }));
    jest.doMock("@ai-matrx/agents/matrx", () => ({ streamErrorText: () => null }));
    const { makeAgentFromChat } = await import("../service");
    const dispatch = (async (a: unknown) => ({ ...(a as object), error: null })) as never;

    await makeAgentFromChat(dispatch, "c".repeat(36), () => undefined, [], undefined, {
      approvedOutput: "Approved",
      capture: "How",
      stage: "inputs",
    });
    expect(calls[0].body).toMatchObject({ door: "studio", approved_output: "Approved", capture: "How", stage: "inputs" });
    expect((calls[0].body as Record<string, unknown>).brief).toBeUndefined();

    const brief = { name: "x", variables: [{ name: "city", description: "", test_value: "Signal Hill" }] };
    await makeAgentFromChat(dispatch, "c".repeat(36), () => undefined, [], undefined, {
      approvedOutput: "Approved",
      capture: "How",
      stage: "build",
      brief,
    });
    expect(calls[1].body).toMatchObject({ door: "studio", stage: "build", brief });

    await makeAgentFromChat(dispatch, "c".repeat(36), () => undefined);
    expect((calls[2].body as Record<string, unknown>).door).toBeUndefined();
  });
});
