/**
 * Smart Add — an email typed (or pasted) anywhere is an email (VISION Part 19). Pure.
 * Mirrors aidream `services/brand_intake/email_clues.py` `normalize_email`; the server reads every clue from it.
 */

const EMAIL =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/** The address in `text` (trimmed, `mailto:` removed, domain lower-cased), or null when it is not one. */
export function normalizeEmail(text: string | null | undefined): string | null {
  const t = (text ?? "").trim().replace(/^mailto:/i, "").split("?")[0].trim().replace(/^<|>$/g, "");
  if (!EMAIL.test(t)) return null;
  const at = t.lastIndexOf("@");
  return `${t.slice(0, at)}@${t.slice(at + 1).toLowerCase()}`;
}

/** The first box (in order) that holds an email, normalized; null when none does. */
export function emailIn(...texts: (string | null | undefined)[]): string | null {
  for (const t of texts) {
    const e = normalizeEmail(t);
    if (e) return e;
  }
  return null;
}
