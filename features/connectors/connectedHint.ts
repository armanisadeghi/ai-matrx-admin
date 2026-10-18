// features/connectors/connectedHint.ts — WHAT THIS DEVICE LAST LEARNED ABOUT A PERSON'S PROVIDER.
//
// Owner ruling 2026-10-17: "There is no need to read google at all! Not until someone actually
// engages it." The new-chat connector card decides whether to offer itself WITHOUT a read: from
// the last answer this device saw (any Google state read — the card's own, the consent dialog's,
// Settings → Connectors — remembers it here). No answer yet = the offer shows; the first touch of
// the card reads the real state and the card steps away if it is already connected.
// Per person, per provider; localStorage only (a hint, never a source of truth for an action).

export interface ConnectorHint {
  connected: boolean;
  blocked: boolean;
}

const PREFIX = "matrx:connector-hint:";

function storageKey(providerId: string, userId: string): string {
  return `${PREFIX}${providerId}:${userId}`;
}

export function readConnectorHint(providerId: string, userId: string | null): ConnectorHint | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(providerId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConnectorHint>;
    return { connected: parsed.connected === true, blocked: parsed.blocked === true };
  } catch {
    return null;
  }
}

export function rememberConnectorHint(providerId: string, userId: string | null, hint: ConnectorHint): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(providerId, userId), JSON.stringify(hint));
  } catch {
    // Storage full or blocked: the card simply reads on its next touch.
  }
}
