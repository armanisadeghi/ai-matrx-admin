import { ChatMode, Conversation, Message } from "@/types/chat/chat.types";
import { FilterCondition, SelectionMode } from "@/lib/redux/entity/types/stateTypes";
import { EntityKeys } from "@/types/entityTypes";
import { EntityAnyFieldKey } from "@/types/entityTypes";
import { MessageRecordWithKey } from "@/types";

export interface CreateNewConversationParams {
    label?: string;
    currentModel?: string;
    currentMode?: ChatMode;
    initialMessage?: string;
    conversationData?: any;
    messageData?: Partial<MessageRecordWithKey>;
}


export const BACKGROUND_PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2' viewBox='0 0 2 2'%3E%3Cpath fill='%23999' fill-opacity='0.07' d='M1 1h0.5v0.5H1V1z'%3E%3C/path%3E%3C/svg%3E\")";
export const DEFAULT_ADVANCED_MODEL_ID = "49848d52-9cc8-4ce4-bacb-32aa2201cd10";
export const DEFAULT_MODEL_ID = "dd45b76e-f470-4765-b6c4-1a275d7860bf";
export const DEFAULT_ENDPOINT_ID = "4bedf336-b274-4cdb-8202-59fd282ae6a0";

export const DEFAULT_GPT_MODEL_ID = "dd45b76e-f470-4765-b6c4-1a275d7860bf";
export const DEFAULT_FAST_MODEL_ID = "325408aa-fd5b-4876-9410-2bf34757b9d8";
export const DEFAULT_MODE = "general" as ChatMode;
export const NEW_CONVERSATION_ID = "new-conversation";
export const NEW_CONVERSATION_LABEL = "New Conversation";

export const CHAT_RELATIONSHIP_BASE_CONFIG = {
    parentEntity: "conversation" as EntityKeys,
    childEntity: "message" as EntityKeys,
    parentReferenceField: "id" as EntityAnyFieldKey<EntityKeys>,
    childReferenceField: "conversationId" as EntityAnyFieldKey<EntityKeys>,
    additionalFilters: [
        {
            field: "display_order",
            operator: "neq",
            value: 0,
        },
        {
            field: "role",
            operator: "neq",
            value: "system",
        },
    ] as FilterCondition[],
};
    

export const CHAT_CREATE_BASE_CONFIG = {
    setActiveConversation: true,
    setActiveMessage: true,
    conversationSelectionMode: "single" as SelectionMode,
    messageSelectionMode: "multiple" as SelectionMode,
};


export const NEW_CHAT_PARAMS = {
    label: NEW_CONVERSATION_LABEL,
    currentModel: DEFAULT_MODEL_ID,
    currentMode: DEFAULT_MODE,
    conversationData: {},
    initialMessage: "",
    messageData: {},
} as CreateNewConversationParams;


export const DEFAULT_CONVERSATION: Conversation = {
    id: "",
    label: "",
    isPublic: false,
    metadata: {
        currentModel: DEFAULT_MODEL_ID,
        currentEndpoint: DEFAULT_ENDPOINT_ID,
        currentMode: DEFAULT_MODE,
        concurrentRecipes: [],
        brokerValues: {},
        availableTools: [],
        ModAssistantContext: "",
        ModUserContext: "",
    },
};
export const DEFAULT_FIRST_MESSAGE: Partial<Message> = {
    id: "",
    role: "user",
    content: "",
    type: "text",
    displayOrder: 1,
    systemOrder: 2,
    metadata: {
        brokerValues: {},
        availableTools: [],
        ModAssistantContext: "",
        ModUserContext: "",
        files: [],
    },
    isPublic: false,
};

export const DEFAULT_NEW_MESSAGE: Partial<Message> = {
    id: "",
    role: "user",
    content: "",
    type: "text",
    metadata: {
        brokerValues: {},
        availableTools: [],
        ModAssistantContext: "",
        ModUserContext: "",
        files: [],
    },
    isPublic: false,
};

