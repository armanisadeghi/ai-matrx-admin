import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useChatSocket, UseChatSocketResult } from "@/lib/redux/socket/task-managers/hooks/useChatSocket";

// Define the context type
interface AiChatContextType {
    conversationId: string;
    setConversationId: (id: string) => void;
    chatSocket: UseChatSocketResult | null;
}

const NEW_CONVERSATION_ID = "new-conversation";

// Create the context with default values
const AiChatContext = createContext<AiChatContextType>({
    conversationId: NEW_CONVERSATION_ID,
    setConversationId: () => {},
    chatSocket: null,
});

// Provider props interface
interface AiChatProviderProps {
    children: ReactNode;
    initialConversationId?: string;
}

export const AiChatProvider: React.FC<AiChatProviderProps> = ({ children, initialConversationId = "" }) => {
    const [conversationId, setConversationId] = useState<string>(initialConversationId);

    const chatSocket = useChatSocket({ initialConversationId: conversationId });


    const value = {
        conversationId,
        setConversationId,
        chatSocket,
    };

    return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
};

// Custom hook to use the AI chat context
export const useAiChat = () => {
    const context = useContext(AiChatContext);

    if (context === undefined) {
        throw new Error("useAiChat must be used within an AiChatProvider");
    }

    return context;
};
