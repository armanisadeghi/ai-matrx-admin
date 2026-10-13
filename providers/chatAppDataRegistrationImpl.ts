// providers/chatAppDataRegistrationImpl.ts
//
// The implementations behind chatAppDataRegistration.ts's lazily-loaded component slots. Loaded
// through that file's ONE `import()` the first time either slot renders — never in a route's
// first load (THE FRAGMENTATION LAW: one impl module per registration file). Import this module
// from nowhere else.

import { AnchorRecordsList } from "@/features/content-ir/records/AnchorRecordsList";
import FullScreenMarkdownEditor from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";

export const appDataSlotImpls = { AnchorRecordsList, FullScreenMarkdownEditor };
