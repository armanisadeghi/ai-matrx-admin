import { Message, ChatMode } from "@/types/chat/chat.types";
import { BaseTaskManager, StreamOptions } from "@/lib/redux/socket/task-managers/BaseTaskManager";
import { AiChatTaskData } from "@/lib/redux/socket/chat-class/ChatTaskData";
import { callbackManager } from "@/utils/callbackManager";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";

export interface ChatOverrides {
    modelOverride?: string;
    modeOverride?: ChatMode;
}

export interface SaveCallbackResult {
    success: boolean;
    entityName?: string;
    result?: {
        tempRecordId: string;
        recordKey: string;
        data: any;
    };
    requestData?: any;
    originalPayload?: any;
    error?: Error;
}

export class ChatTaskManager extends BaseTaskManager<AiChatTaskData, ChatOverrides> {
    constructor() {
        super("chat_service", "ai_chat");
    }

    private chatActions = getChatActionsWithThunks();
    private setActiveConversation = this.chatActions.setActiveConversation;
    private setSocketEventName = this.chatActions.setSocketEventName;

    private createTaskData(conversationId: string, message: Message, overrides?: ChatOverrides): AiChatTaskData {
        const taskData = new AiChatTaskData(conversationId, 0).setMessage(message);
        console.log("📣 ~ createTaskData ~ taskData:", JSON.stringify(taskData, null, 2));
        if (overrides?.modelOverride) taskData.setModelOverride(overrides.modelOverride);
        if (overrides?.modeOverride) taskData.setModeOverride(overrides.modeOverride);
        return taskData;
    }

    async streamMessage(conversationId: string, message: Message, overrides?: ChatOverrides): Promise<string> {
        console.log("📣 ~ streamMessage ~ params:", JSON.stringify({ conversationId, message, overrides }, null, 2));
        const taskData = this.createTaskData(conversationId, message, overrides);
        console.log("📣 ~ streamMessage ~ taskData:", JSON.stringify(taskData, null, 2));
        const eventName = await this.streamTask(taskData)[0]
        console.log("✅ ~ streamMessage ~ eventName:", eventName);
        this.setSocketEventName({ eventName });

        return eventName;
    }

    async subscribeToChat(options: StreamOptions<ChatOverrides> = {}): Promise<() => void> {
        const unsubscribe = await this.subscribeToResponses(0, options);
        return unsubscribe;
    }

    async streamOnSuccess(callbackId: string, overrides?: ChatOverrides): Promise<string> {
        return new Promise((resolve, reject) => {
            const successHandler = (data: SaveCallbackResult) => {
                try {
                    const { result } = data;
                    console.log("🚀 ~ successHandler ~ result:", JSON.stringify(result));

                    if (!result?.data) {
                        throw new Error("Missing result data in callback response");
                    }

                    const conversationId = result.data.conversationId;
                    console.log("Conversation ID:", conversationId);
                    this.setActiveConversation(conversationId);
                    const message = result.data;
                    console.log("Message:", message);

                    if (!conversationId || !message) {
                        throw new Error("Missing required conversationId or message in callback data");
                    }

                    this.streamMessage(conversationId, message as Message, overrides)
                        .then((eventName) => resolve(eventName))
                        .catch((err) => reject(err));
                } catch (error) {
                    reject(error);
                }
            };

            const subscribed = callbackManager.subscribe(callbackId, successHandler);

            if (!subscribed) {
                reject(new Error(`Failed to subscribe to callback ${callbackId}`));
            }
        });
    }
}