// ai/hero-chat/page.tsx

"use client";

import React, { useMemo } from "react";
import { ScrollShadow } from "@heroui/react";
import SidebarContainer from "./sidebar-with-chat-history";
import MessagingChatMessage from "./messaging-chat-message";
import PromptInputWithEnclosedActions from "./prompt-input-with-enclosed-actions";
import ModelDropdown from "./parts/ModelDropdown";
import { useOneRelationship } from "@/lib/redux/entity/hooks/useOneRelationship";
import { CHAT_RELATIONSHIP_BASE_CONFIG } from "@/constants/chat";
import { ConversationRecordWithKey, MatrxRecordId, MessageRecordWithKey } from "@/types";
import { getChatActions } from "@/lib/redux/entity/custom-actions/chatActions";
import { useAppDispatch } from "@/lib/redux";

export default function Component() {
  const {
    parentRecordsArray,
    activeParentId: activeConversationId,
    activeParentRecord,
    isParentLoading: isConversationLoading,
    isChildLoading: isMessageLoading,
    isRelationshipLoading: isRelationshipLoading,
    matchingChildRecords: matchingMessages,
    matchingChildRecordsCount: matchingMessagesCount,
    setActiveParent: setActiveConversation,
  } = useOneRelationship(CHAT_RELATIONSHIP_BASE_CONFIG);

  const dispatch = useAppDispatch();
  const chatActions = getChatActions(dispatch);
  const activeConversationRecord = activeParentRecord as ConversationRecordWithKey;
  const conversationHistory = parentRecordsArray as ConversationRecordWithKey[];
  const messages = matchingMessages as MessageRecordWithKey[];
  
  const filteredAndSortedMessages = useMemo(() => messages
  .filter((message) => message.displayOrder > 0)
  .sort((a, b) => a.displayOrder - b.displayOrder), [messages]);


  const handleConversationSelection = (matrxRecordId: MatrxRecordId) => {
    setActiveConversation(matrxRecordId);
  }

    return (
        <div className="h-full w-full">
            <SidebarContainer conversationHistory={conversationHistory} header={<ModelDropdown />} subTitle="Today" title={activeConversationRecord?.label ?? "New Chat"} onConversationSelection={handleConversationSelection}>
                <div className="relative flex h-full flex-col scrollbar-none">
                    <ScrollShadow className="flex h-full max-h-[70vh] flex-col px-4 gap-4 overflow-y-auto scrollbar-none">
                        {filteredAndSortedMessages.map((message, displayOrder) => (
                            <MessagingChatMessage
                                key={displayOrder}
                                role={message.role}
                                content={message.content}
                                classNames={{
                                    base: "bg-default-50",
                                }}
                            />
                        ))}
                    </ScrollShadow>
                    <div className="mt-auto flex max-w-full flex-col gap-2 px-4">
                        <PromptInputWithEnclosedActions />
                    </div>
                </div>
            </SidebarContainer>
        </div>
    );
}
