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
 * THIS BRIDGE OWNS ITS PEEK (2026-10-18, adversarial IMPORTANT-4): its key is stable — the caller's
 * `peekKey`, else `kind:id` — so a host that unmounts and remounts while its caller still says "open"
 * re-asks for the SAME peek instead of stacking a second one; and unmounting (or changing `id`) closes
 * the peek it opened, so a caller that drops its target never leaves a peek out of sync with it. It
 * closes only a peek it still owns: one replaced by another opener of the same record is left alone.
 * The imperative `openResourcePeek` path keeps the floating behaviour (a popover that closes because
 * the person clicked into the peek does not take the peek with it).
 *
 * With no host on the page (the `(link)` group renders no `Providers`), the request falls back to
 * `fallbackHref` — by default the record's own route — in a new tab, never nothing (finding 7).
 */

import { useEffect, useRef, useState } from "react";
import { peekHref } from "./peekHref";
import { closeResourcePeek, openResourcePeek } from "./resourcePeekStore";

export interface ResourcePeekHostProps {
  kind: string;
  id: string | null;
  onClose: () => void;
  /** The destination the CALLER resolved for this record (see `peekHrefOverride`). */
  href?: string | null;
  /** One peek per key. Default `kind:id`. */
  peekKey?: string;
  /** Where the record opens when no peek host is on this page. Default: `href`, else the record's route. */
  fallbackHref?: string | null;
}

export function ResourcePeekHost({ kind, id, onClose, href, peekKey, fallbackHref }: ResourcePeekHostProps) {
  const key = id ? (peekKey ?? `${kind}:${id}`) : null;
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  // ONE function for this mount's whole life: it is the owner mark, and a re-request (new href)
  // replaces the open peek without telling the caller it closed.
  const [notifyClose] = useState(() => () => closeRef.current());
  const fallback = fallbackHref ?? href ?? (id ? peekHref(kind, id) : undefined) ?? null;

  // Unmount, or a new record / key: close the peek this bridge opened (the caller is gone or moved on).
  useEffect(() => {
    if (!key) return;
    return () => closeResourcePeek(key, { notify: false, owner: notifyClose });
  }, [key, notifyClose]);

  useEffect(() => {
    if (!key || !id) return;
    openResourcePeek({ key, kind, id, href, trigger: "click", onClose: notifyClose, fallbackHref: fallback });
  }, [key, kind, id, href, fallback, notifyClose]);

  return null;
}
