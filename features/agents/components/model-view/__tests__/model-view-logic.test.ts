/**
 * The Model view's cut of a captured provider request — over real request
 * bodies captured from the server's door (Anthropic, OpenAI Responses, Google,
 * xAI). Every top-level key lands in exactly one section, in payload order, and
 * every text part keeps its bytes (whitespace, line breaks, tabs).
 */
import {
  copyAllText,
  prettyBody,
  sectionsOf,
  toPart,
  type CapturedRequest,
} from "../modelViewLogic";
import captured from "./fixtures/captured-requests.json";

const requests = captured as unknown as Record<string, CapturedRequest>;
const TYPED = "Where should I go in May?\n\n   Two lines,\ttabbed.";

function keysCovered(body: Record<string, unknown>): string[] {
  const s = sectionsOf(body);
  return [
    ...(s.systemKey ? [s.systemKey] : []),
    ...(s.messagesKey ? [s.messagesKey] : []),
    ...(s.tools.length > 0 ? ["tools"] : []),
    ...s.params.map(([k]) => k),
  ];
}

describe.each(Object.keys(requests))("a captured %s request", (provider) => {
  const request = requests[provider];
  const body = request.body as Record<string, unknown>;

  it("puts every top-level key in exactly one section", () => {
    expect(keysCovered(body).sort()).toEqual(Object.keys(body).sort());
  });

  it("keeps parameters in payload order", () => {
    const order = Object.keys(body);
    const params = sectionsOf(body).params.map(([k]) => k);
    expect(params).toEqual(order.filter((k) => params.includes(k)));
  });

  it("shows the person's message with its whitespace exactly", () => {
    const texts = sectionsOf(body)
      .messages.flatMap((m) => m.parts)
      .filter((p) => p.kind === "text")
      .map((p) => (p.kind === "text" ? p.text : ""));
    expect(texts.some((t) => t.includes(TYPED))).toBe(true);
  });

  it("finds the system text wherever the provider carries it", () => {
    const s = sectionsOf(body);
    const system = [
      ...s.system,
      ...s.messages.filter((m) => /system|developer/i.test(m.role)).flatMap((m) => m.parts),
    ];
    const text = system.map((p) => (p.kind === "text" ? p.text : "")).join("");
    expect(text).toContain("You help Dana Whitfield plan a trip.\n\n  Keep answers short.");
  });

  it("copies the exact bytes and shows the same payload raw", () => {
    expect(copyAllText(request)).toBe(request.body_text);
    expect(JSON.parse(prettyBody(request))).toEqual(JSON.parse(request.body_text));
  });
});

describe("toPart", () => {
  it("keeps a block's other fields beside its text (cache_control is visible)", () => {
    const part = toPart({ type: "text", text: "a\n b", cache_control: { type: "ephemeral" } });
    expect(part).toEqual({
      kind: "text",
      label: "text",
      text: "a\n b",
      extras: { cache_control: { type: "ephemeral" } },
    });
  });

  it("shows a non-text block whole", () => {
    const block = { type: "image", source: { type: "base64", data: "AAA" } };
    expect(toPart(block)).toEqual({ kind: "json", label: "image", value: block });
  });
});

describe("sectionsOf", () => {
  it("shows a role-less item (a tool call) whole, in place", () => {
    const s = sectionsOf({
      input: [
        { role: "user", content: [{ type: "input_text", text: "hi" }] },
        { type: "function_call", name: "lookup", arguments: "{}" },
      ],
    });
    expect(s.messages[1]).toEqual({
      role: "function_call",
      parts: [{ kind: "json", label: "function_call", value: { type: "function_call", name: "lookup", arguments: "{}" } }],
    });
  });

  it("never drops a field a message carries besides its content", () => {
    const s = sectionsOf({ messages: [{ role: "assistant", content: "x", tool_calls: [{ id: "t1" }] }] });
    expect(s.messages[0].parts).toContainEqual({
      kind: "json",
      label: "message fields",
      value: { tool_calls: [{ id: "t1" }] },
    });
  });
});
