"use client";

/**
 * Announcement Provider — heavy body (Impl).
 *
 * Calls the `getActiveAnnouncements` server action and renders the
 * `SystemAnnouncementBanner` when there's an unviewed active announcement. Announcements are the
 * user-facing feature-announcement rail only — spend alarms and every other operator alert live on
 * the super-admin attention dock (`features/admin/attention`), never here. Lazy-loaded by
 * `AnnouncementProvider.tsx` ONLY after shell data has loaded, so the server action's dep graph
 * (supabase admin client + feedback types + modal markup) never enters the static graph of any route.
 */

import React, { useEffect, useMemo, useState } from "react";
import { getActiveAnnouncements } from "@/actions/feedback.actions";
import { SystemAnnouncement } from "@/types/feedback.types";
import SystemAnnouncementBanner from "./SystemAnnouncementBanner";
import { useAppSelector } from "@/lib/redux/hooks";

export default function AnnouncementProviderImpl() {
  const [fetched, setFetched] = useState<SystemAnnouncement[]>([]);
  const [currentAnnouncementIndex] = useState(0);
  const viewedAnnouncements = useAppSelector(
    (state) => state.userPreferences.system.viewedAnnouncements,
  );

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const result = await getActiveAnnouncements();
      if (result.success && result.data) setFetched(result.data);
    };

    fetchAnnouncements();
  }, []);

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
