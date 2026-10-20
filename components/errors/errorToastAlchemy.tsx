"use client";

/**
 * The error-toast half of "every error on screen carries the Alchemy Menu".
 * Registered once by the app-wide Toaster (`components/ui/sonner.tsx`) through
 * `setErrorToastDecorator` in `lib/toast.ts`, so every `toast.error`,
 * `toastErrorAlreadyCaptured` and `recordToast.error` inherits it with no
 * caller change.
 */
import { createElement } from "react";
import { LazyErrorAlchemyMenu } from "@/components/errors/LazyErrorAlchemyMenu";
import type { ErrorAlchemyMenuProps } from "@/components/errors/ErrorAlchemyMenu";
import type { ErrorAlchemyInput } from "@/components/errors/error-alchemy";
import type { ErrorToastDecorator } from "@/lib/toast";

/**
 * 🚨 ONE ASYNC EDGE, HERE — never a static import (2026-10-13, root-layout lane A1).
 * This module is registered by the Toaster that `app/layout.tsx` renders on EVERY route,
 * /login included. A static `ErrorAlchemyMenu` import dragged its whole graph (copy doors,
 * the chat surface runtime, workspace gate, associations, the agents catalog, the
 * rich-content block registry, records) — ~4 MB — into every route's first load, for a
 * menu that only ever appears on an error toast. The toast's own text renders at once;
 * the menu appears when its chunk lands (nothing in its slot until then). The edge sits
 * at this ONE call site on purpose: ErrorAlchemyMenu has 30+ static importers, and a
 * front door on the menu itself would multiply a chunk-group split across all of them
 * (code-splitting skill, rule 6 caveat / D115).
 */
// THE EDGE IS `LazyErrorAlchemyMenu` (AT-FIX-I, 2026-10-19): it holds the same one `import()` behind a
// boundary that renders nothing if the chunk cannot arrive. The bare `clientLazy` here threw its
// ChunkLoadError to the page when a phone was offline: any background call that failed offline raised an
// error toast, the toast's menu chunk could not load, and the whole page became "A required part of the
// page failed to load" - on a capture sheet, with an answer half typed.
const ErrorAlchemyMenu: (props: ErrorAlchemyMenuProps) => ReturnType<typeof LazyErrorAlchemyMenu> = LazyErrorAlchemyMenu;

function descriptionText(description: unknown): string | undefined {
  return typeof description === "string" && description.trim() !== ""
    ? description
    : undefined;
}

export const decorateErrorToast: ErrorToastDecorator = (message, options, record) => {
  const description = descriptionText(options?.description);
  const input: ErrorAlchemyInput = {
    title: description ? message : undefined,
    message: description ?? message,
    records: record
      ? [{ type: record.type, id: record.id, ...(record.title ? { label: record.title } : {}) }]
      : undefined,
    source: "toast",
  };
  const menu = createElement(ErrorAlchemyMenu, { input, label: message, className: "error-toast-copy" });
  if (options?.action === undefined) return { ...options, action: menu };
  if (options?.cancel === undefined) return { ...options, cancel: menu };
  return options;
};
