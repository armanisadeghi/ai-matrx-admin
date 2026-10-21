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

/** Everything that names the brand: its name, legal names, and its websites' domains. */
export interface BrandIdentity {
  name: string;
  legalNames?: readonly (string | null | undefined)[];
  /** Website addresses or bare domains ("https://thegoodtrade.com/", "goodgear.com"). */
  websites?: readonly (string | null | undefined)[];
}

type CheckedAccount = { handle: string; profileName?: string | null; displayName: string };

const GENERIC_TLDS = /\.(com|net|org|co|io|ai|app|shop|store|biz|info|us|uk|ca|au|ph|de|fr)$/;

/** "https://www.thegoodtrade.com/" -> "thegoodtrade"; "the-good-trade.co.uk" -> "the good trade". */
export function domainName(website: string): string {
  let host = website.trim().toLowerCase();
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:/.test(host) ? host : `https://${host}`).hostname;
  } catch {
    /* a bare value stays as written */
  }
  host = host.replace(/^www\./, "");
  while (GENERIC_TLDS.test(host)) host = host.replace(GENERIC_TLDS, "");
  return host.split(".").pop()?.replace(/-/g, " ") ?? "";
}

export interface OwnerCheckResult {
  /** Index (into the accounts given) of each account no identity of the brand names. */
  suspects: Set<number>;
  /** The name most accounts share, when the brand name is not it (the brand name may be wrong). */
  nameMostAccountsUse: string | null;
}

/**
 * Which brand-owned accounts look like someone else's. Each account is compared with the brand's whole identity —
 * name, legal names, website domains and the name most of its accounts share — so one mislabeled brand name
 * ("Natalie Gale" on The Good Trade) neither flags the brand's seven real accounts nor clears the one personal
 * account that happens to carry that name: when most accounts disagree with the brand name and agree with another
 * of its names, the brand name stops counting as identity.
 */
export function checkAccountOwners(accounts: readonly CheckedAccount[], identity: BrandIdentity): OwnerCheckResult {
  const legal = (identity.legalNames ?? []).filter((n): n is string => Boolean(n && n.trim()));
  const domains = (identity.websites ?? []).filter((w): w is string => Boolean(w && w.trim())).map(domainName).filter(Boolean);
  const profileNames = accounts.map((a) => a.profileName ?? "").filter((n) => n.trim());

  const matchCount = (name: string) => accounts.filter((a) => brandNameWords(name).length && accountMatchesBrand(a, name)).length;
  const half = accounts.length / 2;

  // The name most accounts share: among the legal names, domains and the accounts' own profile names.
  let common: { name: string; count: number } | null = null;
  for (const name of [...legal, ...domains, ...profileNames]) {
    const count = matchCount(name);
    if (!common || count > common.count) common = { name, count };
  }

  const nameCount = matchCount(identity.name);
  const nameIsWrong = accounts.length >= 3 && nameCount < half && common !== null && common.count > half;
  const names = nameIsWrong ? [...legal, ...domains, common!.name] : [identity.name, ...legal, ...domains];
  // A domain or legal name only one outsider carries does not vouch for it when the brand name was wrong:
  // keep only names that agree with the majority's name or are the brand's own.
  const trusted = nameIsWrong ? names.filter((n) => matchCount(n) > half || n === common!.name) : names;

  const suspects = new Set<number>();
  accounts.forEach((account, i) => {
    const hay = [account.handle, account.profileName ?? "", account.displayName].some((h) => h.trim());
    const usable = trusted.filter((n) => brandNameWords(n).length);
    if (!hay || !usable.length) return;
    if (!usable.some((n) => accountMatchesBrand(account, n))) suspects.add(i);
  });
  return { suspects, nameMostAccountsUse: nameIsWrong ? common!.name : null };
}
