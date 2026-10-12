/** Same-machine personal WhatsApp. Native credentials never reach this client. */
import { z } from "zod";
import { discoverLocalEngine } from "@/lib/local-engine/discovery";
import { requestRaw } from "@/lib/python-client";
import type { components } from "./personal-whatsapp-api-types";

export type PersonalGrant = components["schemas"]["PublicGrantStatus"];
export type PersonalAccount = components["schemas"]["PersonalAccountSummary"];
export type PersonalChat = components["schemas"]["PersonalChatSummary"];
export type PersonalMessage = components["schemas"]["PersonalMessage"];
export type PersonalMessages = components["schemas"]["PersonalMessagePage"];

const grant: z.ZodType<PersonalGrant> = z.object({
  id: z.string().uuid().nullable().optional(), generation: z.number().int().positive().nullable().optional(), revision: z.number().int().positive().nullable().optional(),
  status: z.enum(["not_connected", "pending_local", "pending_credential", "active", "needs_attention", "revoking", "retired"]),
  account_ref: z.string().nullable().optional(), selected_chat_ids: z.array(z.string()).optional(), scopes: z.array(z.literal("read")).optional(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(), connection_id: z.string().uuid().nullable().optional(),
  bridge_provider: z.enum(["cloud", "local"]).nullable().optional(), resources_generation: z.number().int().positive().nullable().optional(),
  recovery_required: z.boolean(), cleanup_client_label: z.string().nullable().optional(),
  cleanup_confirmation: z.literal("owner_attested").nullable().optional(), cleanup_confirmation_generation: z.number().int().positive().nullable().optional(),
  refresh_supported: z.literal(false), renewal: z.literal("reauthorization"), provider_revoke_pending: z.boolean(), cloud_retirement_pending: z.boolean(),
}).strict().refine((value) => value.status !== "active" || (!!value.account_ref && !!value.generation && !!value.connection_id && !!value.expires_at && Date.parse(value.expires_at) > Date.now() && value.generation === value.resources_generation), { message: "Personal WhatsApp consent needs renewal." });
const account: z.ZodType<PersonalAccount> = z.object({ account_ref: z.string(), name: z.string(), status: z.string(), bridge_provider: z.enum(["cloud", "local"]) });
const chat: z.ZodType<PersonalChat> = z.object({ id: z.string(), title: z.string(), selected: z.boolean() });
const chats: z.ZodType<components["schemas"]["PersonalChatPage"]> = z.object({ items: z.array(chat), has_more: z.boolean(), oldest_cursor: z.string(), newest_cursor: z.string() });
const message: z.ZodType<PersonalMessage> = z.object({
  id: z.string(), account_id: z.string(), chat_id: z.string(), sender_id: z.string(), sender_name: z.string().nullable(),
  direction: z.enum(["inbound", "outbound", "unknown"]), created_at: z.string().datetime({ offset: true }),
  content: z.object({ parts: z.array(z.object({ id: z.string(), type: z.literal("text"), text: z.string() })) }),
  deleted: z.boolean(), attachment_count: z.number().int().nonnegative(), attachment_access: z.literal("beeper_only").nullable(),
});
const messages: z.ZodType<PersonalMessages> = z.object({ items: z.array(message), has_more: z.boolean(), oldest_cursor: z.string(), newest_cursor: z.string(), history_coverage: z.literal("available_in_beeper"), refresh_supported: z.literal(false), renewal: z.literal("reauthorization") });
const activation: z.ZodType<components["schemas"]["PersonalActivation"]> = z.object({ grant, removed_chat_ids: z.array(z.string()) });
const consent: z.ZodType<components["schemas"]["PersonalConsentStart"]> = z.object({
  authorization_url: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.origin === "http://127.0.0.1:23373" && url.pathname === "/oauth/authorize" && url.searchParams.get("scope") === "read" && url.searchParams.get("code_challenge_method") === "S256";
  }), grant, required_duration: z.literal("one_day"),
});
const failure = z.object({ message: z.string().max(250).optional(), detail: z.string().max(250).optional() });

export function createPersonalWhatsAppClient(developmentBaseUrl?: string) {
async function nativeRequest<T>(path: string, schema: z.ZodType<T>, body?: object, signal?: AbortSignal): Promise<T> {
  const engine = await discoverLocalEngine(developmentBaseUrl === undefined ? undefined : { developmentBaseUrl });
  if (!engine) throw new Error("Open AI Matrx Local on this computer, then retry.");
  if (!engine.capabilities.includes("personal_messaging_v1")) throw new Error("Update AI Matrx Local to connect personal WhatsApp.");
  const response = await requestRaw(`/personal-messaging/beeper/${path}`, {
    method: body ? "POST" : "GET", signal: signal ?? AbortSignal.timeout(60_000),
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  }, { baseUrlOverride: engine.baseUrl, allowHttpError: true, expectedErrorStatuses: [401, 403, 409, 503] });
  const value: unknown = await response.json();
  if (!response.ok) {
    const parsed = failure.safeParse(value);
    throw new Error(parsed.success && (parsed.data.message || parsed.data.detail) ? (parsed.data.message || parsed.data.detail) : "WhatsApp is unavailable. Check this computer's account and retry.");
  }
  return schema.parse(value);
}

return {
  status: (signal?: AbortSignal) => nativeRequest("status", grant, undefined, signal),
  start: () => nativeRequest("start", consent, {}),
  accounts: () => nativeRequest("accounts", z.array(account)),
  selectAccount: (accountRef: string) => nativeRequest("select-account", activation, { account_ref: accountRef } satisfies components["schemas"]["AccountSelection"]),
  chats: (cursor?: string, signal?: AbortSignal) => nativeRequest(`chats${cursor ? `?${new URLSearchParams({ cursor })}` : ""}`, chats, undefined, signal),
  selectChat: (chatId: string, selected = true) => nativeRequest("select-chat", grant, { chat_id: chatId, selected } satisfies components["schemas"]["ChatSelection"]),
  messages: (chatId: string, cursor?: string, signal?: AbortSignal) => nativeRequest(`messages?${new URLSearchParams({ chat_id: chatId, ...(cursor ? { cursor } : {}) })}`, messages, undefined, signal),
  refresh: () => nativeRequest("refresh", grant, {}),
  reconcile: () => nativeRequest("reconcile", activation, {}),
  disconnect: () => nativeRequest("disconnect", grant, {}),
  confirmNativeCleanup: (revision: number, clientLabel: string) => nativeRequest("confirm-native-cleanup", grant, { expected_revision: revision, client_label: clientLabel, approval_removed: true } satisfies components["schemas"]["NativeCleanupConfirmation"]),
};

}
export type PersonalWhatsAppClient = ReturnType<typeof createPersonalWhatsAppClient>;
