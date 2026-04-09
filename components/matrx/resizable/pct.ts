/**
 * react-resizable-panels v4: numeric Panel size props are pixels.
 * Use `${n}%` (or string "n" per docs) when the value is a percentage 0–100.
 */
export function pct(n: number): string {
  return `${n}%`;
}
