"use client";

/**
 * Watch AI's one live door: row changes on `chat.user_request` (published to `supabase_realtime`)
 * tell a reader to re-read, so nothing in this feature polls.
 *
 * Why a re-read and not the payload: the readers join `chat.request_snapshot`, workflow runs and
 * followed-work scopes, so a payload alone is never the whole answer. A burst of changes (a run
 * writes status, tokens and activity in quick succession) is folded into ONE re-read.
 * Echo rule (supabase-realtime skill, rule 1): Watch AI never writes this table, so there is no
 * own echo; an event whose (status, last_activity_at) the reader already saw is dropped by the
 * fingerprint. Realtime has no replay (rule 3), so a reconnect re-reads once (`onBackfill`).
 */

import { useCallback, useEffect, useRef } from "react";
import { defineChannelNamespace } from "@ai-matrx/data/realtime";
import { useChannel } from "@ai-matrx/data/realtime/react";

const watchChannel = defineChannelNamespace({
  namespace: "ai-watch-user-request",
  parts: ["scope"],
  description: "chat.user_request changes the viewer may see, so Watch AI re-reads instead of polling",
});

/** A burst of changes becomes one re-read after this quiet gap. */
const FOLD_MS = 350;

export interface UserRequestChangesOptions {
  /** Which Watch AI reader this is (names the channel; one reader, one scope). */
  scope: string;
  /** False closes the channel (the reader is not on screen). */
  enabled: boolean;
  /** Only this row (`id=eq.<id>`); omitted = every row the viewer may see. */
  id?: string | null;
  /** Re-read. Held in a ref, so a new function each render does not reopen the channel. */
  refresh: () => void;
}

export function useUserRequestChanges({ scope, enabled, id = null, refresh }: UserRequestChangesOptions): void {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const fold = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      refreshRef.current();
    }, FOLD_MS);
  }, []);

  useChannel(
    enabled
      ? {
          topic: watchChannel.topic({ scope: id ? `${scope}:${id}` : scope }),
          onBackfill: fold,
          postgresChanges: [
            {
              event: "*",
              schema: "chat",
              table: "user_request",
              ...(id ? { filter: `id=eq.${id}` } : {}),
              rowId: (row) => (typeof row.id === "string" ? row.id : undefined),
              fingerprint: (row) => JSON.stringify([row.status ?? null, row.last_activity_at ?? null, row.completed_at ?? null]),
              onChange: fold,
            },
          ],
        }
      : null,
  );
}
