/**
 * THE RUNS TAB READS THE RUN ROW (runner plan 25 step 4): the stored run's `run` block (from
 * `chat.user_request`) is parsed into names and sizes — door, AI Watch flag, typed refusal and the
 * placement entries — and nothing in it is ever treated as a value.
 */
import { parseRunRow } from "../service";
import { doorWords } from "../RunFacts";

describe("the run row a stored run carries", () => {
  it("parses the door, watch flag, refusal and names-only placement", () => {
    const row = parseRunRow({
      run_id: "8f1c2d3e-4a5b-4c6d-9e7f-0a1b2c3d4e5f",
      door: "package_code_call",
      rung: "system",
      holder_type: "agent",
      watching: true,
      refusal: { code: "missing_guaranteed_value", sentence: "Topic is required.", missing: ["topic"] },
      placement: [
        { name: "topic", kind: "text", bound: true, computed: true, delivered_to: "input", chars: 12, hash: "ab", cost: null, ms: 3 },
        { name: "unread", kind: null, bound: false, computed: true, delivered_to: "watch_only", chars: 40 },
        { name: "", bound: true },
        "not an entry",
      ],
    });
    expect(row).toEqual({
      runId: "8f1c2d3e-4a5b-4c6d-9e7f-0a1b2c3d4e5f",
      door: "package_code_call",
      rung: "system",
      holderType: "agent",
      watching: true,
      refusal: { code: "missing_guaranteed_value", sentence: "Topic is required.", missing: ["topic"] },
      placement: [
        { name: "topic", kind: "text", bound: true, computed: true, deliveredTo: "input", chars: 12 },
        { name: "unread", kind: null, bound: false, computed: true, deliveredTo: "watch_only", chars: 40 },
      ],
    });
  });

  it("is null for a run recorded before run rows existed", () => {
    expect(parseRunRow(undefined)).toBeNull();
    expect(parseRunRow({ door: "chat_start" })).toBeNull();
  });

  it("names a door in words", () => {
    expect(doorWords("chat_start")).toBe("Chat start");
    expect(doorWords("workflow_step")).toBe("Workflow step");
  });
});
