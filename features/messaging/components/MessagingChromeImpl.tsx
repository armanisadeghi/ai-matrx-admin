"use client";

/**
 * The loaded half of `MessagingChrome.tsx` — what draws INSIDE the chrome wrappers: the message's
 * "Linked" section and the ```matrx fence renderer. Both pull real weight (the association store,
 * the message menu's actions, and the kind registry behind `MatrxEnvelopeBlock`), and the chrome is
 * bound app-wide by `providers/MessagingHost.tsx`, so they arrive through ONE `import()` of this
 * module the first time a message renders. Only `MessagingChrome.tsx` imports this file.
 */

import type { Message } from "@ai-matrx/messaging/react";
import MatrxEnvelopeBlock from "@/features/matrx-envelope/MatrxEnvelopeBlock";
import { messageSenderName } from "@/features/messaging/lib/messaging-menu-actions";
import { MessageLinks } from "./MessageLinks";

/** What this message is linked to (W1.4's "Link a record…"), drawn only when it has a link. */
export function MessagingMessageLinks({ message }: { message: Message }) {
  return <MessageLinks messageId={message.id} title={messageSenderName(message)} />;
}

/** A ```matrx fence body, through the ONE decoder and the kind registry. */
export function MessagingFenceBody({ body }: { body: string }) {
  return <MatrxEnvelopeBlock content={body} />;
}
