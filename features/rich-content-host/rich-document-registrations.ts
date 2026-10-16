/**
 * This app's rich-document registrations into @ai-matrx/rich-content's engine: chat's message
 * actions (the package's `registerChatMessageActions`), the action handlers still in this app
 * (they register on import, only ids nobody registered yet), the source adapters for this app's
 * records. (The conversation transfer rows and their Conversation submenu placement are the
 * package's own since message-actions W1b.)
 *
 * THE ONE web entry: the host's `ensureRichDocumentRegistrations` capability is
 * `ensureWebRichDocumentRegistrations`, and every non-chat surface that needs the actions without a
 * chat message rendered (right-click, notes, artifacts, text fields, tests) calls it too.
 */
import { registerSourceAdapter } from "@ai-matrx/rich-content/rich-document/actions/sources/index";
// The chat-message adapter is chat's own; it registers on import.
import "@ai-matrx/chat/agents/components/messages-display/rich-document/chat-message-source";
import { noteAdapter } from "@/features/rich-document/actions/sources/note";
import { promptResultAdapter } from "@/features/rich-document/actions/sources/prompt-result";
import { artifactAdapter } from "@/features/rich-document/actions/sources/artifact";
import { scraperResultAdapter } from "@/features/rich-document/actions/sources/scraper-result";
import { workingDocumentAdapter } from "@/features/rich-document/actions/sources/working-document";
// Before the handlers: their first registry read runs the host's ensure capability, which calls
// registerChatMessageActions — the binding must be initialized by then (else a TDZ ReferenceError).
import { registerChatMessageActions } from "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/register";
import "@/features/rich-document/actions/handlers";

registerSourceAdapter("note", noteAdapter);
registerSourceAdapter("prompt-result", promptResultAdapter);
registerSourceAdapter("artifact", artifactAdapter);
registerSourceAdapter("scraper-result", scraperResultAdapter);
registerSourceAdapter("working-document", workingDocumentAdapter);

/**
 * Every rich-document action this app offers is registered: the package's message actions (idempotent,
 * register-if-absent) and this module's own (loaded with the module). Safe to call any number of times.
 */
export function ensureWebRichDocumentRegistrations(): void {
  registerChatMessageActions();
}

ensureWebRichDocumentRegistrations();

