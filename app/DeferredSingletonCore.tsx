"use client";

// DeferredSingletonCore — the COMPLETE body of the deferred-singleton tree.
//
// This module is loaded ONLY through `app/DeferredSingletonWrapper.tsx`
// (client-side, post-mount, post-idle, via `next/dynamic`). Because the
// wrapper is the sole gate, this file follows the opposite rule of the
// old `DeferredSingletons.tsx`:
//   - EVERY import here is static — no `next/dynamic`, no `await import()`.
//   - EVERY singleton renders directly and unconditionally.
// Do not add a dynamic import or a render gate here; if something must be
// deferred further, that logic belongs in the wrapper (or the widget's own
// file), never in this core.

import { Suspense, useEffect, useRef } from "react";
import { useWarmup } from "@ai-matrx/agents/react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import AuthSessionWatcher from "@/components/layout/AuthSessionWatcher";
import PersonTimeZoneCapture from "@/components/layout/PersonTimeZoneCapture";
import VendorNameRuntimeGuard from "@/components/dev/VendorNameRuntimeGuard";
import { LinkOrganizationWatcher } from "@/features/organizations/components/LinkOrganizationWatcher";
import AnnouncementProvider from "@/components/layout/AnnouncementProvider";
import AdminFeatureProvider from "@/features/admin/AdminFeatureProvider";
import KgNewSuggestionNotifier from "@/features/kg-suggestions/components/KgNewSuggestionNotifier";
import AssistsDock from "@/features/assists/components/AssistsDock";
import CloudBrowserHandoffDeepLink from "@/features/cloud-browser/components/CloudBrowserHandoffDeepLink";
import CloudComputerDeepLink from "@/features/cloud-computer/CloudComputerDeepLink";
import { TutorialHost } from "@/features/guided-tutorials/TutorialHost";
import LiveCaptureIndicator from "@/features/media-capture/components/LiveCaptureIndicator";
import NeedsYouAssistProducer from "@/features/capture-ladder/NeedsYouAssistProducer";
import AiTestModeDock from "@/features/ai-test-mode/AiTestModeDock";
import SupportSessionPill from "@/features/admin/users/support-sessions/SupportSessionPill";
import { FirstSignInAgeGateMount } from "@/features/education/compliance/FirstSignInAgeGateMount";
import { MeetMatrxIntroMount } from "@/features/onboarding/meet-matrx/MeetMatrxIntroMount";
import { registerBlobCacheOnFirstFileFetch } from "@/features/files/cache/registerOnFirstFileFetch";
// Side effect: hands the files UI its right-click / context / error-copy menus (files-ui-host slots).
// Lives here, behind the deferred edge, so the menus stay out of every route's graph.
import "@/features/files/files-ui-pieces";
import { resolveBaseUrl } from "@/lib/python-client";
import { useHasEngaged } from "@/lib/boot/firstEngagement";
import { forgetEntitlementSnapshot } from "@/features/entitlements/service";
import { UsageGateBridge } from "@/features/entitlements/usage-gate/UsageGateBridge";
import {
  setEntitlementsLoading,
  clearEntitlements,
} from "@/features/entitlements/state/entitlementsSlice";
import { OverlayServices } from "@/features/overlays/host/OverlayServices";
import { KindLeakSentinel } from "@/features/content-ir/surfaces/KindLeakSentinel";
import { SurfaceRowGuard } from "@/features/surfaces/dev/SurfaceRowGuard";


export default function DeferredSingletonCore() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const organizationId = useAppSelector(selectOrganizationId);

  // WARM-UP (contract: common-docs systems/architecture/warm-cache/CONTRACT.md).
  // Session ready (signed in + an active org) → warm the person's core data;
  // the active org changing for the SAME person → re-warm core + that org.
  // A rehydrate that re-dispatches the same id never changes `organizationId`,
  // so it never re-warms (the same before/after rule as
  // features/mandates/redux/org-switch-cache-middleware.ts). The primitive
  // dedupes per person+org for 60s and is silent when the server says no.
  // ENGAGEMENT, NOT IDLE (owner rule, 2026-10-16): the first warm waits for the page's first real
  // engagement (pointer/key press or composer focus — lib/boot/firstEngagement.ts), once per page
  // load; an org change after that re-warms.
  const engaged = useHasEngaged();
  const warmup = useWarmup();
  const warmedFor = useRef<{ userId: string; organizationId: string } | null>(
    null,
  );
  useEffect(() => {
    if (!engaged || !warmup || !user?.id || !organizationId) return;
    const before = warmedFor.current;
    if (before?.userId === user.id && before.organizationId === organizationId)
      return;
    warmedFor.current = { userId: user.id, organizationId };
    performance.mark("load:lazy:warm-up"); // LOAD MARKER (lazy) — page-load trace, no import
    if (before?.userId === user.id) {
      warmup.warm(
        [{ key: "core" }, { key: "org", id: organizationId }],
        "org_change",
      );
    } else {
      warmup.warm([{ key: "core" }], "session");
    }
  }, [engaged, warmup, user?.id, organizationId]);

  // NOTE: global error capture + persistence install live in the WRAPPER
  // (DeferredSingletonWrapper.tsx), not here — they must be running during
  // the boot window, before this deferred core has loaded.

  // The scope tree is NOT loaded here: it loads on its first read anywhere
  // (features/scopes/redux/scopeTreeDemand.ts — the store-level demand), never at idle.

  // The blob-cache Service Worker — Layer 2½ of the 3-tier byte cache — registers on the page's
  // FIRST cloud-file byte fetch, never at idle (features/files/cache/registerOnFirstFileFetch.ts).
  // Disabled by default in dev (localStorage.matrx_dev_sw=1 opts in); see
  // features/files/cache/service-worker/src/sw.ts for the SW body.
  useEffect(() => {
    if (!user?.id) return;
    let backendUrl: string;
    try {
      backendUrl = resolveBaseUrl();
    } catch {
      // No backend URL configured (rare boot order) — the in-memory + IDB tiers still work.
      return;
    }
    return registerBlobCacheOnFirstFileFetch({ backendUrl, userId: user.id });
  }, [user?.id]);

  // Entitlement state is DEMAND-DRIVEN: nothing reads `billing.entitlement_snapshot` at boot. The
  // first mounted consumer (useEntitlement / EducationPricing → useEnsureEntitlementSnapshot)
  // triggers the shared read. This effect only keeps the slice honest: sign-out clears it, and a
  // switch of organization (a tier belongs to an organization, DD-047) marks it "not loaded" so
  // mounted consumers re-read and nothing shows the previous organization's tier.
  const entitlementOrgRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id) {
      entitlementOrgRef.current = null;
      forgetEntitlementSnapshot();
      dispatch(clearEntitlements());
      return;
    }
    const before = entitlementOrgRef.current;
    entitlementOrgRef.current = organizationId ?? null;
    if (before && before !== organizationId) dispatch(setEntitlementsLoading(true));
  }, [user?.id, organizationId, dispatch]);

  return (
    <>
      {/* OverlayWorldHost + PersonPeekHost are NOT here: they are the overlay world
          (app/DeferredOverlayWorld.tsx), loaded by the wrapper on the first open. */}
      {/* G1: files any `__kind` drawn as raw text (never-raw law). */}
      <KindLeakSentinel />
      {/* Dev only: a mounted surface with no ui.ui_surface row screams in the console. */}
      {process.env.NODE_ENV !== "production" && <SurfaceRowGuard />}
      {/* Render-free until a usage limit is hit: the usage gate's boot read,
          server notifications, near/over notice and limit dialog. */}
      <UsageGateBridge />
      {/* Render-free. THE reader/writer of `?panels=` — the deep-link channel
          for floating windows (`?panels=notes`, `?panels=vault:<id>`, …).
          Mounted GLOBALLY and unallowlisted: it owns every key that has a
          hydrator in features/overlays/definitions/<id>.link.ts, on every authenticated
          route. It was route-scoped to /marketing/keyword-research from
          2026-08-27 until 2026-08-30, which made every other `?panels=` link
          on every other route a silent no-op — no window, no warning. Never
          re-scope it to one route: a deep link that works only where its
          author happened to test it is the same defect. */}
      <OverlayServices />
      <KgNewSuggestionNotifier />
      <AssistsDock />
      {/* Render-free. Reads `?cloudBrowserHandoff=` — the door a D-14 "your
          browser needs you" notification lands on — and opens the Cloud
          Browser canvas on that exact handoff. Global, because the notice can
          land on any route and the person must never have to go find the
          browser themselves. */}
      <CloudBrowserHandoffDeepLink />
      {/* Render-free. Reads `?cloudComputer=` (a Cloud Computer notice, e.g.
          held Cloud folder deletes) and opens the Computer tab. */}
      <CloudComputerDeepLink />
      {/* Reads `?tutorial=` — the door a "Show me how" DM card or tutorial
          email lands on — and runs that guided tutorial on its route. */}
      <Suspense fallback={null}>
        <TutorialHost />
      </Suspense>
      {/* Render-free. Reads `?org=` — the organization every deep link the
          platform emits now names — and honors it against the LIVE membership
          list, announcing a move and refusing a link that is not this
          account's in words. Global, because a notification's door can land on
          any route, and the cold-boot half (appContextPolicy) does not run for
          a link followed while the app is already warm. */}
      <LinkOrganizationWatcher />
      <AuthSessionWatcher />
      <PersonTimeZoneCapture />
      <VendorNameRuntimeGuard />
      <AnnouncementProvider />
      {/* EVERY admin singleton (error badge, attention dock, auto-watch,
          indicators) lives behind this ONE admin gate + dynamic edge: a
          non-admin downloads none of their code (Arman, 2026-10-15). Never
          mount an admin component directly here. */}
      <AdminFeatureProvider />
      {/* Not admin-only: a fixture account under ?ai_test_mode= uses it, and
          the header's phone sheet imports the same module statically. */}
      <AiTestModeDock />
      {/* Only in a browser that redeemed a support link (the supported person's
          own session, not an admin's): the countdown, +time and End. */}
      <SupportSessionPill />
      <LiveCaptureIndicator />
      {/* Render-free. Keeps ONE assist row in step with the capture queue; the
          assists dock above does the showing, so this corner holds one draggable
          dock with real close/snooze/never-again controls instead of two
          floating things (Arman, 2026-09-18 — the tray this replaced had none of
          them). Rungs 3 and 4 run in the person's own Chrome through
          matrx-extend minutes or hours after the scrape that raised them, so
          the notice cannot live on /scraper/batch where it was created: it has
          to find the person wherever they are. It reads media.capture_handoff
          directly (there is no outbound channel from the server to a browser).
          common-docs/projects/acquisition-frontier/extension-ladder/CONTRACT.md §8.1. */}
      <NeedsYouAssistProducer />
      {/* Render-free. Asks a signed-in account with no declared age band for
          it ONCE, after they are in the app — never during signup (Arman,
          2026-08-20). Dismissible; re-asks next session. Guests are handled by
          EducationAgeGateMount, where their block actually bites. */}
      {user?.id && <FirstSignInAgeGateMount />}
      {/* Render-free. Meet Matrx ONCE for every existing person on their next visit to home, as a
          calm window (meetMatrxWindow); remembered on the account (meet_matrx_seen). Never over the
          age question, the sign-up welcome, or any page they came to work on. */}
      {user?.id && <MeetMatrxIntroMount />}
      {/* Render-free. Raises the floating "spent so far today" window for a
          Super Admin on their first app open each local day (Arman,
          2026-09-11: scare me with the number, never block the code). Cadence
          is the knob platform.spend_popover.times_per_day — 0 turns it off; a
          dismissal ends the day. Internally gated on selectIsSuperAdmin. */}
    </>
  );
}
