/**
 * What the platform STORED and SENT, read back as admin@admin.com through PostgREST — the same rows
 * aidream's `test_the_variable_rule_reaches_the_model_live.py` reads over asyncpg
 * (`chat.conversation.system_instruction`, `chat.message`, `chat.request_snapshot`).
 *
 * The password never leaves this file's request body: it is read from `.env.local`, used for one
 * password grant, and never logged (the thrown errors carry status codes and row ids only).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../../../../..");

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return { ...out, ...(process.env as Record<string, string>) };
}

export const ENV = loadEnv();

export const ADMIN_EMAIL = ENV.AI_ADMIN_USERNAME ?? "";
export const ADMIN_PASSWORD = ENV.AI_ADMIN_PASSWORD ?? "";

const SUPABASE_URL = (ENV.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const PUBLISHABLE = ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function credentialsPresent(): boolean {
  return Boolean(ADMIN_EMAIL && ADMIN_PASSWORD && SUPABASE_URL && PUBLISHABLE);
}

let token: string | null = null;

async function adminToken(): Promise<string> {
  if (token) return token;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!r.ok) throw new Error(`the admin password grant was refused (${r.status})`);
  token = ((await r.json()) as { access_token: string }).access_token;
  return token;
}

async function rest<T>(
  schema: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: PUBLISHABLE,
      Authorization: `Bearer ${await adminToken()}`,
      "Accept-Profile": schema,
      "Content-Profile": schema,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${schema}.${path.split("?")[0]} -> ${r.status} ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as T;
}

export interface MessageRow {
  id: string;
  role: string;
  position: number;
  content: unknown;
}

export interface Stored {
  systemInstruction: string;
  messages: MessageRow[];
  snapshots: unknown[];
}

/** Polls until `snapshots` request snapshots have landed (they are written after the stream ends). */
export async function readStored(conversationId: string, snapshots: number): Promise<Stored> {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const [conv] = await rest<{ system_instruction: string | null }[]>(
      "chat",
      `conversation?id=eq.${conversationId}&select=system_instruction`,
    );
    const snaps = await rest<{ request_payload: unknown }[]>(
      "chat",
      `request_snapshot?conversation_id=eq.${conversationId}&select=request_payload,created_at&order=created_at`,
    );
    if (conv && snaps.length >= snapshots) {
      const messages = await rest<MessageRow[]>(
        "chat",
        `message?conversation_id=eq.${conversationId}&deleted_at=is.null&select=id,role,position,content&order=position`,
      );
      return {
        systemInstruction: conv.system_instruction ?? "",
        messages,
        snapshots: snaps.map((s) => s.request_payload),
      };
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error(`${snapshots} request snapshot(s) never landed for conversation ${conversationId}`);
}

/** The text parts of a stored message's content (a JSON string or an array of parts). */
export function storedText(content: unknown): string[] {
  const parts = typeof content === "string" ? (JSON.parse(content) as unknown[]) : (content as unknown[]);
  return parts
    .filter((p): p is { type: string; text: string } => (p as { type?: string }).type === "text")
    .map((p) => p.text);
}

/** The provider-bound messages of one request snapshot as [role, text] pairs. */
export function wireMessages(payload: unknown): [string, string][] {
  const data = (typeof payload === "string" ? JSON.parse(payload) : payload) as {
    messages: { role: string; content: unknown }[];
  };
  return data.messages.map((m) => {
    const c = Array.isArray(m.content)
      ? m.content.map((p: { text?: string }) => p.text ?? "").join("")
      : String(m.content ?? "");
    return [m.role, c];
  });
}

/** Agents this gate left behind (a killed run never reaches its teardown) — found by exact name. */
export async function staleAgentIds(name: string): Promise<string[]> {
  const rows = await rest<{ id: string }[]>(
    "agent",
    `definition?name=eq.${encodeURIComponent(name)}&deleted_at=is.null&select=id`,
  );
  return rows.map((r) => r.id);
}

export async function conversationIdsOf(agentIds: string[]): Promise<string[]> {
  if (agentIds.length === 0) return [];
  const rows = await rest<{ id: string }[]>(
    "chat",
    `conversation?initial_agent_id=in.(${agentIds.join(",")})&deleted_at=is.null&select=id`,
  );
  return rows.map((r) => r.id);
}

/** Archive, never delete: soft-delete the chats, then the agents. */
export async function archive(agentIds: string[], conversationIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  if (conversationIds.length > 0) {
    await rest("chat", `conversation?id=in.(${conversationIds.join(",")})`, {
      method: "PATCH",
      body: { deleted_at: now },
    });
  }
  if (agentIds.length > 0) {
    await rest("agent", `definition?id=in.(${agentIds.join(",")})`, {
      method: "PATCH",
      body: { is_archived: true, deleted_at: now },
    });
  }
}

export interface AgentRow {
  id: string;
  name: string;
  model_id: string | null;
  messages: { role: string; content: unknown }[];
  variable_definitions: { name: string }[] | null;
}

/** The saved agent row, as the builder's Save wrote it. */
export async function readAgent(id: string): Promise<AgentRow> {
  const [row] = await rest<AgentRow[]>(
    "agent",
    `definition?id=eq.${id}&select=id,name,model_id,messages,variable_definitions`,
  );
  if (!row) throw new Error(`agent ${id} is not readable`);
  return row;
}
