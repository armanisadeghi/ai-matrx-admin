"use client";

/**
 * THE app opener: every `<id>.overlay.tsx` declares its opener through this one call on summon's
 * `createOpener` (`@ai-matrx/summon/opener`). It keeps the app's caller contract — `useOpenX()`
 * returns `(options) => handle`, `<XController {...options} />` opens on mount — while summon owns
 * the open/close actions, the instance-id mint, the Controller and the handle.
 *
 * `useOpen` dispatches through the app store hook (works in every tree that has the app store,
 * the lab roots included); `Controller` is summon's own (needs the summon root, `AppSummonProvider`).
 * `check:overlays` (`__tests__/openersUseCreateOpener.test.ts`) fails on a hand-written opener,
 * a hand-copied instance-id mint, or a `multi` flag that disagrees with the definition.
 */

import { createElement, useCallback, useEffect, useRef } from "react";
import { createOpener, type OpenedOverlay, type Opener } from "@ai-matrx/summon/opener";
import { useAppDispatch } from "@/lib/redux/hooks";

type Dispatch = Parameters<Opener<object>["open"]>[0];

export interface AppOpenerSpec<Options> {
  /** Multi-instance: an open without an instance id gets a fresh one (summon mints it). */
  readonly multi?: boolean;
  /** The instance id for one open. Default: `options.instanceId` (then summon's rule). */
  readonly instanceId?: (options: Options) => string | undefined;
  /** The open data. Default: the options without `instanceId`. */
  readonly data?: (options: Options) => object;
}

export interface AppOpener<Options> {
  readonly id: string;
  readonly opener: Opener<object>;
  /** Open with a dispatch in hand (thunks, ports, non-React code). */
  open(dispatch: Dispatch, options?: Options): OpenedOverlay;
  /** `const open = useOpenX(); open(options)` → handle. */
  useOpen(): (options?: Options) => OpenedOverlay;
  /** `createXOpener(store)` → `(options) => handle` (the lazy chat opener specs call these). */
  forStore(store: { dispatch: Dispatch }): (options?: Options) => OpenedOverlay;
  /** Opens on mount, closes on unmount, re-opens when its serialisable props change. */
  readonly Controller: (props: Options) => null;
}

function withoutInstanceId(options: unknown): object {
  if (typeof options !== "object" || options === null) return {};
  if (!("instanceId" in options)) return options;
  const { instanceId: _omit, ...rest } = options as { instanceId?: unknown };
  return rest;
}

export function appOpener<Options = Record<string, never>>(
  id: string,
  spec: AppOpenerSpec<Options> = {},
): AppOpener<Options> {
  const opener = createOpener<object>(id, { multi: spec.multi === true });
  const toOpen = (options: Options) => ({
    instanceId: spec.instanceId
      ? spec.instanceId(options)
      : typeof options === "object" && options !== null
        ? ((options as { instanceId?: string }).instanceId ?? undefined)
        : undefined,
    data: spec.data ? spec.data(options) : withoutInstanceId(options),
  });
  const open = (dispatch: Dispatch, options: Options = {} as Options) =>
    opener.open(dispatch, toOpen(options));

  function useOpen() {
    const dispatch = useAppDispatch() as Dispatch;
    // The React Compiler compiles only top-level components and hooks, never one built inside a
    // factory: the stable identity callers put in effect deps comes from this useCallback.
    return useCallback((options?: Options) => open(dispatch, options), [dispatch]);
  }

  function Controller(props: Options): null {
    const { instanceId, data } = toOpen(props);
    return createElement(opener.Controller, { ...data, instanceId }) as unknown as null;
  }
  if (process.env.NODE_ENV !== "production") Controller.displayName = `${id}AppController`;

  return {
    id,
    opener,
    open,
    useOpen,
    forStore: (store) => (options) => open(store.dispatch, options),
    Controller,
  };
}

function propsSignature(props: unknown): string {
  try {
    return JSON.stringify(props, (_key, value) => (typeof value === "function" ? undefined : value));
  } catch {
    return String(Date.now());
  }
}

/**
 * The open-on-mount Controller for an opener whose open logic is its own (callback groups, thunks,
 * computed ids): opens through `useOpen()` on mount, closes on unmount, re-opens when the serialisable
 * props change (functions never reopen). Openers built by `appOpener` use summon's Controller instead;
 * this is the one Controller for the rest, so no opener hand-writes the effect.
 */
export function hookController<Props, OpenArg = Props>(
  useOpen: () => ((options: OpenArg) => { close(): void }) | null,
  toOptions?: (props: Props) => OpenArg,
): (props: Props) => null {
  return function OpenerController(props: Props): null {
    const open = useOpen();
    const latest = useRef(props);
    latest.current = props;
    const signature = propsSignature(props);
    useEffect(() => {
      if (!open) return undefined;
      const current = latest.current;
      const handle = open(toOptions ? toOptions(current) : (current as unknown as OpenArg));
      return () => handle.close();
    }, [open, signature]);
    return null;
  };
}
