"use client";

/**
 * ResourcePeekHost — the DECLARATIVE way to ask for a peek: render it with an `id` and the record's
 * peek opens; set `id` to null (or have the peek call `onClose`) and it closes.
 *
 * It draws NOTHING and imports NOTHING heavy. It forwards the request to `resourcePeekStore`, and
 * the ONE `ResourcePeekRoot` mounted in `app/Providers.tsx` draws it behind the app's single lazy
 * edge to `ResourcePeekHostImpl`. (Until 2026-10-17 this file WAS that lazy edge, mounted per
 * reference — the top HIGH-tier dynamic edge in `pnpm lab:graph`, 482 contexts × 724 modules.)
 *
 * Imperative callers (a button's click) use `openResourcePeek` from `./resourcePeekStore` directly.
 *
 * Unmounting this component does NOT close an open peek: the peek is a floating quick look owned by
 * the app's host, so a popover or menu that closes because the person clicked into the peek no
 * longer takes the peek with it. The host closes every peek when the route changes.
 */

import { useEffect, useId, useRef, useState } from "react";
import { closeResourcePeek, openResourcePeek } from "./resourcePeekStore";

export interface ResourcePeekHostProps {
  kind: string;
  id: string | null;
  onClose: () => void;
  /** The destination the CALLER resolved for this record (see `peekHrefOverride`). */
  href?: string | null;
}

export function ResourcePeekHost({ kind, id, onClose, href }: ResourcePeekHostProps) {
  const key = `resource-peek-host:${useId()}`;
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // ONE function for this mount's whole life, so a re-request (new href) replaces the open peek
  // without telling the caller it closed.
  const [notifyClose] = useState(() => () => closeRef.current());

  useEffect(() => {
    if (!id) {
      // The caller closed it — nothing to tell them.
      closeResourcePeek(key, { notify: false });
      return;
    }
    openResourcePeek({ key, kind, id, href, trigger: "click", onClose: notifyClose });
  }, [key, kind, id, href, notifyClose]);

  return null;
}
