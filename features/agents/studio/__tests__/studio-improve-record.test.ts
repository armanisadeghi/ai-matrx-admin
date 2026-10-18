import { IMPROVE_KEY, readImproveRecord } from "../improve-record";

describe("the Improve record survives a reload", () => {
  it("reads the debrief and the candidate draft back from the stored row", () => {
    const meta = {
      other: 1,
      [IMPROVE_KEY]: {
        debrief: { message_id: "m1", fork_conversation_id: "f1", model: "x", text: "```agent_debrief```" },
        candidate: { proposalId: "p1", title: "Rule", messages: [{ role: "system" }], modelId: null },
      },
    };
    const r = readImproveRecord(meta);
    expect(r.debrief).toEqual({ message_id: "m1", fork_conversation_id: "f1", model: "x", text: "```agent_debrief```" });
    expect(r.candidate?.proposalId).toBe("p1");
    expect(r.candidate?.messages).toHaveLength(1);
  });
  it("a half-written or missing row is empty, never a throw", () => {
    expect(readImproveRecord(null)).toEqual({});
    expect(readImproveRecord({ [IMPROVE_KEY]: { debrief: { text: 3 } } }).debrief).toBeNull();
  });
});
