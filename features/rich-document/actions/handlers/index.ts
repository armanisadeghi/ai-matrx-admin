// features/rich-document/actions/handlers/index.ts
//
// Side-effect imports — each handler module registers its actions with
// `registerAction(...)` at module load. Importing this index once
// guarantees the action registry is populated before any RichDocument
// calls `resolveActions()`.
//
// RichDocument.tsx imports this at the top of the file; consumers don't
// need to touch it directly.

import "./save";
import "./capture";
import "./listen";
import "./attach-to-chat";
import "./ai";
import "./chat";
import "./export";
import "./print";
import "./compare";
import "./feedback";
import "./answer-tools";
import "./annotations";
// The non-chat half of the package's `edit` / `open-fullscreen-editor` (message-actions W1a).
import "./host-edit-bodies";
