// features/hr/shared/useHrNav.ts
//
// THE HR MODULE LIST FOR THE PERSON ON SCREEN — `resolveHrNav` over the one HR context. Every HR
// menu reads it: HrShell's header switcher (classic) and the frame sidebar's HR menu
// (HrFrameMenu), so the two can never list different modules.

"use client";

import { resolveHrNav, type HrNavResolution } from "./hr-nav";
import { useHrContext } from "./useHrContext";
import { useHrPersona } from "./useHrPersona";

export function useHrNav(): { nav: HrNavResolution; showNav: boolean } {
  const { active, orgRef, scope } = useHrContext();
  const { persona, employmentId, all } = useHrPersona();
  const nav = resolveHrNav({
    persona,
    capabilities: all,
    employmentId,
    org: orgRef,
    /*
      The whole payload, once. Every per-person rule — the worker class, and the
      §2.8 override enrolment that is leave's designed per-person exception
      (hr_l5_30) — is derived from this INSIDE the resolver, so the callers
      cannot disagree about which rules they applied.
    */
    active,
  });
  // With no employer open there is nothing to navigate within, and a persona-less nav would
  // differ from the same route once one is chosen.
  const showNav = Boolean(active || scope.actives.length > 0) && nav.items.length > 0;
  return { nav, showNav };
}
