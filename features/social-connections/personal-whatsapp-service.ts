/** Same-machine personal WhatsApp. Native credentials never reach this client. */
import { z } from "zod";
import { discoverLocalEngine } from "@/lib/local-engine/discovery";
import { requestRaw } from "@/lib/python-client";
import type { components } from "./personal-whatsapp-api-types";

export type PersonalOutboxEntry = components["schemas"]["OutboxEntry"];
export type PersonalGrant = components["schemas"]["PublicGrantStatus"];
export type PersonalAccount = components["schemas"]["PersonalAccountSummary"];
export type PersonalChat = components["schemas"]["PersonalChatSummary"];
export type PersonalMessage = components["schemas"]["PersonalMessage"];
export type PersonalLiveFrame = components["schemas"]["PersonalLiveFrame"];
export type PersonalAttachment = components["schemas"]["PersonalAttachmentSummary"];
export type PersonalMessages = components["schemas"]["PersonalMessagePage"];

const grant: z.ZodType<PersonalGrant> = z.object({
  id: z.string().uuid().nullable().optional(), generation: z.number().int().positive().nullable().optional(), revision: z.number().int().positive().nullable().optional(),
  status: z.enum(["not_connected", "pending_local", "pending_credential", "active", "needs_attention", "revoking", "retired"]),
  account_ref: z.string().nullable().optional(), selected_chat_ids: z.array(z.string()).optional(), scopes: z.array(z.enum(["read", "write"])).optional(),
  request_profile: z.enum(["read", "read_write"]).default("read"), max_duration_seconds: z.union([z.literal(86400), z.literal(2592000)]).default(86400),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(), connection_id: z.string().uuid().nullable().optional(),
  bridge_provider: z.enum(["cloud", "local"]).nullable().optional(), resources_generation: z.number().int().positive().nullable().optional(),
  recovery_required: z.boolean(), cleanup_client_label: z.string().nullable().optional(),
  cleanup_confirmation: z.literal("owner_attested").nullable().optional(), cleanup_confirmation_generation: z.number().int().positive().nullable().optional(),
  refresh_supported: z.literal(false), renewal: z.literal("reauthorization"), provider_revoke_pending: z.boolean(), cloud_retirement_pending: z.boolean(),
}).strict().refine((value) => value.status !== "active" || (!!value.account_ref && !!value.generation && !!value.connection_id && !!value.expires_at && Date.parse(value.expires_at) > Date.now() && value.generation === value.resources_generation), { message: "Personal WhatsApp consent needs renewal." });
const account: z.ZodType<PersonalAccount> = z.object({ account_ref: z.string(), name: z.string(), status: z.string(), bridge_provider: z.enum(["cloud", "local"]) });
const chat: z.ZodType<PersonalChat> = z.object({ id: z.string(), title: z.string(), selected: z.boolean() });
const chats: z.ZodType<components["schemas"]["PersonalChatPage"]> = z.object({ items: z.array(chat), has_more: z.boolean(), oldest_cursor: z.string(), newest_cursor: z.string() });
const attachment: z.ZodType<PersonalAttachment> = z.object({ index: z.number().int().nonnegative(), revision: z.string().regex(/^[0-9a-f]{64}$/), name: z.string(), size_bytes: z.number().int().nonnegative().nullable().optional(), mime_type: z.string().nullable().optional(), available: z.boolean() });
const message: z.ZodType<PersonalMessage> = z.object({
  id: z.string(), account_id: z.string(), chat_id: z.string(), sender_id: z.string(), sender_name: z.string().nullable(),
  direction: z.enum(["inbound", "outbound", "unknown"]), created_at: z.string().datetime({ offset: true }),
  content: z.object({ parts: z.array(z.object({ id: z.string(), type: z.literal("text"), text: z.string() })) }),
  deleted: z.boolean(), attachment_count: z.number().int().nonnegative(), attachment_access: z.enum(["beeper_only", "local_device"]).nullable(), attachments: z.array(attachment).default([]),
});
const messages: z.ZodType<PersonalMessages> = z.object({ items: z.array(message), has_more: z.boolean(), oldest_cursor: z.string(), newest_cursor: z.string(), history_coverage: z.literal("available_in_beeper"), refresh_supported: z.literal(false), renewal: z.literal("reauthorization") });
const activation: z.ZodType<components["schemas"]["PersonalActivation"]> = z.object({ grant, removed_chat_ids: z.array(z.string()) });
const consent: z.ZodType<components["schemas"]["PersonalConsentStart"]> = z.object({
  authorization_url: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.origin === "http://127.0.0.1:23373" && url.pathname === "/oauth/authorize" && ["read", "read write"].includes(url.searchParams.get("scope") ?? "") && url.searchParams.get("code_challenge_method") === "S256";
  }), grant, required_duration: z.enum(["one_day", "thirty_days"]),
});
const outbox: z.ZodType<PersonalOutboxEntry> = z.object({
  client_id: z.string().uuid(), state: z.enum(["pending", "dispatching", "accepted", "unknown", "failed", "cancelled"]),
  pending_message_id: z.string().nullable().optional(), final_message_id: z.string().nullable().optional(),
  network_status: z.enum(["SUCCESS", "PENDING", "FAIL_RETRIABLE", "FAIL_PERMANENT"]).nullable().optional(),
  network_timestamp: z.string().nullable().optional(), delivered: z.boolean().nullable().optional(), seen: z.boolean().nullable().optional(),
  error_code: z.string().nullable().optional(), created_at: z.string().datetime({ offset: true }), updated_at: z.string().datetime({ offset: true }), draft_text: z.string(),
}).strict();
const liveFrame: z.ZodType<PersonalLiveFrame> = z.object({
  type: z.enum(["ready", "heartbeat", "changed", "reconnect_required", "access_lost"]), chat_id: z.string(),
  seq: z.number().int().nonnegative().nullable().optional(), ids: z.array(z.string().min(1).max(1024)).max(100).default([]),
  change: z.enum(["upsert", "deleted", "chat_deleted", "reconcile"]).nullable().optional(), reconcile: z.boolean().default(false),
  reason: z.enum(["provider_unavailable", "access_changed", "actor_unverified"]).nullable().optional(),
}).strict();
const failure = z.object({ error: z.string().max(100).optional(), message: z.string().max(250).optional(), detail: z.string().max(250).optional() });

export class PersonalWhatsAppFailure extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); this.name = "PersonalWhatsAppFailure"; }
  get accessLost() { return this.status === 401 || this.status === 403 || ["reauthorization_required", "permission_required", "account_disconnected", "chat_mismatch", "grant_mismatch", "native_not_found", "connection_changed", "connection_unavailable"].includes(this.code ?? ""); }
}

/** Managed previews use a one-label RFC 6761 localhost session host. */
export function personalWhatsAppDevelopmentTarget(documentLocation: Pick<Location, "hostname" | "pathname" | "search">, messenger: boolean): string | undefined {
  if (!messenger || process.env.NODE_ENV !== "development" || documentLocation.pathname !== "/messenger/whatsapp"
    || !(documentLocation.hostname === "localhost" || documentLocation.hostname === "127.0.0.1" || /^[a-z0-9-]+\.localhost$/.test(documentLocation.hostname))) return undefined;
  const values = new URLSearchParams(documentLocation.search).getAll("devLocalEngine");
  return values.length === 0 ? undefined : values.length === 1 ? values[0] : "";
}

export function createPersonalWhatsAppClient(developmentBaseUrl?: string) {
async function nativeResponse(path: string, body?: object, signal?: AbortSignal): Promise<Response> {
  const engine = await discoverLocalEngine(developmentBaseUrl === undefined ? undefined : { developmentBaseUrl });
  if (!engine) throw new Error("Open AI Matrx Local on this computer, then retry.");
  if (!engine.capabilities.includes("personal_messaging_v1")) throw new Error("Update AI Matrx Local to connect personal WhatsApp.");
  const response = await requestRaw(`/personal-messaging/beeper/${path}`, {
    method: body ? "POST" : "GET", signal: signal ?? AbortSignal.timeout(60_000),
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  }, { baseUrlOverride: engine.baseUrl, allowHttpError: true, expectedErrorStatuses: [401, 403, 409, 503] });
  if (!response.ok) {
    const value: unknown = await response.json();
    const parsed = failure.safeParse(value);
    const explanation = parsed.success ? parsed.data.message || parsed.data.detail : undefined;
    throw new PersonalWhatsAppFailure(explanation ?? "WhatsApp is unavailable. Check this computer's account and retry.", response.status, parsed.success ? parsed.data.error : undefined);
  }
  return response;
}
async function nativeRequest<T>(path: string, schema: z.ZodType<T>, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await nativeResponse(path, body, signal);
  return schema.parse(await response.json());
}

return {
  status: (signal?: AbortSignal) => nativeRequest("status", grant, undefined, signal),
  ensureWriteSupport: async () => {
    const engine = await discoverLocalEngine(developmentBaseUrl === undefined ? undefined : { developmentBaseUrl });
    if (!engine?.capabilities.includes("personal_messaging_write_v1")) throw new Error("Update AI Matrx Local to enable WhatsApp sending.");
  },
  start: async (profile: "read" | "read_write" = "read") => {
    const receipt = await nativeRequest("start", consent, { request_profile: profile, max_duration_seconds: 86400 } satisfies components["schemas"]["PersonalConsentRequest"]);
    const url = new URL(receipt.authorization_url);
    if (receipt.grant.request_profile !== profile || receipt.grant.max_duration_seconds !== 86400 || receipt.required_duration !== "one_day" || url.searchParams.get("scope") !== (profile === "read" ? "read" : "read write")) throw new Error("WhatsApp consent does not match the requested access.");
    return receipt;
  },
  send: (chatId: string, clientId: string, text: string) => nativeRequest("send", outbox, { chat_id: chatId, client_id: clientId, text } satisfies components["schemas"]["PersonalSendRequest"]),
  outbox: (chatId: string, signal?: AbortSignal) => nativeRequest(`outbox?${new URLSearchParams({ chat_id: chatId })}`, z.array(outbox), undefined, signal),
  accounts: () => nativeRequest("accounts", z.array(account)),
  selectAccount: (accountRef: string) => nativeRequest("select-account", activation, { account_ref: accountRef } satisfies components["schemas"]["AccountSelection"]),
  chats: (cursor?: string, signal?: AbortSignal) => nativeRequest(`chats${cursor ? `?${new URLSearchParams({ cursor })}` : ""}`, chats, undefined, signal),
  selectChat: (chatId: string, selected = true) => nativeRequest("select-chat", grant, { chat_id: chatId, selected } satisfies components["schemas"]["ChatSelection"]),
  messages: (chatId: string, cursor?: string, signal?: AbortSignal) => nativeRequest(`messages?${new URLSearchParams({ chat_id: chatId, ...(cursor ? { cursor } : {}) })}`, messages, undefined, signal),
  message: (chatId: string, messageId: string, signal?: AbortSignal) => nativeRequest(`message?${new URLSearchParams({ chat_id: chatId, message_id: messageId })}`, z.object({ message: message.nullable() }), undefined, signal),
  attachment: async (chatId: string, messageId: string, item: PersonalAttachment, signal: AbortSignal): Promise<Blob> => {
    const response = await nativeResponse(`attachment?${new URLSearchParams({ chat_id: chatId, message_id: messageId, attachment_index: String(item.index), revision: item.revision })}`, undefined, signal);
    return response.blob();
  },
  events: async (chatId: string, signal: AbortSignal, onFrame: (frame: PersonalLiveFrame) => void): Promise<void> => {
    const response = await nativeResponse(`events?${new URLSearchParams({ chat_id: chatId })}`, undefined, signal);
    if (!response.headers.get("content-type")?.startsWith("application/x-ndjson") || !response.body) throw new Error("Update AI Matrx Local to receive WhatsApp updates.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    try {
      while (!signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) { if (pending.trim()) throw new Error("WhatsApp updates ended unexpectedly."); return; }
        pending += decoder.decode(chunk.value, { stream: true });
        let newline: number;
        while ((newline = pending.indexOf("\n")) !== -1) {
          const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
          if (line.length > 1_048_576) throw new Error("WhatsApp update exceeded its limit.");
          if (!line.trim()) continue;
          const frame = liveFrame.parse(JSON.parse(line));
          if (frame.chat_id !== chatId) throw new Error("WhatsApp updates belong to another conversation.");
          if (signal.aborted) return;
          onFrame(frame);
          if (frame.type === "reconnect_required" || frame.type === "access_lost" || frame.change === "chat_deleted") return;
        }
        if (pending.length > 1_048_576) throw new Error("WhatsApp update exceeded its limit.");
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  },
  refresh: () => nativeRequest("refresh", grant, {}),
  reconcile: () => nativeRequest("reconcile", activation, {}),
  disconnect: () => nativeRequest("disconnect", grant, {}),
  confirmNativeCleanup: (revision: number, clientLabel: string) => nativeRequest("confirm-native-cleanup", grant, { expected_revision: revision, client_label: clientLabel, approval_removed: true } satisfies components["schemas"]["NativeCleanupConfirmation"]),
};

}
export type PersonalWhatsAppClient = ReturnType<typeof createPersonalWhatsAppClient>;
