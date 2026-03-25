/**
 * Message Draft Safety System
 *
 * Ensures user messages are never lost between submission and appearing in the UI.
 * Uses sessionStorage as a safety net — if anything goes wrong during the submit
 * pipeline, the content is restored to the input on next render or mount.
 *
 * Flow:
 * 1. User hits submit → draft saved to sessionStorage BEFORE clearing input
 * 2. Submit succeeds → draft cleared from sessionStorage
 * 3. Submit fails → draft restored to input immediately
 * 4. Page refresh / crash during submit → draft restored on next mount
 */

const DRAFT_KEY_PREFIX = "chat_draft_";
const DRAFT_INDEX_KEY = "chat_draft_index";

interface DraftPayload {
  content: string;
  resources: string; // JSON-serialized Resource[]
  timestamp: number;
}

function getDraftKey(conversationId: string | undefined): string {
  return `${DRAFT_KEY_PREFIX}${conversationId ?? "new"}`;
}

/** Save the current input content as a safety draft. Call BEFORE clearing the input. */
export function saveDraft(
  conversationId: string | undefined,
  content: string,
  resources?: unknown[],
): void {
  try {
    const key = getDraftKey(conversationId);
    const payload: DraftPayload = {
      content,
      resources: JSON.stringify(resources ?? []),
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));

    // Track this key in the index for cleanup
    const index: string[] = JSON.parse(
      sessionStorage.getItem(DRAFT_INDEX_KEY) ?? "[]",
    );
    if (!index.includes(key)) {
      index.push(key);
      sessionStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(index));
    }
  } catch {
    // sessionStorage may be full or unavailable — fail silently,
    // the worst case is we can't restore on crash (same as before).
  }
}

/** Clear the safety draft. Call AFTER the message is confirmed in the UI. */
export function clearDraft(conversationId: string | undefined): void {
  try {
    const key = getDraftKey(conversationId);
    sessionStorage.removeItem(key);

    const index: string[] = JSON.parse(
      sessionStorage.getItem(DRAFT_INDEX_KEY) ?? "[]",
    );
    const filtered = index.filter((k) => k !== key);
    sessionStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore
  }
}

/** Retrieve a saved draft if one exists. Returns null if none found. */
export function getDraft(
  conversationId: string | undefined,
): { content: string; resources: unknown[] } | null {
  try {
    const key = getDraftKey(conversationId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const payload: DraftPayload = JSON.parse(raw);

    // Discard drafts older than 24 hours — they're stale
    if (Date.now() - payload.timestamp > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(key);
      return null;
    }

    return {
      content: payload.content,
      resources: JSON.parse(payload.resources),
    };
  } catch {
    return null;
  }
}

/** Clean up any drafts older than 24 hours. Call sparingly (e.g. on app mount). */
export function cleanupStaleDrafts(): void {
  try {
    const index: string[] = JSON.parse(
      sessionStorage.getItem(DRAFT_INDEX_KEY) ?? "[]",
    );
    const now = Date.now();
    const kept: string[] = [];

    for (const key of index) {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;

      try {
        const payload: DraftPayload = JSON.parse(raw);
        if (now - payload.timestamp > 24 * 60 * 60 * 1000) {
          sessionStorage.removeItem(key);
        } else {
          kept.push(key);
        }
      } catch {
        sessionStorage.removeItem(key);
      }
    }

    sessionStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(kept));
  } catch {
    // Ignore
  }
}
