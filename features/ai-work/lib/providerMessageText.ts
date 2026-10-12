import { messagePartsFromPersistedContent } from "@ai-matrx/chat/agents/redux/execution-system/messages/persisted-content-boundary";

export interface ProviderMessageDisplay {
  text: string;
  activityCount: number;
}

/**
 * Normalizes validated canonical message parts for a read-only provider
 * transcript. Thinking stays private; non-text parts are counted as activity
 * instead of being fabricated into prose.
 */
export function providerMessageDisplay(
  content: unknown,
): ProviderMessageDisplay {
  const parts = messagePartsFromPersistedContent(content);
  let text = "";
  let activityCount = 0;

  for (const part of parts) {
    if (part.type === "text") {
      if (part.text) text += part.text;
      continue;
    }
    if (part.type !== "thinking") activityCount += 1;
  }

  return { text, activityCount };
}

/**
 * Text the coding host wraps in a machine envelope and records as a "user"
 * turn: task notifications, system reminders, slash-command echoes, hook
 * output. A hyphenated tag is never something a person typed as HTML.
 */
const MACHINE_ENVELOPE = /^\s*<[a-z]+(?:-[a-z]+)+[\s>]/;

/**
 * A turn a PERSON typed: the transcript's jump targets ("previous message I
 * sent"). Never a tool result, an empty activity-only turn, or a host
 * envelope that only rides the user role.
 */
export function isTypedUserTurn(message: {
  role: string;
  display: Pick<ProviderMessageDisplay, "text">;
}): boolean {
  if (message.role !== "user") return false;
  const text = message.display.text.trim();
  return text.length > 0 && !MACHINE_ENVELOPE.test(text);
}
