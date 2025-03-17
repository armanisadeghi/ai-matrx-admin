// lib/redux/socket/chat-task-data.ts
import { SocketManager } from "../manager";
import { ChatMode, Message, MessageMetadata } from "@/types/chat/chat.types";

interface MessageObject {
    id?: string;
    conversation_id?: string;
    content?: string;
    role?: string;
    type?: string;
    metadata?: MessageMetadata;
    files?: any[];
}

interface AiChat {
    conversation_id: string;
    message_object: MessageObject;
    model_override?: string;
    mode_override?: ChatMode;
}

interface AiChatTask {
    task: string;
    index: number;
    stream: boolean;
    taskData: AiChat;
}

export class AiChatTaskData {
    private conversationId: string;
    private message: any;
    private modelOverride: string;
    private modeOverride: ChatMode;
    private index: number;
    private socketManager: SocketManager;

    constructor(conversationId: string, index: number = 0) {
        this.socketManager = SocketManager.getInstance();
        this.conversationId = conversationId;
        this.index = index;
    }

    setMessage(message: Message): this {
        this.message = {
            id: message.id,
            conversation_id: message.conversationId,
            content: message.content,
            role: message.role,
            type: message.type,
            metadata: message.metadata,
            files: message.metadata?.files,
        };
        return this;
    }

    setModelOverride(modelOverride: string): this {
        this.modelOverride = modelOverride;
        return this;
    }

    setModeOverride(modeOverride: ChatMode): this {
        this.modeOverride = modeOverride;
        return this;
    }

    getTask(): AiChatTask {
        return {
            task: "ai_chat",
            index: this.index,
            stream: true,
            taskData: {
                conversation_id: this.conversationId,
                message_object: this.message,
                model_override: this.modelOverride,
                mode_override: this.modeOverride,
            },
        };
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}
