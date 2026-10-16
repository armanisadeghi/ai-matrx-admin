/** The compute door to aidream `/scraper/advanced-read` (the quote is free; a read bills points). */

import { postJson, postNdjson } from "@/lib/python-client";

import { AdvancedReadRefusal, parseQuote, readAdvancedEvent, type AdvancedAllow, type AdvancedItem, type Quote } from "./contract";

const BASE = "/scraper/advanced-read";

export async function quoteAdvancedRead(opts: { organizationId: string; urls: string[]; allow: AdvancedAllow; signal?: AbortSignal }): Promise<Quote> {
  const { data } = await postJson<unknown, { urls: string[]; allow: AdvancedAllow }>(
    `${BASE}/quote`,
    { urls: opts.urls, allow: opts.allow },
    { organizationId: opts.organizationId, signal: opts.signal },
  );
  return parseQuote(data);
}

/**
 * Read the pages through the covering readers. `onItem` fires as each page lands. Resolves with every
 * item the stream delivered; a server refusal throws `AdvancedReadRefusal`; a stream that breaks
 * throws the transport error (the caller says so plainly and offers a retry).
 */
export async function runAdvancedRead(opts: {
  organizationId: string;
  urls: string[];
  allow: AdvancedAllow;
  onItem: (item: AdvancedItem) => void;
  signal?: AbortSignal;
}): Promise<AdvancedItem[]> {
  const seen = new Map<string, AdvancedItem>();
  let closed = false;
  for await (const evt of postNdjson(BASE, { urls: opts.urls, allow: opts.allow }, { organizationId: opts.organizationId, signal: opts.signal })) {
    const read = readAdvancedEvent(evt);
    if (!read) continue;
    if (read.kind === "refusal") throw read.refusal;
    if (read.kind === "item") {
      seen.set(read.item.url, read.item);
      opts.onItem(read.item);
    } else {
      closed = true;
      for (const item of read.items) {
        if (!seen.has(item.url)) {
          seen.set(item.url, item);
          opts.onItem(item);
        }
      }
    }
  }
  if (!closed && seen.size === 0) throw new AdvancedReadRefusal("advanced_read_dropped", "The connection dropped before the pages answered.");
  return [...seen.values()];
}
