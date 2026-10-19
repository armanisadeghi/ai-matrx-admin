"use client";

// An app opener whose module loads on its first call (summon's `lazyOpener` over the opener's plain
// `create…Opener(store)` factory). For components that sit in every route's boot — header buttons,
// hotkeys, hosts, the sidebar — so the opener module stays out of first load (builder-G
// 2026-10-18). Same signature as the opener; the handle is a stand-in until the chunk arrives
// (`close`/`update` replay, `callbackGroupId` reads through once loaded).
//
// The store comes from the react-redux context, read without a redux hook: a component under a
// partial `@/lib/redux/hooks` mock still gets its opener. With no store above it, opening throws
// loudly at the call (never a silent no-op).
import { useContext, useMemo } from "react";
import { ReactReduxContext } from "react-redux";
import { lazyOpener, type LazyOpenerOptions } from "@ai-matrx/summon/open";
import type { AppDispatch } from "@/lib/redux/store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any opener signature
type AnyOpener = (...args: any[]) => any;

type OpenerStore = { dispatch: AppDispatch };

function noStore(overlayId: string): OpenerStore {
  return {
    dispatch: (() => {
      throw new Error(`[overlays] "${overlayId}" was opened with no redux store above the component`);
    }) as unknown as AppDispatch,
  };
}

export function useLazyAppOpener<F extends AnyOpener>(
  overlayId: string,
  load: () => Promise<(store: OpenerStore) => F>,
  options?: LazyOpenerOptions<Parameters<F>>,
): F {
  const store = (useContext(ReactReduxContext)?.store as OpenerStore | undefined) ?? null;
  // `load`/`options` are inline literals at every call site; the opener is built once per store.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => lazyOpener<F>(overlayId, () => load().then((create) => create(store ?? noStore(overlayId))), options), [store, overlayId]);
}
