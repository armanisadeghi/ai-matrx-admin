// Frees a headless runner's live-walk-cap slot at once (utils/supabase/walkCap.ts, POST /__dev-walk?release=1).
// Called when `test-browser.mjs stop` (or the 30-minute idle stop) ends a session, so the 4-walk cap does not
// stay full on a runner that is already gone. Never throws: a server that is down has no slot to free.
export async function releaseWalkSlot(pageUrl, fetchImpl = fetch) {
  let origin;
  try {
    const u = new URL(pageUrl);
    if (!/(^|\.)localhost$/.test(u.hostname) && u.hostname !== 'localhost') return { released: false, reason: 'not a localhost preview host' };
    origin = u.origin;
  } catch {
    return { released: false, reason: 'no page url' };
  }
  try {
    const r = await fetchImpl(`${origin}/__dev-walk?release=1`, {
      method: 'POST',
      headers: { 'x-matrx-walk-release': '1' },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return { released: false, reason: `HTTP ${r.status}` };
    return { released: Boolean((await r.json())?.released) };
  } catch (e) {
    return { released: false, reason: String(e?.message || e) };
  }
}
