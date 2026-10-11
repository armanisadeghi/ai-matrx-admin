import { z } from "zod";
import { buildMatrxRequestUrl, sendMatrxRequest } from "@ai-matrx/agents/matrx";
import { applyOrganizationContextHeader } from "@/lib/api/organization-context";
import { resolveServiceBaseUrl } from "@/lib/api/resolve-service-url";
import { createClient } from "@/utils/supabase/client";

// Runtime ingress schemas validate only fields this consumer uses. The server
// remains the authority for app configuration and all customer asset bindings.
export const signupReceipt = z.object({ state: z.string().min(1), app_id: z.string().regex(/^\d+$/), config_id: z.string().regex(/^\d+$/), expires_at: z.string() });
export const configReceipt = z.object({ status: z.enum(["available", "unavailable"]), app_id: z.string().nullable().optional(), config_id: z.string().nullable().optional() });
export const connectionReceipt = z.object({ connection_id: z.string().uuid(), status: z.enum(["connected", "disconnected", "needs_attention"]) });
export const discoveryReceipt = z.object({ subject: z.object({ id: z.string(), display_name: z.string() }), resources: z.array(z.object({ resource_id: z.string().uuid().nullable().optional(), resource_ref: z.string(), resource_type: z.string(), display_name: z.string(), selected: z.boolean() })), after: z.string().nullable().optional() });

export async function whatsappRequest(operation: "config" | "start" | "complete" | "discover" | "select" | "refresh" | "disconnect", organizationId: string, body?: Record<string, string>): Promise<unknown> {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) throw new Error("Sign in to connect WhatsApp.");
  const response = await sendMatrxRequest(buildMatrxRequestUrl(`${resolveServiceBaseUrl("aidream").replace(/\/+$/, "")}/api`, `/api/whatsapp-business/${operation}`), {
    method: operation === "config" ? "GET" : "POST",
    headers: applyOrganizationContextHeader({ Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, organizationId),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120_000),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = z.object({ detail: z.union([z.string(), z.object({ message: z.string() })]) }).safeParse(result);
    throw new Error(failure.success ? typeof failure.data.detail === "string" ? failure.data.detail : failure.data.detail.message : "WhatsApp could not complete this action.");
  }
  return result;
}

// External browser SDK shape, not a mirrored server/DB contract.
interface FacebookSdk {
  init(options: { appId: string; version: string; cookie: boolean; xfbml: boolean }): void;
  login(callback: (response: unknown) => void, options: { config_id: string; response_type: "code"; override_default_response_type: true; extras: { sessionInfoVersion: "3"; version: "v4" } }): void;
}
declare global { interface Window { FB?: FacebookSdk; } }
let loadingSdk: Promise<FacebookSdk> | undefined;

export function loadWhatsAppSdk(): Promise<FacebookSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  if (loadingSdk) return loadingSdk;
  loadingSdk = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onload = () => window.FB ? resolve(window.FB) : reject(new Error("WhatsApp signup could not load."));
    script.onerror = () => { loadingSdk = undefined; script.remove(); reject(new Error("WhatsApp signup could not load. Try again.")); };
    document.head.appendChild(script);
  });
  return loadingSdk;
}

export function launchWhatsAppSignup(sdk: FacebookSdk, appId: string, configId: string): Promise<{ code: string; wabaId: string }> {
  sdk.init({ appId, version: "v26.0", cookie: true, xfbml: false });
  return new Promise((resolve, reject) => {
    let code: string | undefined;
    let wabaId: string | undefined;
    let settled = false;
    const cleanup = () => { settled = true; clearTimeout(timer); window.removeEventListener("message", receive); };
    const finish = () => { if (!settled && code && wabaId) { cleanup(); resolve({ code, wabaId }); } };
    const fail = (message: string) => { if (!settled) { cleanup(); reject(new Error(message)); } };
    const eventReceipt = z.object({ type: z.literal("WA_EMBEDDED_SIGNUP"), event: z.string(), data: z.object({ waba_id: z.string().regex(/^\d+$/).optional() }).optional() });
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com" && event.origin !== "https://business.facebook.com") return;
      let value: unknown = event.data;
      if (typeof value === "string") { try { value = JSON.parse(value); } catch { return; } }
      const receipt = eventReceipt.safeParse(value);
      if (!receipt.success) return;
      if (receipt.data.event === "FINISH" || receipt.data.event === "FINISH_ONLY_WABA") { wabaId = receipt.data.data?.waba_id; finish(); }
      else if (receipt.data.event === "CANCEL" || receipt.data.event === "ERROR") fail("WhatsApp signup was cancelled. Start again.");
    };
    const timer = setTimeout(() => fail("WhatsApp signup expired. Start again."), 10 * 60 * 1000);
    window.addEventListener("message", receive);
    sdk.login((response) => {
      if (settled) return;
      const receipt = z.object({ authResponse: z.object({ code: z.string().min(1) }) }).safeParse(response);
      if (!receipt.success) { fail("WhatsApp authorization was not completed. Start again."); return; }
      code = receipt.data.authResponse.code;
      finish();
    }, { config_id: configId, response_type: "code", override_default_response_type: true, extras: { sessionInfoVersion: "3", version: "v4" } });
  });
}
