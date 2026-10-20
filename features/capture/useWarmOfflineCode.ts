"use client";

// features/capture/useWarmOfflineCode.ts — A CAPTURE PAGE FETCHES ALL OF ITS CODE WHILE IT STILL HAS A SIGNAL.
//
// A crew member opens /capture/<sheet> at the gate with a signal and then walks into a basement. Every chunk
// the page might ask for later must already be on the phone, because offline there is nobody to ask. The shell's
// dialog hosts are the one lazy body the page reaches by merely typing (`DialogHosts` opens on the first
// pointer/key); left lazy, that first key fetched a chunk that could not arrive (AT-FIX-I, 2026-10-19).
// Opening the latch on mount fetches it NOW, online. `ChunkTolerant` is the second layer for any other
// extra that still cannot arrive.

import { useEffect } from "react";
import { requestDialogHosts } from "@/components/dialogs/host/dialogHostsLatch";

export function useWarmOfflineCode(): void {
  useEffect(() => {
    requestDialogHosts();
  }, []);
}
