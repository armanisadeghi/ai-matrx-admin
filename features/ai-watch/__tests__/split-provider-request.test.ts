/**
 * Watch AI must read every provider's real request shape. Each fixture is a
 * real `chat.request_snapshot.request_payload` (strings trimmed), so a shape
 * the window cannot split fails here instead of showing "(none)" to a person.
 */
import anthropic from "./fixtures/anthropic.json";
import gemini from "./fixtures/gemini-sdk.json";
import openaiResponses from "./fixtures/openai-responses.json";
import groq from "./fixtures/groq-chat.json";
import cerebras from "./fixtures/cerebras-chat.json";
import xai from "./fixtures/xai-recorded.json";
import { splitProviderRequest } from "../ai-watch-records";

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

const req = (f: { request: unknown }) => f.request as Record<string, unknown>;
const text = (v: unknown) => JSON.stringify(v);

describe("splitProviderRequest — real stored requests", () => {
  it("Anthropic: top-level system, messages, input_schema tools", () => {
    const s = splitProviderRequest(req(anthropic));
    expect(s.shape).toBe("anthropic");
    expect(text(s.system)).toContain("Current date");
    expect(s.messages.length).toBeGreaterThan(0);
    expect(s.tools.length).toBeGreaterThan(0);
    expect(s.settings).toHaveProperty("max_tokens");
  });

  it("Gemini SDK: config.system_instruction, flattened function_declarations, contents", () => {
    const s = splitProviderRequest(req(gemini));
    expect(s.shape).toBe("gemini");
    expect(text(s.system)).toContain("Current date");
    expect(s.messages.length).toBeGreaterThan(0);
    expect(s.tools.some((t) => typeof (t as { name?: unknown }).name === "string")).toBe(true);
    expect(Object.values(s.settings)).not.toContain(null);
    expect(s.settings).not.toHaveProperty("system_instruction");
  });

  it("Gemini REST (wire capture): systemInstruction, tools[].functionDeclarations, generationConfig", () => {
    const s = splitProviderRequest({
      contents: [{ role: "user", parts: [{ text: "hi" }] }],
      systemInstruction: { parts: [{ text: "be brief" }] },
      tools: [{ functionDeclarations: [{ name: "conversations" }] }, { googleSearch: {} }],
      generationConfig: { temperature: 0.2 },
    });
    expect(s.shape).toBe("gemini");
    expect(text(s.system)).toContain("be brief");
    expect(s.tools).toEqual([{ name: "conversations" }, { googleSearch: {} }]);
    expect(s.settings).toHaveProperty("generationConfig");
  });

  it("OpenAI Responses: developer item as system, input_text items as messages", () => {
    const s = splitProviderRequest(req(openaiResponses));
    expect(s.shape).toBe("openai-responses");
    expect(text(s.system)).toContain("developer");
    expect(s.messages.every((m) => (m as { role?: string }).role !== "developer")).toBe(true);
    expect(s.tools.length).toBeGreaterThan(0);
  });

  it("OpenAI Responses with instructions", () => {
    const s = splitProviderRequest({ model: "m", instructions: "be brief", input: "hi" });
    expect(s.system).toBe("be brief");
    expect(s.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("Chat Completions (Groq): system message lifted out of messages", () => {
    const s = splitProviderRequest(req(groq));
    expect(s.shape).toBe("chat-completions");
    expect(s.system).not.toBeNull();
    expect(s.messages.every((m) => (m as { role?: string }).role !== "system")).toBe(true);
  });

  it("Chat Completions (Cerebras) with function tools", () => {
    const s = splitProviderRequest(req(cerebras));
    expect(s.shape).toBe("chat-completions");
    expect(text(s.system)).toContain("Current date");
    expect(s.tools.length).toBeGreaterThan(0);
  });

  it("xAI chat with max_tokens and a system message is Chat Completions, not Anthropic", () => {
    const s = splitProviderRequest({
      model: "grok", max_tokens: 100,
      messages: [{ role: "system", content: "be brief" }, { role: "user", content: "hi" }],
      tools: [{ type: "function", function: { name: "web" } }],
    });
    expect(s.shape).toBe("chat-completions");
    expect(s.system).toEqual(["be brief"]);
  });

  it("an unknown shape (xAI recorded summary) is shown raw, never as an empty split", () => {
    const s = splitProviderRequest(req(xai));
    expect(s.shape).toBeNull();
    expect(s.raw).toEqual(req(xai));
  });
});
