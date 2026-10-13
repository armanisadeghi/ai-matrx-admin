// providers/chatAppDataRegistration.ts
//
// The app's DATA around a rendered chat message, registered into `@ai-matrx/chat`
// (../aidream/apps/shared/chat/src/host/app-data-slots.ts, P29a): the live kind validator, the
// records anchored to a chat, the shape catalog, the Source Inspector a citation opens and the
// full-screen editor. The formatted-text engine itself is NOT registered here — chat imports
// @ai-matrx/rich-content directly, and the app configures that package once (richContentHost).
// Imported for its side effect by ChatHostAdapter.

import { registerChatUi } from "@ai-matrx/chat/host/ui-slots";
import "@ai-matrx/chat/host/app-data-slots";
import { kindValidator } from "@/features/content-ir/registry/kind-schema-source";
import { useAnchorRecords } from "@/features/content-ir/records/useAnchorRecords";
import { fetchShapeByKind, fetchShapePage } from "@/features/content-ir/browse/service";
import { useOpenCitationSource } from "@/components/mardown-display/chat-markdown/citations/useOpenCitationSource";
import { lazySlotsFrom, SlotLoadingLine } from "@/providers/chatSlotLazy";

// LAZY SLOTS — one implementation module, one `import()` (providers/chatSlotLazy.tsx). The
// records list draws inside the chat header's records popover; while it loads, a one-line
// placeholder stands where its own one-line loading sentence will be. The full-screen editor
// draws nothing until it opens. The kind validator, shape reads and citation hook stay static
// (functions and hooks cannot load lazily).
const lazySlot = lazySlotsFrom(() =>
  import("@/providers/chatAppDataRegistrationImpl").then((m) => m.appDataSlotImpls),
);
const AnchorRecordsList = lazySlot("AnchorRecordsList", SlotLoadingLine);
const FullScreenMarkdownEditor = lazySlot("FullScreenMarkdownEditor");

export const chatAppDataSlots = {
  contentIrKindValidator: () => kindValidator,
  AnchorRecordsList,
  useAnchorRecords,
  fetchShapePage,
  fetchShapeByKind,
  useOpenCitationSource,
  FullScreenMarkdownEditor,
};

registerChatUi(chatAppDataSlots);
