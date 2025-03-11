import { useCallback, useState } from "react";
import { useEntityTools } from "@/lib/redux";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

export type MessageRole = "assistant" | "system" | "tool" | "user" | string | undefined;
export type MessageType =
    | "base64_image"
    | "blob"
    | "image_url"
    | "json_object"
    | "mixed"
    | "other"
    | "text"
    | "tool_result"
    | string
    | undefined;

export type MessageMetadata = {
    image_url?: string;
    file_url?: string;
    base64_image?: string;
    blob?: string;
    tool_result?: Record<string, unknown>;
    thinking_text?: string;
    [key: string]: unknown;
};

export type Message = {
    id: string;
    conversationId: string;
    role: MessageRole;
    content?: string;
    type: MessageType;
    displayOrder?: number;
    systemOrder?: number;
    createdAt?: Date;
    metadata?: MessageMetadata;
    userId?: string;
    isPublic?: boolean;
};

const DEFAULT_MESSAGE_METADATA: MessageMetadata = {
    image_url: "",
    file_url: "",
    base64_image: "",
    blob: "",
    tool_result: {},
    thinking_text: "",
};

interface MessageCreateUpdateProps {
    initialConversationId?: string;
}

export interface CreateMessageOptions {
    conversationId?: string;
    content: string;
    displayOrder: number;
    systemOrder: number;
    role?: MessageRole;
    type?: MessageType;
    isPublic?: boolean;
    metadata?: MessageMetadata;
}

export const useCreateMessage = ({
    initialConversationId,
}: MessageCreateUpdateProps = {}) => {
    const dispatch = useDispatch();
    const { actions } = useEntityTools("message");
    
    // Only maintain conversationId as state since it's the critical piece
    const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
    
    /**
     * Update the conversation ID
     */
    const updateConversationId = useCallback((newConversationId: string) => {
        setConversationId(newConversationId);
    }, []);
    
    /**
     * Add image to message metadata
     */
    const addImage = useCallback((imageUrl: string, options: CreateMessageOptions) => {
        return {
            ...options,
            type: "mixed",
            metadata: {
                ...(options.metadata || DEFAULT_MESSAGE_METADATA),
                image_url: imageUrl
            }
        };
    }, []);
    
    /**
     * Add file to message metadata
     */
    const addFile = useCallback((fileUrl: string, options: CreateMessageOptions) => {
        return {
            ...options,
            type: "mixed",
            metadata: {
                ...(options.metadata || DEFAULT_MESSAGE_METADATA),
                file_url: fileUrl
            }
        };
    }, []);
    
    /**
     * Create a message with the given options
     */
    const createMessage = useCallback((
        options: CreateMessageOptions
    ) => {
        // Generate new IDs for each message
        const messageId = uuidv4();
        const matrxRecordId = `id:${messageId}`;
        
        // Ensure we have a conversation ID
        const messageConversationId = options.conversationId || conversationId;
        
        if (!messageConversationId) {
            console.error("Conversation ID is missing. Cannot create message without a conversation ID.");
            return null;
        }
        
        if (!options.content) {
            console.warn("Cannot create message with empty content");
            return null;
        }
        
        // Create the message data with all required fields
        const messageData: Message = {
            id: messageId,
            conversationId: messageConversationId,
            role: options.role || "user",
            content: options.content,
            type: options.type || "text",
            displayOrder: options.displayOrder,
            systemOrder: options.systemOrder,
            isPublic: options.isPublic !== undefined ? options.isPublic : false,
            metadata: options.metadata || DEFAULT_MESSAGE_METADATA,
        };
        
        console.log("useCreateMessage messageData", messageData);
        dispatch(actions.directCreateRecord({
            matrxRecordId,
            data: messageData
        }));
        
        return messageId;
    }, [
        conversationId, 
        actions, 
        dispatch
    ]);
    
    /**
     * Simplified method for quickly creating a text message
     * with all necessary default values included
     */
    const createTextMessage = useCallback((
        content: string, 
        messageConversationId?: string,
        displayOrder: number = 1,
        systemOrder: number = 2
    ) => {
        return createMessage({
            content,
            conversationId: messageConversationId,
            displayOrder,
            systemOrder,
            role: "user",
            type: "text",
            isPublic: false,
            metadata: DEFAULT_MESSAGE_METADATA
        });
    }, [createMessage]);
    
    return {
        conversationId,
        updateConversationId,
        createMessage,
        createTextMessage,
        addImage,
        addFile
    };
};

export default useCreateMessage;