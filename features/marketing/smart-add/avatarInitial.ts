/**
 * The letter an account avatar shows when it has no photo (MKT-147).
 * It comes from the display name first, then the handle; a numeric id ("61555…") or a symbol never
 * counts as a letter, so a Facebook page known by profile.php?id=… shows its name's initial, never "6".
 */
export function avatarInitial(...sources: Array<string | null | undefined>): string {
  for (const source of sources) {
    const match = (source ?? "").match(/\p{L}/u);
    if (match) return match[0].toUpperCase();
  }
  return "?";
}
