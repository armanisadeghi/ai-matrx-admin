// Pure, dependency-free: the chat host binds it at start-up (providers/chatUiRegistration.ts), so it
// must never sit in a module that drags the masterwork store into every route's first load.

/**
 * The question this answer answered — ONE implementation, used by both chat
 * surfaces' menus and nudges. The Oracle tap's whole premise is *"the question
 * maps which judgment is scarce, and the answer is already written in their
 * voice"*, so a draft that keeps only the answer throws away the half that
 * makes it a rule. Walks back from the message to the nearest user turn.
 *
 * Takes the minimum shape both stores already have, so neither surface needs a
 * store-specific helper of its own.
 */
export function precedingQuestion(
  messages: ReadonlyArray<{ id: string; role: string; content?: string | null }>,
  messageId: string | null,
): string | null {
  if (!messageId) return null;
  const index = messages.findIndex((m) => m.id === messageId);
  if (index <= 0) return null;
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i].role !== "user") continue;
    const text = (messages[i].content ?? "").trim();
    return text.length > 0 ? text : null;
  }
  return null;
}
