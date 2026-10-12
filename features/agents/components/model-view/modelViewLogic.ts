/**
 * Pure helpers for the builder's Model view. The server runs the whole real
 * request path and returns the provider request it would send (captured at the
 * transport, never sent). This file only cuts that body into sections, in the
 * order the payload carries them — it never renders, fills, reorders or drops
 * anything. Every top-level key lands in exactly one section.
 */

/** The provider request exactly as it would leave the server (secrets redacted). */
export interface CapturedRequest {
  provider: string;
  model: string | null;
  /** "https" | "grpc" | "local" (the mock) | "uncaptured" (a route whose wire cannot be stopped). */
  transport: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  /** The body as parsed JSON (key order kept), or null when it is not JSON. */
  body: unknown;
  /** The body bytes exactly as they would go on the wire. */
  body_text: string;
  is_streaming: boolean;
}

export interface PreviewNotice {
  level: "warning" | "info";
  code?: string;
  user_message?: string | null;
  system_message?: string | null;
}

/** One entry of the server's `prompt_blocks` report: which level and variant supplied a block. */
export interface PreviewBlock {
  name: string;
  level: string;
  block_id?: string | null;
  variant_id?: string | null;
  source_kind?: string | null;
  bound_tool?: string | null;
  chars?: number | null;
}

export interface ModelViewPreview {
  provider: string | null;
  model: string | null;
  request: CapturedRequest;
  notices?: PreviewNotice[];
  prompt_blocks?: PreviewBlock[];
}

const LEVEL_LABELS: Record<string, string> = {
  personal: "Mine",
  mine: "Mine",
  organization: "Organization",
  org: "Organization",
  system: "System",
};

export function blockLevelLabel(level: string): string {
  return LEVEL_LABELS[level.toLowerCase()] ?? level;
}

/** One piece of content as the payload carries it. */
export type RequestPart =
  | { kind: "text"; label: string; text: string; extras: Record<string, unknown> | null }
  | { kind: "json"; label: string; value: unknown };

export interface RequestMessage {
  role: string;
  parts: RequestPart[];
}

export interface RequestTool {
  name: string;
  value: unknown;
}

export interface RequestSections {
  /** The payload key the system text rides on (`system`, `instructions`, `systemInstruction`…). */
  systemKey: string | null;
  system: RequestPart[];
  messagesKey: string | null;
  messages: RequestMessage[];
  tools: RequestTool[];
  /** Every other top-level key, in payload order. */
  params: Array<[string, unknown]>;
}

const SYSTEM_KEYS = new Set(["system", "instructions", "systemInstruction", "system_instruction"]);
const MESSAGE_KEYS = new Set(["messages", "input", "contents"]);
const TOOL_KEYS = new Set(["tools"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A content block: its text (exactly) when it has one, otherwise the whole block as JSON. */
export function toPart(block: unknown, fallbackLabel = "part"): RequestPart {
  if (typeof block === "string") {
    return { kind: "text", label: "text", text: block, extras: null };
  }
  if (isRecord(block) && typeof block.text === "string") {
    const { text, type, ...rest } = block;
    const extras = Object.keys(rest).length > 0 ? rest : null;
    return { kind: "text", label: typeof type === "string" ? type : "text", text: text as string, extras };
  }
  const label = isRecord(block) && typeof block.type === "string" ? block.type : fallbackLabel;
  return { kind: "json", label, value: block };
}

function partsOf(value: unknown): RequestPart[] {
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return [toPart(value)];
  if (Array.isArray(value)) return value.map((b) => toPart(b));
  // Google's `{ role?, parts: [...] }` and xAI's `{ content: [...] }` wrappers.
  if (isRecord(value)) {
    const key = Array.isArray(value.parts) ? "parts" : Array.isArray(value.content) ? "content" : null;
    if (key) {
      const parts = (value[key] as unknown[]).map((b) => toPart(b));
      const { [key]: _inner, ...rest } = value;
      if (Object.keys(rest).length > 0) parts.push({ kind: "json", label: "fields", value: rest });
      return parts;
    }
  }
  return [toPart(value)];
}

function messageOf(item: unknown): RequestMessage {
  if (!isRecord(item)) return { role: "", parts: [toPart(item)] };
  const role = typeof item.role === "string" ? item.role : "";
  // An item with no role (OpenAI Responses `function_call`, `function_call_output`…) is shown whole.
  if (!role) {
    return { role: typeof item.type === "string" ? item.type : "item", parts: [toPart(item, "item")] };
  }
  const content = "content" in item ? item.content : item.parts;
  const parts = partsOf(content);
  const { role: _r, content: _c, parts: _p, ...rest } = item;
  if (Object.keys(rest).length > 0) parts.push({ kind: "json", label: "message fields", value: rest });
  return { role, parts };
}

function toolName(tool: unknown): string {
  if (!isRecord(tool)) return String(tool);
  if (typeof tool.name === "string") return tool.name;
  const fn = tool.function;
  if (isRecord(fn) && typeof fn.name === "string") return fn.name;
  if (Array.isArray(tool.functionDeclarations)) {
    return tool.functionDeclarations
      .map((d) => (isRecord(d) && typeof d.name === "string" ? d.name : "?"))
      .join(", ");
  }
  return typeof tool.type === "string" ? tool.type : "tool";
}

/** Cut a captured body into its sections. Nothing is dropped: every key goes somewhere once. */
export function sectionsOf(body: unknown): RequestSections {
  const sections: RequestSections = {
    systemKey: null,
    system: [],
    messagesKey: null,
    messages: [],
    tools: [],
    params: [],
  };
  if (!isRecord(body)) {
    sections.params.push(["body", body]);
    return sections;
  }
  for (const [key, value] of Object.entries(body)) {
    if (SYSTEM_KEYS.has(key) && sections.systemKey === null) {
      sections.systemKey = key;
      sections.system = partsOf(value);
    } else if (MESSAGE_KEYS.has(key) && sections.messagesKey === null && Array.isArray(value)) {
      sections.messagesKey = key;
      sections.messages = value.map(messageOf);
    } else if (TOOL_KEYS.has(key) && Array.isArray(value)) {
      sections.tools = value.map((t) => ({ name: toolName(t), value: t }));
    } else {
      sections.params.push([key, value]);
    }
  }
  return sections;
}

/** The exact payload as JSON, laid out for reading (same keys, same order, same values). */
export function prettyBody(request: CapturedRequest): string {
  if (request.body === null || request.body === undefined) return request.body_text;
  return JSON.stringify(request.body, null, 2);
}

/** Copy all = the exact bytes the provider would receive. */
export function copyAllText(request: CapturedRequest): string {
  return request.body_text;
}

export function jsonText(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? String(value);
}
