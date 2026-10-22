"use client";

// features/ai-work/conversations/components/ConversationsBrowse.tsx
//
// /work/conversations — the canonical entity-list shell, plus the two things
// this surface owes the user above the table: the honest audience switch (the
// door to the internal machine runs the default hides) and the sync verdict.

import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import { CaptureGapAlertConnected } from "@/features/agent-connections/coding-sessions/CaptureGapAlert";
import { AiWorkDestinationNavigation } from "../../components/AiWorkDestinationNavigation";
import { conversationListConfig } from "../listConfig";
import type { ConversationBrowseRow } from "../types";
import { ConversationAudienceFilter } from "./ConversationAudienceFilter";
import { SyncStateIndicator } from "./SyncStatePanel";
import {
  buildConversationListWriteHandlers,
  buildConversationsPageScope,
  buildWorkOverviewScope,
} from "../conversationListSurface";
import { AI_WORK_SURFACE_NAME } from "@/features/surfaces/manifests/ai-work.manifest";
import { AI_WORK_CONVERSATIONS_SURFACE_NAME } from "@/features/surfaces/manifests/ai-work-conversations.manifest";

// One list, two routes: /work (embedded) answers as the AI Work overview,
// /work/conversations as its own surface. Same values, same writes.
const OVERVIEW_SURFACE = {
  surfaceName: AI_WORK_SURFACE_NAME,
  getScope: buildWorkOverviewScope,
  getWriteHandlers: buildConversationListWriteHandlers,
};
const CONVERSATIONS_SURFACE = {
  surfaceName: AI_WORK_CONVERSATIONS_SURFACE_NAME,
  getScope: buildConversationsPageScope,
  getWriteHandlers: buildConversationListWriteHandlers,
};

export function ConversationsBrowse({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  return (
    <EntityListPage<ConversationBrowseRow>
      config={conversationListConfig}
      clearsShellHeader={!embedded}
      surface={embedded ? OVERVIEW_SURFACE : CONVERSATIONS_SURFACE}
      notice={(list) => (
        <div className="space-y-1.5">
          {embedded && <AiWorkDestinationNavigation list={list} />}
          {/*
            This inbox is where a capture outage is actually FELT — an empty or
            stale list here is indistinguishable from a quiet day unless the
            surface says so. Renders nothing while capture is healthy.
          */}
          {!embedded && <CaptureGapAlertConnected />}
          <SyncStateIndicator />
          <ConversationAudienceFilter list={list} />
        </div>
      )}
    />
  );
}
