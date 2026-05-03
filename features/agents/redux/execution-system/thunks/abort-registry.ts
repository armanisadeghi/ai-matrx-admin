/**
 * Abort Registry
 *
 * Simple module-level map: conversationId → AbortController.
 * executeInstance registers here so cancelExecution can abort the
 * in-flight fetch from anywhere.
 */

const registry = new Map<string, AbortController>();

export function registerAbortController(
  conversationId: string,
  controller: AbortController,
): void {
  registry.set(conversationId, controller);
}

export function unregisterAbortController(conversationId: string): void {
  registry.delete(conversationId);
}

export function abortConversation(conversationId: string): void {
  registry.get(conversationId)?.abort();
  registry.delete(conversationId);
}
