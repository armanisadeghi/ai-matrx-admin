/** The double-fire guard's identity for one kind action call (used by useKindActionRunner). */

/**
 * The in-flight identity for the double-fire guard.
 *
 * Keying by action key ALONE turns one slow action into a global lock: an
 * `apply_surface_write` whose policy is `ask` holds the key for as long as the
 * user reads the dialog, and every OTHER write from every block on every
 * surface is refused meanwhile. So the guard keys by action + target when the
 * input names one. Still per-target-idempotent (a double-click can't fire an
 * agent or a write twice), without the cross-talk.
 */
export function inFlightKey(key: string, input: unknown): string {
  if (input && typeof input === "object") {
    const target = (input as { target?: unknown }).target;
    if (typeof target === "string" && target) return `${key}::${target}`;
    const agentId = (input as { agentId?: unknown }).agentId;
    if (typeof agentId === "string" && agentId) return `${key}::${agentId}`;
    // One shortcut may run for several ideas at once; one idea's save key may not.
    const saveAs = (input as { saveAs?: unknown }).saveAs;
    if (typeof saveAs === "string" && saveAs) return `${key}::save:${saveAs}`;
    const shortcutId = (input as { shortcutId?: unknown }).shortcutId;
    // …and for several ideas at once: the scope it runs on is part of the identity.
    if (typeof shortcutId === "string" && shortcutId)
      return `${key}::${shortcutId}::${inputFingerprint((input as { scope?: unknown }).scope)}`;
  }
  // No named target: the input itself is the identity. A double-click sends the
  // SAME input (still refused); two pieces asking for different things (two
  // images' `fetch_image`, two files' `load_media`) never block each other.
  return `${key}::${inputFingerprint(input)}`;
}

/** A short, stable fingerprint of an action's input (key order ignored); "" when it has none. */
export function inputFingerprint(input: unknown): string {
  if (input === undefined || input === null) return "";
  let text: string;
  try {
    text = JSON.stringify(input, (_k, v: unknown) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
        : v,
    ) ?? "";
  } catch {
    // Unserializable (a Blob, a cycle): no stable identity, so never treat two calls as one.
    return `unkeyed:${Math.random().toString(36).slice(2)}`;
  }
  // FNV-1a over the text: bounded key length whatever the input size.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${text.length}:${(h >>> 0).toString(36)}`;
}
