// lib/scoped-config/deviceIdCookie.ts
//
// The web device id (deviceId.ts) mirrored into a first-party cookie so the (core) layout can
// address the SAME device rung when it reads the person's knob snapshot for first paint
// (first-paint fetch contract G2). No cookie (a first visit, cookies blocked): the server reads no
// snapshot and the browser asks as before. Shared by the browser writer and the server reader.

export const WEB_DEVICE_ID_COOKIE = "matrx_web_device";

const UUID_SHAPE = /^[0-9a-f-]{36}$/i;

export function parseWebDeviceIdCookie(value: string | null | undefined): string | null {
  return value && UUID_SHAPE.test(value) ? value : null;
}
