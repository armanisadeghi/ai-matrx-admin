"use client";

import { useContext, useSyncExternalStore } from "react";
import { ReactReduxContext } from "react-redux";

import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import type { RootState } from "@/lib/redux/store";

/**
 * True only for an admin with the admin debug mode switched on (the same pair the canvas debug panel and the
 * integrations rows use). The one gate for anything a member must never see: raw data, internal detail.
 * Outside a store (a shared view mounted bare) it is false: no store, no admin.
 */
export function useAdminDebugView(): boolean {
  const store = useContext(ReactReduxContext)?.store;
  const read = () => {
    if (!store) return false;
    const state = store.getState() as RootState;
    return selectIsAdminDebugger(state) && selectIsDebugMode(state);
  };
  return useSyncExternalStore(store ? store.subscribe : () => () => {}, read, () => false);
}
