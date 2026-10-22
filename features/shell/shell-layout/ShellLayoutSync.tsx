"use client";

// ShellLayoutSync — the shell layout's one client island (custom-experience §5.3). Renders nothing.
//
//   1. A seed that missed the first-byte deadline streams in (`BootSeedScript`): once hydrated, this
//      installs it (`drainBootSeeds` → `shellLayoutLoaded`), so a reserved nav column fills in the moment
//      the answer is in the page instead of waiting for the sync engine's own fetch.
//   2. The organization layout follows the tab's active organization after boot (the server could only
//      predict it).
//   5. The Look: the server stamped `data-shell-look` on `.shell-root` for the first frame; a save, the
//      editor's live preview or the Standard view switch changes it here, in place (no reload).
//   7. The Dock: a body that carries its own Dock shows the phone dock (`data-show-dock` on `.shell-root`,
//      stamped by the server for the first frame); a save, preview or reset turns it on or off in place.
//   6. The accent: the server stamped the design system's `data-matrx-accent` + tokens on `.shell-root`;
//      changes land here in place, and the same stamp is mirrored onto <html> so portaled menus,
//      dialogs and toasts (outside `.shell-root`) wear it too. Portals only open after hydration, so the
//      mirror never races the first frame.
//   3. The `matrx_shell` cookie mirrors "a custom layout is held" so the next server render can reserve
//      the nav column if its seed is late; cleared when nothing is held.
// Only where the (core) layout seeded the slice (`enabled`); everywhere else it does nothing.

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/rootReducer";
import { drainBootSeeds } from "@/lib/boot/bootSeedSlot";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import { SHELL_CUSTOM_COOKIE, SHELL_VIEW_COOKIE } from "./contract";
import { holdsShellLayout, initialShellLayoutState, shellLayoutOrganizationChanged, shellPersonAllowedChanged } from "./shellLayoutSlice";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { SHELL_MEMBERS_MAY_CUSTOMIZE_KNOB } from "./knob";
import { selectShellAccent, selectShellCustomDock, selectShellLook } from "./useResolvedShellLayout";
import { ACCENT_ATTRIBUTE, ACCENT_PROPERTIES, accentAttributes } from "@ai-matrx/design-system/accents";
import type { ShellAccentRef } from "./contract";

const ACCENT_PROPERTY_NAMES = [...Object.values(ACCENT_PROPERTIES.light), ...Object.values(ACCENT_PROPERTIES.dark)];

/** Puts one accent's stamp on an element (or takes it off), touching only the accent's own attribute and properties. */
export function applyShellAccent(element: HTMLElement, accent: ShellAccentRef | null): void {
  const { style, ...attrs } = accentAttributes(accent);
  const value = attrs[ACCENT_ATTRIBUTE];
  if (!value || !style) {
    element.removeAttribute(ACCENT_ATTRIBUTE);
    for (const name of ACCENT_PROPERTY_NAMES) element.style.removeProperty(name);
    return;
  }
  for (const [name, v] of Object.entries(style)) if (element.style.getPropertyValue(name) !== v) element.style.setProperty(name, v);
  if (element.getAttribute(ACCENT_ATTRIBUTE) !== value) element.setAttribute(ACCENT_ATTRIBUTE, value);
}

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

  // 4. The organization's lock (`shell.members_may_customize`): read only when it can matter — the person
  //    has her own layout AND the applied organization has one — from the knob snapshot every page holds.
  const userId = useAppSelector(selectUserId);
  const contested = enabled && held.person !== null && held.organizationId !== null && held.organizations[held.organizationId] !== undefined;
  const allowedKnob = useEffectiveKnob(held.organizationId, userId, SHELL_MEMBERS_MAY_CUSTOMIZE_KNOB, undefined, { enabled: contested });
  const personAllowed = contested && allowedKnob !== undefined ? allowedKnob !== false : null;
  useEffect(() => {
    if (personAllowed !== null && personAllowed !== held.personAllowed) dispatch(shellPersonAllowedChanged(personAllowed));
  }, [dispatch, personAllowed, held.personAllowed]);

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

  const look = useAppSelector(selectShellLook);
  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector<HTMLElement>(".shell-root");
    if (!root) return;
    if (look && root.dataset.shellLook !== look) root.dataset.shellLook = look;
    if (!look && root.dataset.shellLook !== undefined) delete root.dataset.shellLook;
  }, [enabled, look]);

  const customDock = useAppSelector(selectShellCustomDock);
  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector<HTMLElement>(".shell-root");
    if (!root) return;
    if (customDock && root.dataset.showDock === undefined) root.dataset.showDock = "";
    if (!customDock && root.dataset.showDock !== undefined) delete root.dataset.showDock;
  }, [enabled, customDock]);

  const accent = useAppSelector(selectShellAccent);
  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector<HTMLElement>(".shell-root");
    if (root) applyShellAccent(root, accent);
    applyShellAccent(document.documentElement, accent);
    return () => applyShellAccent(document.documentElement, null);
  }, [enabled, accent]);

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
