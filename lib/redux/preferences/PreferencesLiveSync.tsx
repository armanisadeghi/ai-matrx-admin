"use client";

/**
 * THE LIVE DOOR FOR PREFERENCES. Mounted once inside RealtimeHost. One postgres_changes binding on the
 * person's own `users.user_preferences` row (RLS delivers only it); a row that is news re-runs the SAME
 * remote fetch the sync engine runs at boot, so held edits, pending writes and the slice's load status
 * behave exactly as they do on any refresh. `onBackfill` covers the gap realtime cannot replay (sleep,
 * network loss). Echoes of this tab's own saves are dropped by version (`preferencesLive.ts`).
 * Doctrine: .claude/skills/supabase-realtime/SKILL.md.
 *
 * Joins only on the engaged-late tier (`useEngagedLateReady`: the page settled AND the person
 * pressed, typed or touched): a page nobody touches opens no socket. The boot read already holds
 * the row; an edit made in another tab before the join is caught by ONE re-read when the channel
 * first connects (`onStatusChange`), and later by `onBackfill` (wake, reconnect) and the slice's
 * focus revalidation (`revalidateOnFocusAfterMs`).
 */

import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import { defineChannelNamespace } from "@ai-matrx/data/realtime";
import { useChannel } from "@ai-matrx/data/realtime/react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { invokeRemoteFetch } from "@/lib/sync/engine/remoteFetch";
import type { AppStore } from "@/lib/redux/store";
import { useEngagedLateReady } from "@/lib/boot/engagedLate";
import { userPreferencesPolicy } from "./userPreferencesSlice";
import { preferencesRowIsNews, resetPreferencesVersions } from "./preferencesLive";

/** One place names this channel. A second, different declaration throws. */
const preferencesChannel = defineChannelNamespace({
  namespace: "user-preferences",
  parts: ["userId"],
  description: "users.user_preferences row of one user",
});

export function PreferencesLiveSync() {
  const store = useStore() as AppStore;
  const userId = useAppSelector(selectUserId);
  const engaged = useEngagedLateReady();
  // The first connect of this binding re-reads once: an edit made elsewhere between the boot read
  // and the join has no realtime row to deliver it. Later connects are `onBackfill`'s.
  const joinedOnce = useRef(false);

  useEffect(() => {
    resetPreferencesVersions();
    joinedOnce.current = false;
  }, [userId]);

  const reread = () => {
    void invokeRemoteFetch({
      policy: userPreferencesPolicy,
      store,
      getIdentity: () => store._sync.getIdentity(),
      reason: "stale-refresh",
    });
  };

  useChannel(
    userId && engaged
      ? {
          topic: preferencesChannel.topic({ userId }),
          postgresChanges: [
            {
              event: "UPDATE",
              schema: "users",
              table: "user_preferences",
              filter: `user_id=eq.${userId}`,
              rowId: (row) => (typeof row.user_id === "string" ? row.user_id : undefined),
              fingerprint: (row) => String(row.version ?? ""),
              onChange: ({ payload }) => {
                const next = (payload as { new?: Record<string, unknown> }).new;
                if (preferencesRowIsNews(next)) reread();
              },
            },
          ],
          onBackfill: reread,
          onStatusChange: (status) => {
            if (status !== "connected" || joinedOnce.current) return;
            joinedOnce.current = true;
            reread();
          },
        }
      : null,
  );

  return null;
}
