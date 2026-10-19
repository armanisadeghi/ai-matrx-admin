"use client";

import { useContext, useSyncExternalStore } from "react";
import { ReactReduxContext } from "react-redux";

import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { SignedInHintContext } from "@/lib/scoped-config/signedInHint";
import type { RootState } from "@/lib/redux/store";

/**
 * Whether a signed-in person exists, read from the app store when one is
 * mounted (a bare test harness has none and counts as signed in). A
 * signed-out surface never calls `knob_index` — it needs a caller — so it gets
 * no knobs and no error; its consumers keep their own defaults. A storeless host that knows the
 * answer (the light public layout: a guest has no store) says so through `SignedInHintContext`,
 * and that answer wins over "no store counts as signed in".
 */
export function useSignedIn(): boolean {
  const redux = useContext(ReactReduxContext);
  const store = redux?.store;
  const hint = useContext(SignedInHintContext);
  return useSyncExternalStore(
    (listener) => (store ? store.subscribe(listener) : () => {}),
    () => {
      if (!store) return hint ?? true;
      const state = store.getState() as RootState;
      // A store with no identity slice at all is a bare harness (or a host that mounts a
      // slimmer store): the same "counts as signed in" as having no store.
      if (!state?.userAuth) return true;
      return Boolean(selectUserId(state));
    },
    // Server / hydration pass: NOT signed in until the client store says so,
    // or the first commit's effects would ask a door that answers 42501 to anon.
    () => (store ? false : (hint ?? true)),
  );
}
