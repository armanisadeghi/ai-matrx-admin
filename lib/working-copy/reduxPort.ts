/**
 * lib/working-copy/reduxPort.ts — the app's `WorkingCopyStorePort`: where the
 * primitive in `@ai-matrx/kit/working-copy` keeps its copies, which is Redux
 * (`workingCopies`, `./workingCopySlice.ts`).
 *
 * `defineWorkingCopyKind` here is the kit's, with the port filled in; every
 * kind in the app (notes, files, documents) is defined through it, and `store`
 * everywhere (`attach(id, store)`, `source`, `save`) is the Redux store a view
 * renders from.
 */

import {
  defineWorkingCopyKind as defineKitWorkingCopyKind,
  type WorkingCopyKind as KitWorkingCopyKind,
  type WorkingCopyKindConfig as KitWorkingCopyKindConfig,
  type WorkingCopySaveArgs as KitWorkingCopySaveArgs,
  type WorkingCopyStorePort,
} from "@ai-matrx/kit/working-copy";
import { getWorkingCopy, workingCopyApplied, type WithWorkingCopies } from "./workingCopySlice";

/** The store a view renders from (`useAppStore()`); structural so this stays a leaf. */
export interface WorkingCopyStoreLike {
  dispatch: (action: { type: string; payload?: unknown }) => unknown;
  getState: () => unknown;
}

const ports = new WeakMap<object, WorkingCopyStorePort>();

/** The Redux-backed port for a store (one per store). */
export function reduxWorkingCopyPort(store: WorkingCopyStoreLike): WorkingCopyStorePort {
  let port = ports.get(store);
  if (!port) {
    port = {
      read: (key) => getWorkingCopy(store.getState() as WithWorkingCopies, key),
      apply: (action) => {
        store.dispatch(workingCopyApplied(action));
      },
    };
    ports.set(store, port);
  }
  return port;
}

export type WorkingCopyKind<E> = KitWorkingCopyKind<E, WorkingCopyStoreLike>;
export type WorkingCopyKindConfig<E> = Omit<KitWorkingCopyKindConfig<E, WorkingCopyStoreLike>, "port">;
export type WorkingCopySaveArgs<E> = KitWorkingCopySaveArgs<E, WorkingCopyStoreLike>;

export function defineWorkingCopyKind<E = never>(config: WorkingCopyKindConfig<E>): WorkingCopyKind<E> {
  return defineKitWorkingCopyKind<E, WorkingCopyStoreLike>({ ...config, port: reduxWorkingCopyPort });
}
