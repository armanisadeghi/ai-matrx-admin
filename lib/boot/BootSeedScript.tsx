// lib/boot/BootSeedScript.tsx — a server component that STREAMS one boot seed to the browser as an
// inline script. Rendered inside `<Suspense fallback={null}>` by the (core) layout, so it never holds
// the first byte; the script runs the moment its chunk is parsed (before hydration), and the reads
// it can answer pick it up through `drainBootSeeds()` (`bootSeedSlot.ts`). Null answer: no script.

import "server-only";

import { PrepaintScript } from "@/components/ssr/PrepaintScript";

// Built from char codes, never written into a regex literal: a raw line separator in source ends
// the line and breaks the whole server chunk.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/** JSON safe inside a <script>: no `</script>`, no HTML comment openers, no line separators. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}

export async function BootSeedScript({ name, seed }: { name: string; seed: Promise<unknown> }) {
  const value = await seed.catch(() => null);
  if (value == null) return null;
  // Through PrepaintScript: React client-renders this Suspense boundary at times (an update reaches
  // it before it hydrates), and a client-created <script> never runs and logs React's "Encountered a
  // script tag" on every page. Server HTML and hydration draw it; a client-only render draws nothing.
  return <PrepaintScript html={`self[${JSON.stringify(name)}]=${scriptJson(value)};`} />;
}
