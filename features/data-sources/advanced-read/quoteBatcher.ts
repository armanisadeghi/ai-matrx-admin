/**
 * One quote call for every page that asks in the same moment.
 *
 * A list of failed pages mounts one "Try advanced reader" button per row, and each used to fire its
 * own free quote request. Here every ask made in one tick joins ONE request (per organization and
 * reader speed), and an answered page is remembered by its address, so a re-mount or a second surface
 * asking about the same page costs no request at all. If the server's page limit leaves some
 * addresses out, the rest are asked in a follow-up request.
 */

import type { AdvancedAllow, Quote, QuoteItem } from "./contract";
import { quoteAdvancedRead } from "./server";

type Ask = (opts: { organizationId: string; urls: string[]; allow: AdvancedAllow }) => Promise<Quote>;

/** How long an answered page's quote is reused (matches the hook's staleTime). */
const REUSE_MS = 5 * 60 * 1000;

interface Cached {
  at: number;
  item: Promise<QuoteItem | null>;
}

interface Queue {
  organizationId: string;
  allow: AdvancedAllow;
  waiting: Map<string, Array<{ resolve: (item: QuoteItem | null) => void; reject: (err: unknown) => void }>>;
}

const cache = new Map<string, Cached>();
const queues = new Map<string, Queue>();
let ask: Ask = quoteAdvancedRead;

const cacheKey = (org: string, allow: AdvancedAllow, url: string) => `${org}\n${allow}\n${url}`;

/** Test seam: swap the network call and forget everything remembered. */
export function resetQuoteBatcher(next?: Ask): void {
  ask = next ?? quoteAdvancedRead;
  cache.clear();
  queues.clear();
}

async function flush(queue: Queue): Promise<void> {
  let remaining = [...queue.waiting.keys()];
  const waiting = queue.waiting;
  try {
    while (remaining.length > 0) {
      const quote = await ask({ organizationId: queue.organizationId, urls: remaining, allow: queue.allow });
      const answered = new Set<string>();
      for (const item of quote.items) {
        answered.add(item.url);
        waiting.get(item.url)?.forEach((w) => w.resolve(item));
      }
      const left = remaining.filter((u) => !answered.has(u));
      if (left.length === remaining.length) break; // no progress: the rest get no quote (they say so)
      remaining = left;
    }
    for (const url of remaining) waiting.get(url)?.forEach((w) => w.resolve(null));
  } catch (err) {
    for (const url of remaining) waiting.get(url)?.forEach((w) => w.reject(err));
  }
}

function ask1(organizationId: string, allow: AdvancedAllow, url: string): Promise<QuoteItem | null> {
  const qk = `${organizationId}\n${allow}`;
  let queue = queues.get(qk);
  if (!queue) {
    queue = { organizationId, allow, waiting: new Map() };
    queues.set(qk, queue);
    const mine = queue;
    setTimeout(() => {
      queues.delete(qk);
      void flush(mine);
    }, 0);
  }
  return new Promise<QuoteItem | null>((resolve, reject) => {
    const list = queue.waiting.get(url) ?? [];
    list.push({ resolve, reject });
    queue.waiting.set(url, list);
  });
}

/** The quote for `urls`: joins this tick's single request and reuses pages already answered. */
export async function batchedQuote(opts: { organizationId: string; urls: readonly string[]; allow: AdvancedAllow }): Promise<Quote> {
  const urls = [...new Set(opts.urls)];
  const now = Date.now();
  const items = await Promise.all(
    urls.map((url) => {
      const key = cacheKey(opts.organizationId, opts.allow, url);
      const hit = cache.get(key);
      if (hit && now - hit.at < REUSE_MS) return hit.item;
      const item = ask1(opts.organizationId, opts.allow, url);
      cache.set(key, { at: now, item });
      item.catch(() => cache.delete(key));
      return item;
    }),
  );
  const got = items.filter((i): i is QuoteItem => i !== null);
  const prices = got.map((i) => i.pointsUpTo);
  return {
    allow: opts.allow,
    items: got,
    pointsUpToTotal: prices.every((p): p is number => p !== null) ? prices.reduce((a, b) => a + b, 0) : null,
    limitApplied: null,
  };
}
