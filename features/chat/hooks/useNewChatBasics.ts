import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { useFileManagement } from "@/hooks/ai/chat/useFileManagement";
import { createChatSelectors } from "@/lib/redux/entity/custom-selectors/chatSelectors";
import { useAppSelector } from "@/lib/redux";

const DEBUG = false;


export const useChatBasics = () => {
    const chatActions = getChatActionsWithThunks();
    const chatSelectors = createChatSelectors();
    const conversationId = useAppSelector(chatSelectors.activeConversationId)
    const conversationKey = useAppSelector(chatSelectors.activeConversationKey)
    const messageId = useAppSelector(chatSelectors.activeMessageId)
    const messageKey = useAppSelector(chatSelectors.activeMessageKey)
    const eventName = useAppSelector(chatSelectors.conversationSocketEventName)

    const initialLoadComplete = useAppSelector(chatSelectors.initialLoadComplete)
    const routeLoadComplete = useAppSelector(chatSelectors.routeLoadComplete)

    const fileManager = useFileManagement({
        onFilesUpdate: (files) => chatActions.updateFiles({ value: files.map((file) => file.url) }),
    });

    if (DEBUG) {console.log("useChatBasics", {
            conversationId,
            messageId,
            conversationKey,
            messageKey,
            initialLoadComplete,
            routeLoadComplete,
        });
    }



    return {
        fileManager,
        chatActions,
        chatSelectors,
        conversationId,
        conversationKey,
        messageId,
        messageKey,
        initialLoadComplete,
        routeLoadComplete,
        eventName,
    };
};

export default useChatBasics;
