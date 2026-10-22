/**
 * Watch AI data tiers over recorded rows: a real web read (`chat.tool_call` b8393cef…) and the
 * `tool_result` block its next provider request carried. RAW comes from the capture index, SENT
 * from the later request — never from `chat.tool_call.output`.
 */
import fixture from "./fixtures/web-read-tool-call.json";
import {
  changedCopies,
  cutLine,
  rawMissingReason,
  readRawCapture,
  sentToModel,
  webReadOriginals,
} from "../data/raw-data";
import { railSteps, outcomeIdOf, stepKey } from "../data/rail-steps";
import type { NodeOutcomeRow } from "../data/ai-watch-data-reads";

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

const call = fixture.tool_call;
const snapshots = fixture.snapshots as Array<{ id: string; iteration: number; requestPayload: Record<string, unknown> }>;

describe("SENT TO MODEL — the later request's own block", () => {
  it("finds the Anthropic tool_result for this call id, only where it was sent", () => {
    const sent = sentToModel(call.call_id, call.tool_name, snapshots);
    expect(sent).toHaveLength(1);
    expect(sent[0].iteration).toBe(2);
    expect(sent[0].content).toBe(call.output);
    expect(sent[0].chars).toBe(3796);
    expect(sent[0].matchedBy).toBe("call id");
  });

  it("reads OpenAI Responses, chat-completions and Gemini shapes", () => {
    const snaps = [
      { id: "a", iteration: 2, requestPayload: { input: [{ type: "function_call_output", call_id: "c1", output: "R" }] } },
      { id: "b", iteration: 3, requestPayload: { messages: [{ role: "tool", tool_call_id: "c1", content: "RR" }] } },
      { id: "c", iteration: 4, requestPayload: { contents: [{ parts: [{ functionResponse: { name: "web", response: { result: "x" } } }] }] } },
    ];
    const sent = sentToModel("c1", "web", snaps);
    expect(sent.map((s) => [s.iteration, s.matchedBy])).toEqual([
      [2, "call id"],
      [3, "call id"],
      [4, "tool name"],
    ]);
    expect(changedCopies(sent)).toEqual([3, 4]);
  });
});

describe("RAW — the capture index", () => {
  it("a row recorded before capture says so, never shows the stored output as raw", () => {
    expect(readRawCapture(call.metadata)).toBeNull();
    expect(rawMissingReason(null)).toBe("Raw not kept — recorded before raw capture existed");
  });

  it("reads the index the server writes (inline, filed, not kept, pointer) and the cut trail", () => {
    const capture = readRawCapture({
      raw_capture: {
        v: 1,
        raw: [
          { label: "GET /v1/instagram/profile", source: "scrapecreators", bytes: 182, sha256: "ab", kept: true, inline: "{}", inline_encoding: "utf-8", status_code: 404 },
          { label: "Tool result as returned", source: "tool_result", bytes: 406747, kept: true, file_id: "f1", stored_encoding: "gzip" },
          { label: "huge", source: "s", bytes: 9, kept: false, reason: "larger than ai_watch.raw_capture_max_bytes" },
          { label: "Tool result as returned", source: "tool_result", kept: true, ref: { table: "chat.tool_call", column: "output", chars: 3796 } },
        ],
        cuts: [
          { where: "size gate", before: 406747, after: 55099, limit_name: "TOOL_RESULT_SOFT_CAP_CHARS", limit: 50000, unit: "chars" },
          { where: "web read window", field: "https://x", before: 8728, after: 3000, limit_name: "web.chars (DEFAULT_CHARS)", limit: 3000, unit: "chars" },
        ],
        facts: { result_chars: 406747, sent_chars: 55099 },
      },
    });
    expect(capture?.raw.map((r) => [r.kept, Boolean(r.inline), r.fileId, r.ref?.table ?? null])).toEqual([
      [true, true, null, null],
      [true, false, "f1", null],
      [false, false, null, null],
      [true, false, null, "chat.tool_call"],
    ]);
    expect(capture?.cuts.map(cutLine)).toEqual([
      "size gate · 406,747 → 55,099 chars · TOOL_RESULT_SOFT_CAP_CHARS = 50,000",
      "web read window · https://x · 8,728 → 3,000 chars · web.chars (DEFAULT_CHARS) = 3,000",
    ]);
  });

  it("a web read links each page to its stored Source", () => {
    expect(webReadOriginals("web", call.output)).toEqual([
      {
        url: "https://www.durham.ca/news/posts/working-together-towards-a-circular-economy/",
        processedDocumentId: "ba167183-cd92-429b-acbc-41b5f6abef8a",
      },
    ]);
    // A row cut at 100,000 chars for storage is not JSON; the pages before the cut still name their Source.
    expect(webReadOriginals("web", call.output.slice(0, 3700)).map((o) => o.processedDocumentId)).toEqual([
      "ba167183-cd92-429b-acbc-41b5f6abef8a",
    ]);
    expect(webReadOriginals("records_read", call.output)).toEqual([]);
  });
});

describe("rail steps — non-AI workflow steps beside the AI calls", () => {
  const row = (over: Partial<NodeOutcomeRow>): NodeOutcomeRow => ({
    id: "o1", run_id: "r1", step: 1, node_id: "socials", attempt: 1, output: undefined, output_kind: null,
    error: null, duration_ms: 10, completed_at: null, metadata: null, ...over,
  });

  it("lists every non-AI step once (its latest attempt), never an AI step twice", () => {
    const steps = [
      row({ id: "o1", node_id: "socials", step: 2, attempt: 1 }),
      row({ id: "o2", node_id: "socials", step: 2, attempt: 2, metadata: { raw_capture: { raw: [{ label: "x" }] } } }),
      row({ id: "o3", node_id: "identify", step: 3 }),
      row({ id: "o4", node_id: "website", step: 1, error: { message: "x" } }),
    ];
    const byRun = railSteps(steps, new Map([["r1", new Set(["identify"])]]));
    expect(byRun.get("r1")?.map((s) => [s.label, s.outcomeId, s.hasRaw, s.failed])).toEqual([
      ["website", "o4", false, true],
      ["socials", "o2", true, false],
    ]);
    expect(outcomeIdOf(stepKey("o2"))).toBe("o2");
    expect(outcomeIdOf("call-key")).toBeNull();
  });
});
