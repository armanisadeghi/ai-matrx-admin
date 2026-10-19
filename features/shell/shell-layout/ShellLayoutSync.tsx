"use client";

// ShellLayoutSync — the shell layout's one client island (custom-experience §5.3). Renders nothing.
//
//   1. A seed that missed the first-byte deadline streams in (`BootSeedScript`): once hydrated, this
//      installs it (`drainBootSeeds` → `shellLayoutLoaded`), so a reserved nav column fills in the moment
//      the answer is in the page instead of waiting for the sync engine's own fetch.
//   2. The organization layout follows the tab's active organization after boot (the server could only
//      predict it).
//   3. The `matrx_shell` cookie mirrors "a custom layout is held" so the next server render can reserve
//      the nav column if its seed is late; cleared when nothing is held.
// Only where the (core) layout seeded the slice (`enabled`); everywhere else it does nothing.

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/rootReducer";
import { drainBootSeeds } from "@/lib/boot/bootSeedSlot";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import { SHELL_CUSTOM_COOKIE, SHELL_VIEW_COOKIE } from "./contract";
import { holdsShellLayout, initialShellLayoutState, shellLayoutOrganizationChanged } from "./shellLayoutSlice";

/** The streamed seed's own deadline (`CORE_SEED_STREAM_DEADLINE_MS`) plus a margin. */
const STREAMED_SEED_WAIT_MS = 5_000;
const STREAMED_SEED_POLL_MS = 150;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const selectSlice = (state: RootState) => state.shellLayout ?? initialShellLayoutState;

export default function ShellLayoutSync() {
  const dispatch = useAppDispatch();
  const held = useAppSelector(selectSlice);
  // org-filter: default-for-new the organization whose saved layout the shell draws, not a list read
  const activeOrganizationId = useAppSelector(selectActiveOrganizationId);
  const enabled = held.enabled;
  const unknown = held.status === "unknown";

  useEffect(() => {
    if (!enabled || !unknown) return;
    const started = Date.now();
    drainBootSeeds();
    const timer = setInterval(() => {
      drainBootSeeds();
      if (Date.now() - started > STREAMED_SEED_WAIT_MS) clearInterval(timer);
    }, STREAMED_SEED_POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, unknown]);

  useEffect(() => {
    if (enabled && activeOrganizationId && activeOrganizationId !== held.organizationId) {
      dispatch(shellLayoutOrganizationChanged(activeOrganizationId));
    }
  }, [dispatch, enabled, activeOrganizationId, held.organizationId]);

  const holds = enabled && held.status === "ready" ? holdsShellLayout(held) : null;
  useEffect(() => {
    if (holds === null) return;
    const present = document.cookie.split("; ").some((c) => c === `${SHELL_CUSTOM_COOKIE}=1`);
    if (holds && !present) document.cookie = `${SHELL_CUSTOM_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    if (!holds && present) document.cookie = `${SHELL_CUSTOM_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, [holds]);

  // Another tab flipped Standard view (broadcast): this tab's cookie follows the store.
  const standardView = enabled ? held.standardView : null;
  useEffect(() => {
    if (standardView === null) return;
    const present = document.cookie.split("; ").some((c) => c === `${SHELL_VIEW_COOKIE}=standard`);
    if (standardView !== present) setShellStandardViewCookie(standardView);
  }, [standardView]);

  return null;
}

/**
 * THE STANDARD VIEW switch (custom-experience §1.4): one press shows the built-in default everywhere,
 * at once (the slice re-renders the shell; other tabs follow by broadcast), and the cookie makes the
 * next server render default too. Pressing again brings the saved layout back. Nothing is deleted.
 */
export function setShellStandardViewCookie(on: boolean): void {
  document.cookie = on
    ? `${SHELL_VIEW_COOKIE}=standard; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
    : `${SHELL_VIEW_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
