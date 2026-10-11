/**
 * 22 live agents stamped `__kind: "json"` on an OBJECT answer; the generic
 * `json` kind has a non-object root form, so the stream parser refused every
 * such answer (raw_object, "1 field did not apply"). The Hindsight Replay Judge
 * now answers with the registered object kind `hindsight_replay_verdict`.
 *
 * Both schemas are the LIVE `content_ir.kind_definition.emitted_json_schema` rows
 * (read 2026-10-10); the answer is a real stored judge reply (chat.message
 * 06da354b-9aaa-4880-a4a3-fbe0aacc5812, stamp rewritten to the new kind).
 */
import { createKindStreamParser, kindSchemaFromJsonSchema, type KindStreamEvent } from "@ai-matrx/content-ir";

const STORED_ANSWER = "{\n  \"__kind\": \"json\",\n  \"verdict\": \"better\",\n  \"reasoning\": \"The replay answer correctly specifies the LCD menu reset procedure for the Brother HL-L2350DW (holding OK with the cover open, selecting Yes, and closing the cover), whereas the original provided an incorrect generic instruction to press Go seven times. In addition to being substantially more accurate and model-appropriate, the replay was faster and required less than half the tokens and cost.\",\n  \"quality_delta\": \"The replay provides the accurate LCD-based reset sequence for the Brother HL-L2350DW instead of the original's incorrect Go-button instructions.\",\n  \"regression_risk\": \"\"\n}";

const JSON_KIND_EMITTED = {};
const VERDICT_KIND_EMITTED = {
  "type": "object",
  "title": "HindsightReplayVerdictKind",
  "required": [
    "verdict",
    "reasoning"
  ],
  "properties": {
    "__kind": {
      "type": "string",
      "const": "hindsight_replay_verdict",
      "title": "Kind",
      "default": "hindsight_replay_verdict",
      "description": "The registered kind this payload is an instance of."
    },
    "verdict": {
      "enum": [
        "better",
        "same",
        "worse",
        "regressed"
      ],
      "type": "string",
      "title": "Verdict"
    },
    "reasoning": {
      "type": "string",
      "title": "Reasoning"
    },
    "quality_delta": {
      "type": "string",
      "title": "Quality Delta",
      "default": ""
    },
    "regression_risk": {
      "type": "string",
      "title": "Regression Risk",
      "default": ""
    }
  },
  "description": "The Hindsight Replay Judge's verdict on one replay against its original.",
  "additionalProperties": false
};

function run(kind: string, emitted: unknown, text: string): KindStreamEvent[] {
  const { schema } = kindSchemaFromJsonSchema(kind, emitted as never);
  if (!schema) throw new Error("no schema derived for " + kind);
  const events: KindStreamEvent[] = [];
  const parser = createKindStreamParser({ schemas: { [kind]: schema }, onEvent: (e) => events.push(e) });
  parser.push(text);
  parser.end();
  return events;
}

describe("Hindsight Replay Judge answer", () => {
  it("the OLD json stamp is refused (the bug)", () => {
    const events = run("json", JSON_KIND_EMITTED, STORED_ANSWER);
    expect(events.find((e) => e.type === "raw_object")).toMatchObject({
      reason: expect.stringContaining("non-object root form"),
    });
  });

  it("the stored answer parses as hindsight_replay_verdict with no raw fallback", () => {
    const text = STORED_ANSWER.replace('"__kind": "json"', '"__kind": "hindsight_replay_verdict"');
    const events = run("hindsight_replay_verdict", VERDICT_KIND_EMITTED, text);
    expect(events.some((e) => e.type === "raw_object")).toBe(false);
    expect(events.find((e) => e.type === "kind_identified")).toMatchObject({ kind: "hindsight_replay_verdict" });
    const complete = events.find((e) => e.type === "complete");
    expect(complete).toMatchObject({ kind: "hindsight_replay_verdict" });
    expect((complete as { value: Record<string, unknown> }).value.verdict).toBe("better");
  });
});
