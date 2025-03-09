import { useOneRelationship } from "@/lib/redux/entity/hooks/useOneRelationship";
import { ConversationData } from "@/types/AutomationSchemaTypes";
import { MatrxRecordId } from "@/types/entityTypes";
import { useMemo } from "react";

export type Conversation = {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    userId?: string;
    metadata?: Record<string, unknown>;
    label?: string;
    isPublic?: boolean;
};

export type MessageType = "base64_image" | "blob" | "image_url" | "json_object" | "mixed" | "other" | "text" | "tool_result";

export type Message = {
    id: string;
    conversationId: string;
    role: "assistant" | "system" | "tool" | "user";
    content?: string;
    type: MessageType;
    displayOrder?: number;
    systemOrder?: number;
    createdAt: Date;
    metadata?: Record<string, unknown>;
    userId?: string;
    isPublic?: boolean;
    matrxRecordId: MatrxRecordId;
};

export function useConversationMessages() {
    const relationshipHook = useOneRelationship("conversation", "message", "id", "conversationId");

    const activeConversationId = relationshipHook.activeParentId;
    const activeConversation = relationshipHook.activeParentRecord as ConversationData;
    const allConversationMessages = relationshipHook.matchingChildRecords as Message[];

    const messages = useMemo(() => {
        const validMessages = allConversationMessages.filter(
            (message) => message.displayOrder !== null && message.displayOrder !== undefined && !isNaN(message.displayOrder)
        );
        return validMessages.sort((a, b) => a.displayOrder - b.displayOrder);
    }, [allConversationMessages]);

    return {
        activeConversationId,
        activeConversation,
        allConversationMessages,
        messages,
    };
}
