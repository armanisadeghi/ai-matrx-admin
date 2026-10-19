"use client";

import { createContext, useContext, useEffect, type ComponentType } from "react";

/**
 * THE public layout's two tiers (PUBLIC-LAYOUT-PERF, 2026-10-19).
 *
 * LIGHT: a signed-out visitor on a marketing page gets the page, the header, the footer and One
 * Tap — no Redux store, no app hosts. FULL: the whole app `Providers` tree, the canvas column and
 * the Redux header islands, loaded through ONE import() (PublicFullProvidersImpl). A signed-in
 * visitor, every route not on the light list, and any light page that asks (`requestFull`: the
 * canvas toggle, a live template preview) get FULL. Once full, a tab stays full.
 */
export interface PublicTier {
  full: boolean;
  /** Load the full tree in place (the light page keeps showing until it is ready). */
  requestFull: (options?: { openCanvas?: boolean }) => void;
  /** The Redux header islands, supplied by the full tree; null while light. */
  FullIslands: ComponentType | null;
}

const ALWAYS_FULL: PublicTier = { full: true, requestFull: () => {}, FullIslands: null };

export const PublicTierContext = createContext<PublicTier>(ALWAYS_FULL);

/** Outside the public layout the app tree is always there: full. */
export function usePublicTier(): PublicTier {
  return useContext(PublicTierContext);
}

/**
 * Marketing and gallery pages whose OWN code needs nothing from the app Providers for a guest.
 * Adding a prefix means: the page renders with no store, no canvas host, no react-query client.
 * Anything that needs them on interaction calls `useFullPublicTierWhen`.
 */
const LIGHT_PREFIXES = [
  "/privacy-policy",
  "/terms-and-conditions",
  "/terms-of-service",
  "/templates",
  "/pricing",
  "/contact",
  "/how-it-works",
  "/how-we-prove-it",
  "/why-ai-matrx",
  "/the-landscape",
  "/compare",
  "/desktop",
  "/download",
  "/extend",
  "/request-access",
];
/** Under a light prefix but heavy at first paint (the applet intro mounts the install door). */
const FULL_EXCEPTIONS = ["/templates/applets"];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function isLightPublicPath(pathname: string): boolean {
  if (FULL_EXCEPTIONS.some((p) => under(pathname, p))) return false;
  return LIGHT_PREFIXES.some((p) => under(pathname, p));
}

/**
 * For a light page's on-demand island that needs the app tree (a live preview): once `wanted`,
 * ask for the full tier, and answer true only when it is there.
 */
export function useFullPublicTierWhen(wanted: boolean): boolean {
  const tier = usePublicTier();
  useEffect(() => {
    if (wanted && !tier.full) tier.requestFull();
  }, [wanted, tier]);
  return tier.full;
}
