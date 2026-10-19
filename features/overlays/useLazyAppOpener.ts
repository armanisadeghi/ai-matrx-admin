"use client";

// An app opener whose module loads on its first call (summon's `lazyOpener` over the opener's plain
// `create…Opener(store)` factory). For components that sit in every route's boot — header buttons,
// hotkeys, hosts, the sidebar — so the opener module stays out of first load (builder-G
// 2026-10-18). Same signature as the opener; the handle is a stand-in until the chunk arrives
// (`close`/`update` replay, `callbackGroupId` reads through once loaded).
import { useMemo } from "react";
import { lazyOpener, type LazyOpenerOptions } from "@ai-matrx/summon/open";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any opener signature
type AnyOpener = (...args: any[]) => any;

export function useLazyAppOpener<F extends AnyOpener>(
  overlayId: string,
  load: () => Promise<(store: AppStore) => F>,
  options?: LazyOpenerOptions<Parameters<F>>,
): F {
  const store = useAppStore();
  // `load`/`options` are inline literals at every call site; the opener is built once per store.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => lazyOpener<F>(overlayId, () => load().then((create) => create(store)), options), [store, overlayId]);
}
