import { Message, ChatMode } from "@/types/chat/chat.types";
import { BaseTaskManager, StreamOptions } from "@/lib/redux/socket/task-managers/BaseTaskManager";
import { AiChatTaskData } from "@/lib/redux/socket/chat-class/ChatTaskData";
import { AppDispatch } from "@/lib/redux";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";

export interface ChatOverrides {
    modelOverride?: string;
    modeOverride?: ChatMode;
}

interface streamMessageParams {
    conversationId: string;
    message: Message;
    overrides?: ChatOverrides;
}

export class ChatTaskManager extends BaseTaskManager<AiChatTaskData, ChatOverrides> {
    private chatActions = getChatActionsWithThunks();
    private activeEventName: string | null = null;
    private isStreaming = false;


    constructor(private dispatch?: AppDispatch) {
        super("chat_service", "ai_chat");
    }

    
    private createTaskData(conversationId: string, message: Message, overrides?: ChatOverrides): AiChatTaskData {
        const taskData = new AiChatTaskData(conversationId, 0).setMessage(message);
        if (overrides?.modelOverride) taskData.setModelOverride(overrides.modelOverride);
        if (overrides?.modeOverride) taskData.setModeOverride(overrides.modeOverride);
        return taskData;
    }

    private setSocketEventName(eventName: string): void {
        if (this.dispatch && this.chatActions) {
            this.dispatch(this.chatActions.setSocketEventName({ eventName }));
        }
    }

    private setIsStreaming(): void {
        if (this.dispatch && this.chatActions) {
            this.dispatch(this.chatActions.setIsStreaming());
        }
    }

    private setIsNotStreaming(): void {
        if (this.dispatch && this.chatActions) {
            this.dispatch(this.chatActions.setIsNotStreaming());
        }
    }

    async streamMessage(params: streamMessageParams): Promise<string> {
        const { conversationId, message, overrides } = params;
        const taskData = this.createTaskData(conversationId, message, overrides);
        this.setIsStreaming();
        const eventName = await this.streamTask(taskData);
        this.activeEventName = eventName;
        this.setSocketEventName(eventName);        
        return eventName;
    }

    async subscribeToChat(options: StreamOptions<ChatOverrides> = {}): Promise<() => void> {
        const unsubscribe = await this.subscribeToResponses(0, options);
        return unsubscribe;
    }
}