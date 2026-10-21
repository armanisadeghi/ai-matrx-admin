/**
 * Does a brand-owned account look like the brand's? Imports attach accounts as the brand's by default
 * (`web.property.owner_kind` defaults to 'company'), so a founder's personal X or YouTube can land in
 * the brand's audience. An account whose handle and profile name share no word with the brand name is
 * raised for review (an assist on the brand home) — never changed silently. Pure; tested.
 */

const FILLER = new Set(["inc", "llc", "ltd", "co", "corp", "company", "the", "and", "group", "official", "studio", "shop", "store"]);

function squash(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

/** The brand name's distinctive words (3+ letters, filler dropped), plus the whole name squashed. */
export function brandNameWords(brandName: string): string[] {
  const words = brandName
    .toLowerCase()
    .normalize("NFKD")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !FILLER.has(w));
  const whole = squash(brandName);
  return [...new Set(whole.length >= 3 ? [...words, whole] : words)];
}

/**
 * True when the account's handle or profile name carries a word of the brand name. With nothing to
 * compare (no brand words, no handle and no name) the account is not flagged.
 */
export function accountMatchesBrand(
  account: { handle: string; profileName?: string | null; displayName: string },
  brandName: string,
): boolean {
  const words = brandNameWords(brandName);
  const haystacks = [account.handle, account.profileName ?? "", account.displayName].map(squash).filter(Boolean);
  if (!words.length || !haystacks.length) return true;
  return words.some((w) => haystacks.some((h) => h.includes(w) || (h.length >= 4 && w.includes(h))));
}
