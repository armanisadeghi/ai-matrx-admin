/**
 * components/dialogs/confirm/ConfirmDialogHost.tsx
 *
 * Slim client shell + public entry point for the global confirm dialog.
 * Statically importable from anywhere — it does NOT pull `<ConfirmDialog>`,
 * radix-alert-dialog, or the host's own state machinery into the static
 * graph of route entries that mount it. The heavy body lives in
 * `ConfirmDialogHostImpl.tsx` and loads via `next/dynamic({ ssr: false })`.
 *
 * Two responsibilities:
 *
 *   1. Re-export the imperative API (`confirm`) from
 *      `confirmDialogOpener.ts` so any consumer can do:
 *        import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
 *        if (!(await confirm({ title: "Delete?", variant: "destructive" }))) return;
 *      The opener registry is pure TS (zero React, zero dialog markup),
 *      so importing it costs almost nothing.
 *
 *   2. Render `<ConfirmDialogHost />` once, near the root of every
 *      provider tree (Providers, EntityProviders, PublicProviders) so
 *      the imperative `confirm()` always has a live host to dispatch
 *      to once the page hydrates.
 *
 * Pre-hydration calls queue inside `confirmDialogOpener.ts` and resolve
 * as soon as the host registers. In practice the dynamic chunk loads in
 * tens of milliseconds, well before any user-triggered destructive
 * action could fire.
 */

"use client";

import dynamic from "next/dynamic";

export { confirm } from "./confirmDialogOpener";
export type { ConfirmOptions } from "./confirmDialogOpener";

const ConfirmDialogHostImpl = dynamic(
  () => import("./ConfirmDialogHostImpl"),
  { ssr: false, loading: () => null },
);

export function ConfirmDialogHost() {
  return <ConfirmDialogHostImpl />;
}
