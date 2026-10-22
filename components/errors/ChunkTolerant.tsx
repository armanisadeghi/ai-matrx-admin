"use client";

// components/errors/ChunkTolerant.tsx — A LAZY EXTRA THAT CANNOT ARRIVE MUST NOT TAKE THE PAGE WITH IT.
//
// THE DEFECT THIS EXISTS FOR (AT-FIX-I, 2026-10-19). A phone on /capture/<sheet> loaded online, lost its
// signal, and the first key the person typed opened the dialog-host latch (`DialogHosts`), which asked for
// a chunk that had never been fetched. Offline, `next/dynamic` throws that ChunkLoadError during render;
// nothing between the lazy host and the `(link)` group's `error.tsx` caught it, so the whole capture page
// became "This is taking longer than it should" and the answer the person was typing was never queued.
//
// A host that is only an extra (a dialog nobody has opened) is not worth the page. This boundary swallows
// EXACTLY a chunk-load failure — it says so in the console and renders nothing — and re-throws everything
// else to the real boundary above it, so a genuine bug is never hidden here.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError } from "@ai-matrx/kit/chunk-load-recovery";

interface Props {
  /** Names the extra in the console line, so the log says which chunk did not arrive. */
  what: string;
  children: ReactNode;
}

interface State {
  failed: unknown;
}

export class ChunkTolerant extends Component<Props, State> {
  override state: State = { failed: null };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (!isChunkLoadError(error)) return;
    console.warn(
      `[chunk-tolerant] ${this.props.what} could not load its code (offline or the chunk is gone); the page carries on without it.`,
      error,
      info.componentStack,
    );
  }

  override render(): ReactNode {
    if (this.state.failed === null) return this.props.children;
    // Not a chunk failure: hand it to the boundary above, exactly as if this one were not here.
    if (!isChunkLoadError(this.state.failed)) throw this.state.failed;
    return null;
  }
}
