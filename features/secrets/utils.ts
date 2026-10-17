/** Return an absolute browser-safe login destination, or null.
 *
 * Vault destination metadata is user-authored. Keeping this check at the
 * rendering boundary prevents executable schemes such as `javascript:` from
 * ever becoming a clickable door.
 */
export function safeVaultLoginUrl(input: string): string | null {
  try {
    const parsed = new URL(input.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}
