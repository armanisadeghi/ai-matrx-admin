/**
 * What this browser is, in a person's words, for "Started from iPhone" on the computer.
 *
 * Its own module on purpose (2026-10-22): the chat host (app/Providers.tsx → ChatHostAdapter →
 * ai-models/remote/your-computers) labels its relay client with this on EVERY page. Living in
 * sessions/model.ts it dragged @ai-matrx/coding-sessions/react — the whole chat conversation column
 * and tool-call registry — into every route's build graph, and the production compile ran out of
 * memory on Vercel's 60 GB machine (v0.4.3450). Keep this file free of imports.
 */
export function clientLabelFor(userAgent: string): string {
  const ua = userAgent || "";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua))) return "iPad";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android phone" : "Android tablet";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const os = /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
  return os ? `${browser} on ${os}` : browser;
}
