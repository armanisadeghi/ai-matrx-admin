import { useOneRelationship } from "@/lib/redux/entity/hooks/useOneRelationship";
import { MatrxRecordId } from "@/types/entityTypes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, Message, MessageRole } from "@/types/chat/chat.types";
import { useCreateConvoAndMessage } from "@/app/entities/hooks/crud/by-relationships/useCreateConvoAndMessage";
import { NEW_CONVERSATION_ID, CHAT_RELATIONSHIP_BASE_CONFIG, CHAT_CREATE_BASE_CONFIG, NEW_CHAT_PARAMS, DEFAULT_GPT_MODEL_ID } from "@/constants/chat";
import { usePrepConversationSocket } from "@/lib/redux/socket/schema/hooks/usePrepConversationSocket";

const DEBUG = false;
const VERBOSE = false;

type MessageWithKey = Message & { matrxRecordId: MatrxRecordId };

export interface CombinedSaveChatResult {
    success: boolean;
    conversationId?: string;
    conversationRecordKey?: MatrxRecordId;
    messageId?: string;
    messageRecordKey?: MatrxRecordId;
    conversation?: Conversation;
    message?: Message;
    error?: Error;
}

export function useChatRelationship(convoId: string) {
    const relationshipHook = useOneRelationship(CHAT_RELATIONSHIP_BASE_CONFIG);

    const [conversationId, setConversationId] = useState<string | null>(null); // Single source of truth for the conversation id
    const [isNewChat, setIsNewChat] = useState<boolean | undefined>(undefined); // Whether the chat is new or not
    const [isChatReady, setIsChatReady] = useState<boolean | undefined>(undefined); // Ready means it's either NOT a new chat or the new chat has been created in state and ready to use
    const [isConversationReady, setIsConversationReady] = useState(false);
    const [isMessageReady, setIsMessageReady] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(true);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [chatMessages, setChatMessages] = useState<MessageWithKey[]>([]);
    const [newMessageId, setNewMessageId] = useState<string | null>(null);
    const [isReadyToFetch, setIsReadyToFetch] = useState(false);

    const { conversationCrud, messageCrud, createConversationAndMessage, saveConversationAndMessage } =
        useCreateConvoAndMessage(CHAT_CREATE_BASE_CONFIG);

    const { prepConversation } = usePrepConversationSocket({});

    const {
        activeParentId,
        activeParentRecord,
        isParentLoading,
        isChildLoading,
        isRelationshipLoading,
        matchingChildRecords,
        matchingChildRecordsCount,
    } = relationshipHook;

    useEffect(() => {
        console.log("🔵 useChatRelationship useEffect convoId", convoId, "isReadyToFetch", isReadyToFetch);
        if (!convoId || !isReadyToFetch) return;
        if (convoId === NEW_CONVERSATION_ID) {
            console.log("- New Chat (if)");
            setIsNewChat(true);
            setConversationId(null);
            setIsChatReady(false);
            setIsChatLoading(true);
        } else {
            console.log("- Existing Chat (else)");
            relationshipHook.setActiveParent(`id:${convoId}`);
            setConversationId(convoId);
            setIsConversationReady(true);
            setIsMessageReady(false);
            setIsNewChat(false);
            setIsChatReady(false);
            setIsChatLoading(true);
        }
    }, [convoId, isReadyToFetch]);

    const isParentLoadingRef = useRef(isParentLoading);

    useEffect(() => {
        isParentLoadingRef.current = isParentLoading;
        if (isParentLoading) {
            setIsChatLoading(true);
        } else {
            setIsReadyToFetch(true);
        }
    }, [isParentLoading]);

    const waitForLoading = useCallback(() => {
        return new Promise<void>((resolve) => {
            if (!isParentLoadingRef.current) {
                resolve();
                return;
            }

            let iterationCount = 0;
            const unsubscribe = setInterval(() => {
                iterationCount++;

                if (iterationCount % 10 === 0) {
                    console.warn(`waitForLoading still running after ${iterationCount} checks (${iterationCount * 100}ms)`);
                }

                if (!isParentLoadingRef.current) {
                    clearInterval(unsubscribe);
                    resolve();
                }
            }, 100);
        });
    }, []);


    useEffect(() => {
        setChatMessages(matchingChildRecords as MessageWithKey[]);
        setActiveConversation(activeParentRecord as Conversation);
    }, [matchingChildRecordsCount, activeParentRecord, matchingChildRecords]);

    const createNewConversation = useCallback(async () => {
        const { conversationId, messageId } = createConversationAndMessage(NEW_CHAT_PARAMS);
        relationshipHook.setActiveParent(`new-record-${conversationId}`);
        setIsConversationReady(true);
        setIsMessageReady(true);
        await waitForLoading();
        setIsChatReady(true);
        setIsChatLoading(false);
        setNewMessageId(messageId);
        setIsMessageReady(true);

        return { conversationId, messageId };
    }, [createConversationAndMessage, waitForLoading]);

    useEffect(() => {
        if (isNewChat) {
            setIsConversationReady(false);
            setIsMessageReady(false);
            createNewConversation();
            console.log("🔵 useChatRelationship isNewChat"); // TODO: create new conversation
        }
    }, [isNewChat]);

    useEffect(() => {
        if (!isChatReady) return;
        if (!isConversationReady) return; // probably overkill
        if (!isMessageReady) return; // probably overkill
        if (activeParentId) {
            setConversationId(activeParentId);
        }
    }, [activeParentId, isChatReady, isConversationReady, isMessageReady]);

    useEffect(() => {
        if (matchingChildRecordsCount === 0) {
            setIsConversationReady(false);
        } else {
            setIsConversationReady(true);
        }
    }, [matchingChildRecordsCount]);

        const getOrderData = useCallback(() => {
        console.log("\n🔶getOrderData");
        console.log("chatMessages", chatMessages);
        const lastMessage = chatMessages.reduce((max, current) => {
            const maxOrder = max?.displayOrder ?? -Infinity;
            const currentOrder = current?.displayOrder ?? -Infinity;
            return currentOrder > maxOrder ? current : max;
        }, null);

        console.log("lastMessage", JSON.stringify(lastMessage, null, 2));

        const isLastAssistant = lastMessage?.role === "assistant";
        console.log("isLastAssistant", isLastAssistant);
        const displayOrder = isLastAssistant ? lastMessage.displayOrder + 1 : lastMessage.displayOrder + 2;
        console.log("displayOrder", displayOrder);
        const systemOrder = isLastAssistant ? lastMessage.systemOrder + 1 : lastMessage.systemOrder + 2;
        console.log("systemOrder", systemOrder);

        console.log("🔶================================🔶\n");

        return { displayOrder, systemOrder };
    }, [chatMessages]);

    const createNewMessage = useCallback(
        (content: string = "", additionalData: Partial<Message> = {}) => {
            const { displayOrder, systemOrder } = getOrderData();

            console.log("🟡 Calculated Display Order", displayOrder);

            messageCrud.resetMessage();

            const messageId = messageCrud.createMessage({
                conversationId: conversationId,
                content,
                displayOrder,
                systemOrder,
                role: "user" as MessageRole,
                ...additionalData,
            });
            setIsMessageReady(true);
            setNewMessageId(messageId);

            return messageId;
        },
        [conversationId, messageCrud, getOrderData]
    );

    useEffect(() => {
        if (matchingChildRecordsCount === 0 || !chatMessages) return;
        if (isConversationReady && !isChatReady && !isParentLoadingRef.current) {
            if (!isMessageReady) {
                console.log("🟡 createNewMessage");
                if (matchingChildRecordsCount === 0) return;
                
                setTimeout(() => {
                    const messageId = createNewMessage();
                    setNewMessageId(messageId);
                    setIsChatLoading(false);
                    prepConversation(conversationId);
                }, 200);
            } else {
                setIsChatReady(true);
            }
        }
    }, [
        isChatReady,
        isConversationReady,
        isMessageReady,
        isParentLoadingRef.current,
        createNewMessage,
        matchingChildRecordsCount,
        chatMessages,
    ]);


    useEffect(() => {
        if (conversationId && isChatReady && !isRelationshipLoading) {
            setIsChatLoading(false);
        } else if (conversationId && !isChatReady && !isRelationshipLoading) {
            if (matchingChildRecordsCount === 0) return;
            console.log("🟢 createNewMessage");
            const messageId = createNewMessage();
            setNewMessageId(messageId);
            setIsChatLoading(false);
            prepConversation(conversationId);
        }
    }, [conversationId, isChatReady, isRelationshipLoading, matchingChildRecordsCount, createNewMessage]);

    const saveMessage = useCallback(async (): Promise<CombinedSaveChatResult> => {
        const result = await messageCrud.saveMessage();

        if (result.success) {
            setIsMessageReady(false);
            setIsChatLoading(true);
            setIsChatReady(false);
        }

        return {
            success: result.success,
            conversationId: result.conversationId,
            conversationRecordKey: result.conversationRecordKey,
            messageId: result.id,
            messageRecordKey: result.recordKey,
            conversation: activeConversation,
            message: result.message,
            error: result.error,
        };
    }, [messageCrud]);

    const saveNewConversation = useCallback(async (): Promise<CombinedSaveChatResult> => {
        try {
            const result = await saveConversationAndMessage();

            if (result.conversationSuccess && result.messageSuccess) {
                setIsConversationReady(true);
                setConversationId(result.conversationId);

                setIsNewChat(false);
                setIsChatReady(false);
                setIsChatLoading(true);

                setIsMessageReady(false);
                setNewMessageId(null);

                return {
                    success: true,
                    conversationId: result.conversationId,
                    conversationRecordKey: result.conversationRecordKey,
                    messageId: result.messageId,
                    messageRecordKey: result.messageRecordKey,
                    conversation: result.conversation,
                    message: result.message,
                    error: result.error,
                };
            }

            return {
                success: false,
                error: result.error || new Error("Failed to save conversation or message"),
            };
        } catch (error) {
            console.error("Error saving new conversation:", error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }, [saveConversationAndMessage]);

    const newMessage = useMemo(() => {
        return messageCrud.message;
    }, [messageCrud.message]);

    useEffect(() => {
        if (isParentLoadingRef.current) return;
        if (!isChatReady) return;
        if (isConversationReady && isMessageReady) {
            setIsChatLoading(false);
        }
    }, [isChatReady, isConversationReady, isMessageReady, isParentLoadingRef.current]);

    useEffect(() => {
        if (VERBOSE) {
            console.log("💥 useChatRelationship 💥");

            console.log("- isChatLoading:", isChatLoading);
            console.log("- isRelationshipLoading:", isRelationshipLoading);

            console.log("- isChatReady:", isChatReady);
            console.log("- isConversationReady:", isConversationReady);
            console.log("- isMessageReady:", isMessageReady);

            console.log("- convoId:", convoId);
            console.log("- conversationId:", conversationId);

            console.log("- isNewChat:", isNewChat);

            console.log("- activeConversation:", activeConversation);
            console.log("- chatMessages:", chatMessages);
            console.log("- newMessageId:", newMessageId);
            console.log("- matchingChildRecordsCount:", matchingChildRecordsCount);
            console.log("- newMessage:", newMessage);
            console.log("💥 ========================== 💥");
        }
    }, [
        convoId,
        conversationId,
        isNewChat,
        isChatReady,
        isConversationReady,
        isMessageReady,
        isChatLoading,
        activeConversation,
        chatMessages,
        newMessageId,
        matchingChildRecordsCount,
    ]);

    return {
        isChatLoading,
        activeConversation,
        conversationId,
        chatMessages,
        createNewMessage,
        saveMessage,
        newMessageId,
        saveNewConversation,
        isNewChat,
        newMessage,

        conversationCrud,
        messageCrud,
    };
}
