// Chat's two awaitable dialogs (value prompts, conversation rename) are summon overlays of this app: chat's
// openers ask through its dialog request ports, and each port opens the app overlay through requestOverlay.
// Value prompts render the app's own body (ProInput/ProTextarea) — the ONE value-prompts body.
// Imported for its effect by providers/ChatHostAdapter.tsx and components/dialogs/value-prompts/valuePromptsOpener.ts.
import { setChatDialogRequestPort } from "@ai-matrx/chat/ui/dialogRequestPorts";
import { requestOverlay } from "./requestOverlay";

setChatDialogRequestPort("value-prompts", (request) => requestOverlay("valuePromptsDialog", request, { cancel: null }));
setChatDialogRequestPort("conversation-rename", (request) =>
  requestOverlay("conversationRenameDialog", request, { cancel: false }),
);
