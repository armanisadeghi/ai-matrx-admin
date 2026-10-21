/**
 * A forwarding page (`redirect` from an old or duplicate address) keeps the caller's query string.
 * `query` is the awaited Next `searchParams` record; repeated keys stay repeated.
 */
export function withForwardedQuery(
  path: string,
  query: Record<string, string | string[] | undefined>,
): string {
  const [base, existing = ""] = path.split("?");
  const search = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(query)) {
    if (search.has(key)) continue; // the destination's own parameter wins
    if (Array.isArray(value)) for (const item of value) search.append(key, item);
    else if (value !== undefined) search.set(key, value);
  }
  const text = search.toString();
  return text ? `${base}?${text}` : base;
}
