"use client";

/**
 * Announcement Provider — heavy body (Impl).
 *
 * Reads active announcements directly from Supabase (after the page settles) and renders the
 * `SystemAnnouncementBanner` when there's an unviewed active announcement. Announcements are the
 * user-facing feature-announcement rail only — spend alarms and every other operator alert live on
 * the super-admin attention dock (`features/admin/attention`), never here. Lazy-loaded by
 * `AnnouncementProvider.tsx` ONLY after shell data has loaded, so its dep graph
 * (feedback types + modal markup) never enters the static graph of any route.
 */

import React, { useEffect, useMemo, useState } from "react";
import { readActiveAnnouncements } from "@/lib/announcements/readActiveAnnouncements";
import { useEngagedLateReady } from "@/lib/boot/engagedLate";
import { SystemAnnouncement } from "@/types/feedback.types";
import SystemAnnouncementBanner from "./SystemAnnouncementBanner";
import { useAppSelector } from "@/lib/redux/hooks";

export default function AnnouncementProviderImpl() {
  const [fetched, setFetched] = useState<SystemAnnouncement[]>([]);
  const [currentAnnouncementIndex] = useState(0);
  const viewedAnnouncements = useAppSelector(
    (state) => state.userPreferences.system.viewedAnnouncements,
  );

  // The load law: nothing here is needed for first paint, so the read waits for the page to settle.
  const settled = useEngagedLateReady(); // settled AND engaged (2026-10-17)
  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    void readActiveAnnouncements().then((result) => {
      if (!cancelled && result.success && result.data) setFetched(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [settled]);

  const announcements = useMemo(
    () => fetched.filter((a) => !viewedAnnouncements.includes(a.id)),
    [fetched, viewedAnnouncements],
  );

  const currentAnnouncement = announcements[currentAnnouncementIndex];

  return currentAnnouncement ? (
    <SystemAnnouncementBanner
      key={currentAnnouncement.id}
      announcement={currentAnnouncement}
    />
  ) : null;
}
