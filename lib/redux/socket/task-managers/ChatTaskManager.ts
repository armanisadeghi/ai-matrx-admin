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

  async sendUserMessages(tasks: AiChatTaskData[]): Promise<string[]> {
    return this.sendTasks(tasks);
  }

  async sendUserMessage(task: AiChatTaskData): Promise<string> {
    return this.sendTask(task);
  }
  

  streamMessage(
    conversationId: string,
    message: Message,
    options: StreamOptions<ChatOverrides> = {}
  ): [() => void, () => string] {
    const taskData = new AiChatTaskData(conversationId, 0)
      .setMessage(message);
    
    if (options.overrides?.modelOverride) {
      taskData.setModelOverride(options.overrides.modelOverride);
    }
    
    if (options.overrides?.modeOverride) {
      taskData.setModeOverride(options.overrides.modeOverride);
    }
    
    return this.streamTask(taskData, options);
  }
  

  streamMessageAsync(
    conversationId: string,
    message: Message,
    options: Omit<StreamOptions<ChatOverrides>, 'onComplete'> = {}
  ): Promise<string> {
    const taskData = new AiChatTaskData(conversationId, 0)
      .setMessage(message);
    
    if (options.overrides?.modelOverride) {
      taskData.setModelOverride(options.overrides.modelOverride);
    }
    
    if (options.overrides?.modeOverride) {
      taskData.setModeOverride(options.overrides.modeOverride);
    }
    
    return this.streamTaskAsync(taskData, options);
  }
}