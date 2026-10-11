"use client";

/**
 * Announcement Provider — thin client shell.
 *
 * Gates on TWO facts:
 *  - `selectAnnouncementsReady` (signed in + saved preferences settled; see
 *    announcementGate.ts), and
 *  - WHERE the person is: announcements are in-app news, so they show only
 *    inside the app shell (`.shell-root`). A public page, a share link, a
 *    meeting stage or a kiosk is someone else's page to the person viewing
 *    it — a signed-in owner reading their own public flashcard set is a
 *    visitor there — and an in-app banner floating over it covers its
 *    controls (live 2026-10-10: it sat on the study deck's Ask button).
 *
 * The body — server-action call to `getActiveAnnouncements`,
 * `SystemAnnouncement` types, and the `SystemAnnouncementBanner` markup —
 * lives in `AnnouncementProviderImpl.tsx` and is `next/dynamic`-loaded only
 * once both gates open, so its dep graph never enters the static graph of
 * any route.
 */

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAnnouncementsReady } from "./announcementGate";
import { useInAppShell } from "./useInAppShell";

const AnnouncementProviderImpl = dynamic(
  () => import("./AnnouncementProviderImpl"),
  { ssr: false, loading: () => null },
);

export default function AnnouncementProvider() {
  const ready = useAppSelector(selectAnnouncementsReady);
  const inAppShell = useInAppShell();
  if (!ready || !inAppShell) return null;
  return <AnnouncementProviderImpl />;
}
