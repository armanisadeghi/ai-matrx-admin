/**
 * lib/pwa/push.ts — the platform's ONE web-push primitive (browser half).
 *
 * Turning push on for THIS browser = permission → the root service worker
 * (`/blob-sw.js`, which carries the `push` / `notificationclick` handlers) →
 * `pushManager.subscribe` with the VAPID public key → this person's row in
 * `communication.push_subscription` (written directly, personal RLS; one row
 * per person per browser). Turning it off soft-deletes that row and
 * unsubscribes the browser. The ONE sender is aidream
 * `services/notifications/web_push.py`; nothing else sends.
 *
 * Platform reality:
 *   • iOS/iPadOS deliver web push ONLY to a web app added to the Home Screen
 *     (16.4+). In Safari tabs `PushManager` is absent — `pushAvailability()`
 *     says `ios-needs-install` so the UI can show the two-tap hint instead of
 *     a switch that does nothing.
 *   • `Notification.requestPermission()` must run from a user gesture.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";
import { getClaimsUser } from "@ai-matrx/auth";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { isIosSafari, isStandalone } from "@/lib/pwa/install";

/** The root service worker that carries the push handlers (blob cache SW). */
const PUSH_SERVICE_WORKER_URL = "/blob-sw.js";

export type PushAvailability =
  /** Push works in this browser. */
  | "supported"
  /** iOS Safari tab: push needs the app added to the Home Screen first. */
  | "ios-needs-install"
  /** The server's public key is not set in this build. */
  | "not-configured"
  /** This browser has no web push at all. */
  | "unsupported";

export type PushDeviceState = "on" | "off" | "blocked";

/**
 * Pending-table type. `communication.push_subscription` is written by
 * migrations/education_web_push_subscription.sql, which waits for its live
 * apply (with Arman). Until `pnpm db-types` can see it, this mirrors the
 * migration's columns; after the apply, delete it and use the generated type.
 */
interface PushSubscriptionTable {
  Row: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth_secret: string;
    user_agent: string | null;
    device_label: string | null;
    organization_id: string;
    created_by: string | null;
    deleted_at: string | null;
    disabled_at: string | null;
  };
  Insert: {
    endpoint: string;
    p256dh: string;
    auth_secret: string;
    user_agent?: string | null;
    device_label?: string | null;
    organization_id: string;
    created_by: string;
    deleted_at?: string | null;
    disabled_at?: string | null;
    disabled_reason?: string | null;
  };
  Update: Partial<PushSubscriptionTable["Insert"]>;
  Relationships: [];
}
interface PendingPushDatabase {
  communication: {
    Tables: { push_subscription: PushSubscriptionTable };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

function pushTable() {
  // Announced stand-in until the generated type lands (see PendingPushDatabase).
  const client = supabase as unknown as SupabaseClient<PendingPushDatabase, "communication">;
  return client.schema("communication").from("push_subscription");
}

export function vapidPublicKey(): string {
  return (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
}

export function pushAvailability(): PushAvailability {
  if (typeof window === "undefined") return "unsupported";
  const hasPush =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!hasPush) {
    return isIosSafari() && !isStandalone() ? "ios-needs-install" : "unsupported";
  }
  if (!vapidPublicKey()) return "not-configured";
  return "supported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  let s = "";
  for (const b of new Uint8Array(buffer)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pushRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  // Same script + scope the blob cache registers, so this never forks a second worker.
  await navigator.serviceWorker.register(PUSH_SERVICE_WORKER_URL, { scope: "/" });
  return navigator.serviceWorker.ready;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iPhone or iPad"
    : /Android/.test(ua)
      ? "Android"
      : /Mac/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "Browser";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "browser";
  return `${browser} on ${os}`;
}

/** What this browser says right now, without asking the person anything. */
export async function readPushDeviceState(): Promise<PushDeviceState> {
  if (pushAvailability() !== "supported") return "off";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Turn push on for this browser. Call from a user gesture. */
export async function enablePushOnThisDevice(): Promise<PushDeviceState> {
  if (pushAvailability() !== "supported") {
    throw new Error("Push is not available in this browser.");
  }
  const permission = await Notification.requestPermission();
  if (permission === "denied") return "blocked";
  if (permission !== "granted") return "off";

  const reg = await pushRegistration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()),
    }));

  const {
    data: { user },
    error: authError,
  } = await getClaimsUser(supabase);
  if (authError || !user?.sub) throw new Error("Sign in to turn on reminders.");
  const organizationId = await ensureOrgId(null);
  const row = {
    endpoint: sub.endpoint,
    p256dh: bytesToBase64Url(sub.getKey("p256dh")),
    auth_secret: bytesToBase64Url(sub.getKey("auth")),
    user_agent: navigator.userAgent.slice(0, 300),
    device_label: deviceLabel(),
    organization_id: organizationId,
    created_by: user.sub,
    disabled_at: null,
    disabled_reason: null,
  };

  const existing = await pushTable()
    .select("id")
    .eq("created_by", user.sub)
    .eq("endpoint", sub.endpoint)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const write = existing.data
    ? await pushTable().update(row).eq("id", existing.data.id)
    : await pushTable().insert({ ...row, organization_id: row.organization_id });
  if (write.error) throw new Error(write.error.message);
  return "on";
}

/** Turn push off for this browser: soft-delete its row, then unsubscribe. */
export async function disablePushOnThisDevice(): Promise<PushDeviceState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    const {
      data: { user },
    } = await getClaimsUser(supabase);
    if (user?.sub) {
      const res = await pushTable()
        .update({ deleted_at: new Date().toISOString() })
        .eq("created_by", user.sub)
        .eq("endpoint", sub.endpoint)
        .is("deleted_at", null);
      if (res.error) throw new Error(res.error.message);
    }
    await sub.unsubscribe();
  }
  return "off";
}
