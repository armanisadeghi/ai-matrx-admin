// lib/labels/tellApart.ts
//
// Two different records must never read the same in a list (two organizations both named
// "Cedar Ridge Physical Therapy"). These give each same-named record a short tail that tells
// it apart; a renderer keeps the tail visible when it truncates, or the rows still read alike.

/** The shortest id prefix (at least four characters, dashes dropped) that tells every id apart. */
export function shortDistinctIds(ids: readonly string[]): Map<string, string> {
  const full = new Map(ids.map((id) => [id, id.replace(/-/g, "")]));
  let size = 4;
  while (size < 32 && new Set(Array.from(full.values(), (id) => id.slice(0, size))).size < full.size) size += 2;
  return new Map(Array.from(full, ([id, bare]) => [id, bare.slice(0, size)]));
}

/** For each entry whose label another entry shares (case-insensitive): " · <short id>"; else null. */
export function labelTails(entries: readonly { id: string; label: string }[]): Map<string, string | null> {
  const byLabel = new Map<string, string[]>();
  for (const { id, label } of entries) {
    const key = label.toLocaleLowerCase();
    const group = byLabel.get(key);
    if (group) group.push(id);
    else byLabel.set(key, [id]);
  }
  const tails = new Map<string, string | null>();
  for (const ids of byLabel.values()) {
    if (ids.length < 2) {
      tails.set(ids[0], null);
      continue;
    }
    for (const [id, short] of shortDistinctIds(ids)) tails.set(id, ` · ${short}`);
  }
  return tails;
}
