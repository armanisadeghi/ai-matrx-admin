// lib/redux/socket/chat-task-data.ts
import { BaseTaskData } from "./base";
import { ChatMode, Message } from "@/types/chat/chat.types";

interface AiChat {
    conversation_id: string;
    message_object: any;
    model_override?: string;
    mode_override?: ChatMode;
}

export class AiChatTaskData extends BaseTaskData {
    private modeOverride?: ChatMode;

    constructor(conversationId: string, index: number = 0) {
        super("ai_chat", index);
        this.setConversationId(conversationId);
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

    setModeOverride(modeOverride: ChatMode): this {
        this.modeOverride = modeOverride;
        return this;
    }

    protected buildTaskData(): Record<string, any> {
        return {
            conversation_id: this.conversationId,
            message_object: this.message,
            model_override: this.modelOverride,
            mode_override: this.modeOverride,
        };
    }
}