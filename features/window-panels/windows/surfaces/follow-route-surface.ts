"use client";

/**
 * The "This page" window follows the route (surface declarations review B5, 2026-10-22).
 *
 * The window is a singleton that stays open across navigation
 * (`closesOnNavigation: false`), and it was opened with the surface of the page it was opened
 * on. After moving from /hr/settings/employer to a brand page it kept reading
 * `AI Matrx › Human Resources › HR Employer` and "No runtime" — the previous page's chain and
 * values. Now: until the route changes it shows the surface it was opened for (which may be a
 * window or dialog over the page); once the route changes it shows the surface the person is
 * looking at, from the same hook the header Agents menu uses (`useActivePageSurface`).
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useActivePageSurface } from "@ai-matrx/chat/surfaces/runtime/useActivePageSurface";

export function windowSurfaceName(input: {
  openedSurface: string;
  openedPath: string | null;
  currentPath: string | null;
  activeSurface: string | null;
}): string {
  const navigated = input.openedPath !== input.currentPath;
  if ((navigated || !input.openedSurface) && input.activeSurface) return input.activeSurface;
  return input.openedSurface;
}

export function useWindowSurfaceFollowsRoute(openedSurface: string): string {
  const pathname = usePathname();
  const [openedPath] = useState(pathname);
  const { surfaceName: activeSurface } = useActivePageSurface();
  return windowSurfaceName({ openedSurface, openedPath, currentPath: pathname, activeSurface });
}
