// The /_next/static assets a Next.js HTML page references — read from the markup AND from the
// JOINED React Server Components payload. Next streams that payload as many
// `self.__next_f.push([1,"…"])` scripts and may split one string (a chunk file name) across two
// pushes, so scanning the raw HTML found half a name (`/_next/static/chunks/0gcx9cd`) and the sign-in
// gate cried "stale server" on an asset served 200 (W5 2026-10-18). Decode every push, join them,
// then scan; scan the markup only with the payload scripts removed.

const PUSH = /self\.__next_f\.push\(\[\s*1\s*,\s*("(?:[^"\\]|\\.)*")\s*\]\)/g;
const PAYLOAD_SCRIPT = /<script[^>]*>\s*\(?self\.__next_f\s*=[\s\S]*?<\/script>|<script[^>]*>\s*self\.__next_f\.push\([\s\S]*?<\/script>/g;
const ASSET = /\/_next\/static\/[^"'\s)\\<>,]+/g;

/** The RSC payload: every push's string, JSON-decoded, in order, joined. */
export function joinedFlightPayload(html) {
  let out = "";
  for (const m of html.matchAll(PUSH)) {
    try {
      out += JSON.parse(m[1]);
    } catch {
      /* a malformed push carries no asset we could trust */
    }
  }
  return out;
}

/** Unique asset paths the page references, from the markup and the joined payload. */
export function referencedAssets(html) {
  const markup = html.replace(PAYLOAD_SCRIPT, "");
  const found = new Set();
  for (const source of [markup, joinedFlightPayload(html)]) for (const m of source.matchAll(ASSET)) found.add(m[0]);
  return [...found];
}
