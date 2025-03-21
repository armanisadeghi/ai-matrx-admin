import { Message, ChatMode } from "@/types/chat/chat.types";
import { BaseTaskManager, StreamOptions } from "@/lib/redux/socket/task-managers/BaseTaskManager";
import { AiChatTaskData } from "@/lib/redux/socket/chat-class/ChatTaskData";

interface ChatOverrides {
    modelOverride?: string;
    modeOverride?: ChatMode;
}

export class ChatTaskManager extends BaseTaskManager<AiChatTaskData, ChatOverrides> {
    constructor() {
        super("chat_service", "ai_chat");
    }

    private createTaskData(conversationId: string, message: Message, overrides?: ChatOverrides): AiChatTaskData {
        const taskData = new AiChatTaskData(conversationId, 0).setMessage(message);
        if (overrides?.modelOverride) taskData.setModelOverride(overrides.modelOverride);
        if (overrides?.modeOverride) taskData.setModeOverride(overrides.modeOverride);
        return taskData;
    }

    async streamMessage(conversationId: string, message: Message, overrides?: ChatOverrides): Promise<string> {
        const taskData = this.createTaskData(conversationId, message, overrides);
        const eventName = await this.streamTask(taskData); // Await the async streamTask
        return eventName;
    }

    async subscribeToChat(options: StreamOptions<ChatOverrides> = {}): Promise<() => void> {
        const unsubscribe = await this.subscribeToResponses(0, options); // Await the async subscribeToResponses
        return unsubscribe;
    }
}