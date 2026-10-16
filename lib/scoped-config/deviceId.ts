// lib/scoped-config/deviceId.ts
//
// The DEVICE rung's identity on the web (USD-9: precedence 110, below `user`).
//
// A desktop install has a real instance id (matrx-local's `app_instances`) and
// a kiosk has a paired device row. A browser has neither, so the web client
// mints ONE uuid per browser profile and keeps it in localStorage under a name
// that says exactly what it is. It is deliberately NOT a fingerprint: clearing
// site data forgets the device, which is the honest answer ("this browser" is
// gone). It never leaves the client except as `p_device_id` on the settings
// read and `scope_id` on a device-rung write.
//
// Named clearly so the next agent replacing it with a platform-issued device
// identity (the same one matrx-local and matrx-extend carry) can grep for it.

import { defineClientKey } from "@/lib/sync/client-storage";
import { WEB_DEVICE_ID_COOKIE } from "./deviceIdCookie";

export const WEB_DEVICE_ID_STORAGE_KEY = "matrx.settings.web_device_id";

const deviceIdKey = defineClientKey({
  id: "settings.web-device-id",
  area: "local",
  kind: "device",
  reason: "Names this browser profile for the device settings rung; clearing site data forgets it.",
  legacyKey: WEB_DEVICE_ID_STORAGE_KEY,
});

let memo: string | null = null;

/** Mirror the id into its cookie (deviceIdCookie.ts) once per tab, so the server can address the rung. */
function mirrorToCookie(id: string): string {
  try {
    const present = document.cookie.split(";").some((part) => part.trim() === `${WEB_DEVICE_ID_COOKIE}=${id}`);
    if (!present) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${WEB_DEVICE_ID_COOKIE}=${id}; path=/; max-age=31536000; SameSite=Lax${secure}`;
    }
  } catch {
    // Cookies blocked: the server simply reads no snapshot for first paint.
  }
  return id;
}

/** The stable per-browser device id, or null when storage is unavailable (SSR, blocked). */
export function getWebDeviceId(): string | null {
  if (memo) return memo;
  if (typeof window === "undefined") return null;
  const existing = deviceIdKey.get();
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
    memo = mirrorToCookie(existing);
    return existing;
  }
  const minted = crypto.randomUUID();
  // Private mode / storage blocked: the device rung is simply not addressed.
  if (!deviceIdKey.set(minted)) return null;
  memo = mirrorToCookie(minted);
  return minted;
}
