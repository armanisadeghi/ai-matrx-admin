// features/rich-document/actions/handlers/register-if-absent.ts
//
// Every web handler registers through this, never through `registerAction` directly.
// The message actions are moving into @ai-matrx/chat (`registerChatMessageActions()`),
// and the registry THROWS on a duplicate id outside development. During the move the
// package and this app can both carry a handler for the same id, in either load order.
// An id someone ELSE registered first (the package) is skipped, so the app never throws
// and the package copy serves. An id THIS module registered keeps going through
// `registerAction`, so development fast refresh still replaces the edited handler.

import { getAction, registerAction } from "@ai-matrx/rich-content/rich-document/actions/provider";
import type { RichDocumentAction } from "@ai-matrx/rich-content/rich-document/types";

const OWN = Symbol.for("ai-matrx.web.rich-document.own-action-ids");

function ownIds(): Set<string> {
  const g = globalThis as unknown as Record<symbol, Set<string> | undefined>;
  let ids = g[OWN];
  if (!ids) {
    ids = new Set<string>();
    g[OWN] = ids;
  }
  return ids;
}

export function registerActionIfAbsent(action: RichDocumentAction): void {
  const own = ownIds();
  if (getAction(action.id) && !own.has(action.id)) return;
  own.add(action.id);
  registerAction(action);
}
