"use client";

/**
 * THE LIVE DOOR FOR PREFERENCES. Mounted once inside RealtimeHost. One postgres_changes binding on the
 * person's own `users.user_preferences` row (RLS delivers only it); a row that is news re-runs the SAME
 * remote fetch the sync engine runs at boot, so held edits, pending writes and the slice's load status
 * behave exactly as they do on any refresh. `onBackfill` covers the gap realtime cannot replay (sleep,
 * network loss). Echoes of this tab's own saves are dropped by version (`preferencesLive.ts`).
 * Doctrine: .claude/skills/supabase-realtime/SKILL.md.
 *
 * Joins only after the page has settled (`useLateIdleReady`): realtime is never part of first paint,
 * so this binding no longer opens the shared socket at boot. The boot read already holds the row;
 * only an edit made in another tab during the few seconds before the join waits for the next
 * recovery reread (tab wake, reconnect) — the same window every late-tier channel accepts.
 */

import { useEffect } from "react";
import { useStore } from "react-redux";
import { defineChannelNamespace } from "@ai-matrx/data/realtime";
import { useChannel } from "@ai-matrx/data/realtime/react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { invokeRemoteFetch } from "@/lib/sync/engine/remoteFetch";
import type { AppStore } from "@/lib/redux/store";
import { useLateIdleReady } from "@/lib/boot/lateIdle";
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
  const settled = useLateIdleReady();

  useEffect(() => {
    resetPreferencesVersions();
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
    userId && settled
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
        }
      : null,
  );

  return null;
}
