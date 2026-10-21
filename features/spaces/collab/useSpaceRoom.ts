"use client";

// features/spaces/collab/useSpaceRoom.ts — ONE realtime channel per open Space (A6, H1, H3):
//   presence  — who has this page open now (the top bar's avatars);
//   postgres_changes on platform.comments for this page — another person's comment, reply, edit,
//             resolve or delete reaches the thread list without a reload (row security gates delivery).
// The page's own saves arrive through the store's subscription (store-db, owner's).
// On @ai-matrx/data/realtime (supabase-realtime skill): namespace-built topic, backfill = re-read the threads.

import { defineChannelNamespace, type RealtimeStatus } from "@ai-matrx/data/realtime";
import { usePresence } from "@ai-matrx/data/realtime/react";
import { useRef } from "react";

import { selectOrganizationIds } from "@/features/scopes/redux/selectors/tree";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserAvatarUrl, selectUserEmail, selectUserFullName, selectUserId } from "@/lib/redux/selectors/userSelectors";

const spacesPage = defineChannelNamespace({
  namespace: "spaces-page",
  parts: ["spaceId"],
  description: "One open Space: who is viewing it (presence) and its comments (platform.comments changes).",
});

export type SpaceViewerState = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Not a member of the page's organization (CLOSE-SHARE): the avatar shows Guest. */
  guest?: boolean;
} & Record<string, unknown>;

export interface SpaceViewer {
  userId: string;
  name: string;
  avatarUrl: string | null;
  guest: boolean;
}

export interface SpaceRoom {
  viewers: SpaceViewer[];
  me: string | null;
  /** The page channel's connection (co-editing reads it for Offline and the host election). */
  status: RealtimeStatus;
}

export function useSpaceRoom(spaceId: string, onCommentsChanged: () => void, pageOrganizationId?: string | null): SpaceRoom {
  const userId = useAppSelector(selectUserId);
  // A Guest is someone who is not a member of the page's organization. Each viewer says so for themself from their own
  // memberships; until those are loaded (an empty list) nobody is called a Guest.
  const memberOrgs = useAppSelector(selectOrganizationIds);
  const guest = !!pageOrganizationId && memberOrgs.length > 0 && !memberOrgs.includes(pageOrganizationId);
  const fullName = useAppSelector(selectUserFullName);
  const email = useAppSelector(selectUserEmail);
  const avatarUrl = useAppSelector(selectUserAvatarUrl);
  // The handler reads the latest callback at event time — never a dependency of the channel.
  const changed = useRef(onCommentsChanged);
  changed.current = onCommentsChanged;

  const { members, status } = usePresence<SpaceViewerState>(
    {
      topic: spacesPage.topic({ spaceId }),
      presence: {
        state: { userId: userId ?? "", name: fullName || email || "Someone", avatarUrl: avatarUrl ?? null, guest },
      },
      spec: {
        postgresChanges: [
          {
            event: "*",
            schema: "platform",
            table: "comments",
            filter: `entity_id=eq.${spaceId}`,
            rowId: (row) => (typeof row.id === "string" ? row.id : undefined),
            onChange: () => changed.current(),
          },
        ],
        onBackfill: () => changed.current(),
      },
    },
    { enabled: !!userId },
  );

  // One avatar per person (a person with two tabs open is one viewer); me first, as Notion does.
  const byUser = new Map<string, SpaceViewer>();
  for (const m of members) {
    const s = m.state;
    if (!s?.userId || byUser.has(s.userId)) continue;
    byUser.set(s.userId, { userId: s.userId, name: s.name || "Someone", avatarUrl: s.avatarUrl ?? null, guest: s.guest === true });
  }
  const viewers = [...byUser.values()].sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : a.name.localeCompare(b.name)));
  return { viewers, me: userId, status };
}
