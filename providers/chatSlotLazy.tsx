"use client";

// providers/chatSlotLazy.tsx
//
// THE ONE FRONT DOOR for chat host slots whose implementation loads on first use.
//
// The three chat registration files (chatUiRegistrationBase, chatUiRegistration,
// chatAppDataRegistration) are reached from the root <Providers> through ChatHostAdapter, so
// every module they import statically ships in the first load of EVERY route — the records-ui /
// data-table / canvas cluster rode in that way (2026-10-13, "every page drags ~18 MB"). Each
// registration file now keeps its registration SYNCHRONOUS (registries are not reactive) and
// points its lazily-loaded component slots at ONE implementation module through ONE `import()`
// (THE FRAGMENTATION LAW: one async edge per registry, never N sibling dynamic()s). The
// per-slot `clientLazy` wrappers below share that edge: N fields, one chunk.
//
// What stays static in those files (never through here): anything that renders in SSR or on
// the first paint of /chat/new and the (core) shell, the composer, and wrapper slots whose
// `children` would vanish behind a loading state — see each file's STATIC list.
//
// Every lazy slot names a loading FOOTPRINT. A slot that draws nothing until it is opened or
// until it has something to say (dialogs, openers, nudges) loads behind `null`; a visible slot
// draws a pulsing placeholder the size of what is coming, so nothing jumps when it lands.

import type { ComponentType } from "react";
import { clientLazy } from "@ai-matrx/kit/client-lazy";
import { Skeleton } from "@ai-matrx/design-system";

const PULSE = "matrx-pulse rounded-md bg-primary/10";

/** A 28px control glyph (a tap button, a menu trigger). Inline-safe (a span). */
export function SlotLoadingGlyph() {
  return <span aria-busy="true" aria-label="Loading" className={`${PULSE} inline-block size-7 shrink-0 rounded-full align-middle`} />;
}

/** A 16px glyph (an info dot, a connector mark). Inline-safe. */
export function SlotLoadingGlyphSmall() {
  return <span aria-busy="true" aria-label="Loading" className={`${PULSE} inline-block size-4 shrink-0 rounded-full align-middle`} />;
}

/** A word or chip of text inside a line. Inline-safe. */
export function SlotLoadingInline() {
  return <span aria-busy="true" aria-label="Loading" className={`${PULSE} inline-block h-3.5 w-16 align-middle`} />;
}

/** A 28px capsule where a select or chooser will be. */
export function SlotLoadingControl() {
  return <Skeleton aria-busy="true" aria-label="Loading" shape="control" width="md" />;
}

/** A line of body text. */
export function SlotLoadingLine() {
  return <Skeleton aria-busy="true" aria-label="Loading" shape="line" width="2/3" />;
}

/** A small region (a card, a value view). */
export function SlotLoadingBlock() {
  return <Skeleton aria-busy="true" aria-label="Loading" shape="block" height="sm" />;
}

/** A large region (an editor, a terminal, a snapshot). */
export function SlotLoadingPanel() {
  return <Skeleton aria-busy="true" aria-label="Loading" shape="block" height="lg" />;
}

/**
 * Bind one implementation loader to a typed slot factory. `load` is the registration file's ONE
 * `import()` of its implementation module; every slot built from the returned factory resolves
 * its component from that same module, so the build sees one async edge for the whole registry.
 */
export function lazySlotsFrom<M extends object>(load: () => Promise<M>) {
  return function lazySlot<K extends keyof M>(name: K, loading?: ComponentType): M[K] {
    const Slot = clientLazy(
      () => load().then((m) => m[name] as unknown as ComponentType<object>),
      loading ? { loading } : {},
    );
    // The slot's props are the implementation's own (the package call sites pass them unchanged).
    return Slot as unknown as M[K];
  };
}
