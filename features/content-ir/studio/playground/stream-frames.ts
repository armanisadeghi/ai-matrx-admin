/**
 * The values a shape receives while its item streams, in order: what the
 * partial-JSON parser hands the component as each piece of the wire lands —
 * keys in order, strings growing, arrays gaining one item at a time, the last
 * item filling field by field. Pure, so the replay is testable.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function* framesOf(value: Json): Generator<Json> {
  if (typeof value === "string") {
    if (value.length > 24) {
      yield value.slice(0, Math.ceil(value.length / 3));
      yield value.slice(0, Math.ceil((value.length * 2) / 3));
    }
    yield value;
    return;
  }
  if (Array.isArray(value)) {
    const done: Json[] = [];
    yield [];
    for (const item of value) {
      for (const partial of framesOf(item)) yield [...done, partial];
      done.push(item);
    }
    return;
  }
  if (value && typeof value === "object") {
    const done: { [key: string]: Json } = {};
    for (const [key, child] of Object.entries(value)) {
      for (const partial of framesOf(child)) yield { ...done, [key]: partial };
      done[key] = child;
    }
    if (Object.keys(value).length === 0) yield {};
    return;
  }
  yield value;
}

/**
 * Every frame from "nothing yet" (`{}`) to the whole value, sampled evenly to at
 * most `maxFrames` (the last frame is always the whole value).
 */
export function streamFrames(
  value: Record<string, unknown>,
  maxFrames = 48,
): Record<string, unknown>[] {
  const all: Record<string, unknown>[] = [{}];
  for (const frame of framesOf(value as Json)) all.push(frame as Record<string, unknown>);
  if (all.length <= maxFrames) return all;
  const out: Record<string, unknown>[] = [];
  const step = (all.length - 1) / (maxFrames - 1);
  for (let i = 0; i < maxFrames; i += 1) out.push(all[Math.round(i * step)]);
  out[out.length - 1] = all[all.length - 1];
  return out;
}

/** The middle of the stream: what "partial data" looks like for this value. */
export function partialFrame(value: Record<string, unknown>): Record<string, unknown> {
  const frames = streamFrames(value, 1000);
  return frames[Math.floor(frames.length / 2)] ?? {};
}
