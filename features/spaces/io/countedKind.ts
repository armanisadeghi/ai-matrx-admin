/**
 * "1 table", "2 tables": an import report's "came over" line. The server names each kind in the plural
 * ("tables", "pages", "rows", "columns", "row pages"); a count of exactly one takes the singular of its last word.
 */
export function singularOf(kind: string): string {
  const m = /^(.*?)(\S+)$/.exec(kind);
  if (!m) return kind;
  const [, head, word] = m;
  if (/[^aeiou]ies$/i.test(word)) return `${head}${word.slice(0, -3)}y`;
  if (/(ss|us|is)$/i.test(word) || !/s$/i.test(word)) return kind;
  if (/(sh|ch|x|z|ss)es$/i.test(word)) return `${head}${word.slice(0, -2)}`;
  return `${head}${word.slice(0, -1)}`;
}

export function countedKind(count: number, kind: string): string {
  return `${count} ${count === 1 ? singularOf(kind) : kind}`;
}
