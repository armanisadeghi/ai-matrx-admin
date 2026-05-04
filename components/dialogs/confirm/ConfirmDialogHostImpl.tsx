/**
 * components/dialogs/confirm/ConfirmDialogHostImpl.tsx
 *
 * Heavy implementation of the global confirm dialog host. Mounted lazily
 * by `ConfirmDialogHost.tsx` via `next/dynamic({ ssr: false })`, so this
 * file (and its `<ConfirmDialog>` / radix-alert-dialog dependency tree)
 * is NOT in the static graph of any route entry.
 *
 * Imperative model: calls to `confirm(...)` from anywhere in the app
 * push a request into a ref-backed queue; this component drains the
 * queue one item at a time and renders a `<ConfirmDialog>` for the
 * currently-active request. Resolving Promise<boolean> happens on
 * Confirm click (true), or on dismiss/cancel (false).
 *
 * The dialog closes immediately on click. Callers that need an in-dialog
 * busy spinner during their async work should keep using the inline
 * `<ConfirmDialog>` from `@/components/ui/confirm-dialog` with the
 * `busy` prop — that's still the right tool when busy state is
 * meaningful, e.g. a network delete that should hold the dialog open.
 */

"use client";

import * as React from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  _registerHost,
  _unregisterHost,
  type ConfirmOptions,
} from "./confirmDialogOpener";

interface ActiveRequest {
  opts: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

export default function ConfirmDialogHostImpl() {
  const [active, setActive] = React.useState<ActiveRequest | null>(null);
  const [tick, setTick] = React.useState(0);
  const queueRef = React.useRef<ActiveRequest[]>([]);

  // Register/unregister the controller exactly once. The controller's
  // `show` always pushes onto the queue and bumps `tick`; the drain
  // effect below picks up from there. This avoids stale-closure bugs
  // around `active`.
  React.useEffect(() => {
    const controller = {
      show: (opts: ConfirmOptions, resolve: (confirmed: boolean) => void) => {
        queueRef.current.push({ opts, resolve });
        setTick((n) => n + 1);
      },
    };
    _registerHost(controller);
    return () => _unregisterHost(controller);
  }, []);

  // Drain the queue whenever nothing is showing.
  React.useEffect(() => {
    if (active === null && queueRef.current.length > 0) {
      setActive(queueRef.current.shift()!);
    }
  }, [active, tick]);

  const handleConfirm = React.useCallback(() => {
    if (!active) return;
    active.resolve(true);
    setActive(null);
  }, [active]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open && active) {
        active.resolve(false);
        setActive(null);
      }
    },
    [active],
  );

  return (
    <ConfirmDialog
      open={!!active}
      onOpenChange={handleOpenChange}
      title={active?.opts.title ?? ""}
      description={active?.opts.description}
      confirmLabel={active?.opts.confirmLabel}
      cancelLabel={active?.opts.cancelLabel}
      variant={active?.opts.variant}
      onConfirm={handleConfirm}
    />
  );
}
