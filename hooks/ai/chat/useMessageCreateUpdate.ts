import { useMemo, useCallback } from "react";
import useCreateUpdateRecord from "@/app/entities/hooks/crud/useCreateUpdateRecord";
import { MatrxRecordId } from "@/types/entityTypes";
import { getPermanentId, useEntityTools } from "@/lib/redux";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageType } from "@/types/chat/chat.types";

const NEW_MESSAGE_DATA: Partial<Message> = {
    role: "user",
    type: "text",
    isPublic: false,
};

interface MessageCreateUpdateProps {
    conversationId: string | undefined;
    lastDisplayOrder?: number;
    lastSystemOrder?: number;
}

export interface CreateMessageDirectlyOptions {
    conversationId: string;
    content: string;
    displayOrder?: number;
    systemOrder?: number;
    isPublic?: boolean;
    type?: MessageType;
    metadata?: Record<string, unknown>;
}

export const useMessageCreateUpdate = ({ 
    conversationId, 
    lastDisplayOrder = 0, 
    lastSystemOrder = 1 
}: MessageCreateUpdateProps) => {

    const dispatch = useDispatch();
    const { actions } = useEntityTools("message");
    const {
        start: coreStart,
        updateField,
        updateFields,
        save: coreSave,
        currentRecordId,
        recordDataWithDefaults,
        recordDataWithoutDefaults,
    } = useCreateUpdateRecord({ entityKey: "message" });


    const message = useMemo(() => recordDataWithDefaults as Message, [recordDataWithDefaults]);
    const explicitMessageData = useMemo(() => recordDataWithoutDefaults as Partial<Message>, [recordDataWithoutDefaults]);

    const startMessage = useCallback(
        (content?: string) => {
            if (!conversationId || conversationId === "") {
                return null;
            }
            const nextDisplayOrder = lastDisplayOrder + 1;
            const nextSystemOrder = lastSystemOrder + 1;
            const initialData = {
                conversationId,
                role: "user" as const,
                displayOrder: nextDisplayOrder,
                systemOrder: nextSystemOrder,
                ...(content ? { content } : {}),
            };
            return coreStart({
                ...NEW_MESSAGE_DATA,
                ...initialData,
            });
        },
        [conversationId, lastDisplayOrder, lastSystemOrder, coreStart]
    );

    const save = useCallback(() => {
        if (!currentRecordId) return null;
        coreSave();
        return getPermanentId(currentRecordId);
    }, [currentRecordId, coreSave]);

    // New function to create a message directly in one step
    const createMessageDirectly = useCallback(
        (options: CreateMessageDirectlyOptions) => {
            const { 
                conversationId: directConversationId, 
                content, 
                displayOrder = lastDisplayOrder + 1,
                systemOrder = lastSystemOrder + 1,
                isPublic = false,
                type = "text",
                metadata = {}
            } = options;

            if (!directConversationId || directConversationId === "") {
                return null;
            }

            const matrxRecordId = `id:${uuidv4()}`;

            const initialData = {
                ...NEW_MESSAGE_DATA,
                conversationId: directConversationId,
                content,
                role: "user" as const,
                displayOrder,
                systemOrder,
                isPublic,
                type,
                metadata
            };

            dispatch(
                actions.directCreateRecord({
                    matrxRecordId,
                    data: initialData,
                })
            );

            return matrxRecordId;
        
        },
        [actions, lastDisplayOrder, lastSystemOrder]
    );

    const updateContent = useCallback(
        (content: string) => {
            updateField("content", content);
        },
        [updateField]
    );

    const setTextMessage = useCallback(
        (content: string) => {
            updateFields({
                type: "text",
                content: content,
            });
        },
        [updateFields]
    );

    const setImageMessage = useCallback(
        (imageUrl: string) => {
            updateFields({
                type: "mixed",
                metadata: {
                    ...(message.metadata || {}),
                    image_url: imageUrl,
                },
            });
        },
        [updateFields, message.metadata]
    );

    const togglePublic = useCallback(() => {
        updateField("isPublic", !message.isPublic);
    }, [updateField, message.isPublic]);

    const setPublic = useCallback(
        (isPublic: boolean) => {
            updateField("isPublic", isPublic);
        },
        [updateField]
    );

    const updateMetadataField = useCallback(
        (key: string, value: unknown) => {
            const updatedMetadata = {
                ...(message.metadata || {}),
                [key]: value,
            };
            updateField("metadata", updatedMetadata);
        },
        [updateField, message.metadata]
    );

    return {
        startMessage,
        updateField,
        updateFields,
        save,
        createMessageDirectly,
        
        currentId: currentRecordId,
        message,
        explicitMessageData,
        isCreating: !!currentRecordId,
        hasValidConversation: !!conversationId && conversationId !== "",
        
        updateContent,
        setTextMessage,
        setImageMessage,
        
        togglePublic,
        setPublic,
        
        updateMetadataField,
    };
};

export default useMessageCreateUpdate;