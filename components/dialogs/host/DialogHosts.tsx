"use client";

// components/dialogs/host/DialogHosts.tsx — THE ONE mount for the app's imperative dialog hosts.
//
// Method C (code-splitting skill): the hosts below always load together and are all opened
// by the same kind of action — a person pressing something — so they share ONE `ssr:false`
// edge instead of one edge each, and that edge is behind the engagement latch
// (`dialogHostsLatch.ts`): nothing loads at first paint. Before 2026-10-16 each host was its
// own unconditional `dynamic()` in app/Providers.tsx, so eight chunks fetched on every page
// load for dialogs nobody had opened.
//
// The imperative APIs (`openFilePicker`, `requestUpload`, `showManualCopy`, `openSandboxGate`,
// `promptForValues`, `pickHome`, `shareWithPeople`, `promptScopeMismatch`,
// `ensureRemovable`, `openConversationRename`) stay static in their own opener modules.
// Queue-backed openers (`@ai-matrx/kit/opener`) hold a request until the body registers and
// request the latch themselves (package-backed ones via `requestHostsOnOpen.ts`);
// the two that do not queue (file pickers, upload guard) await `ensureDialogHosts()`.

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";
import {
  isDialogHostsRequested,
  requestDialogHosts,
  subscribeDialogHosts,
} from "./dialogHostsLatch";
import "./requestHostsOnOpen";

const DialogHostsImpl = dynamic(() => import("./DialogHostsImpl"), {
  ssr: false,
  loading: () => null,
});

const ENGAGEMENT_EVENTS = ["pointerdown", "keydown", "touchstart", "dragenter", "paste"] as const;

const serverSnapshot = () => false;

export function DialogHosts() {
  const requested = useSyncExternalStore(subscribeDialogHosts, isDialogHostsRequested, serverSnapshot);

  useEffect(() => {
    if (requested) return undefined;
    const engage = () => requestDialogHosts();
    const opts: AddEventListenerOptions = { capture: true, passive: true, once: true };
    for (const name of ENGAGEMENT_EVENTS) window.addEventListener(name, engage, opts);
    return () => {
      for (const name of ENGAGEMENT_EVENTS) window.removeEventListener(name, engage, opts);
    };
  }, [requested]);

  if (!requested) return null;
  return <DialogHostsImpl />;
}
