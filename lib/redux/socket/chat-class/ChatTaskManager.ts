// lib/redux/socket/recipe-task-manager.ts
import { SocketManager } from "../manager";
import { AiChatTaskData } from "./ChatTaskData";

export class ChatTaskManager {
    private static readonly SERVICE = "chat_service";
    private static readonly TASK = "ai_chat";
    private socketManager: SocketManager;

    constructor() {
        this.socketManager = SocketManager.getInstance();
    }

    async sendUserMessages(tasks: AiChatTaskData[]): Promise<string[]> {
        try {
            const taskArray = tasks.map((task) => task.getTask());

            await new Promise<void>((resolve, reject) => {
                this.socketManager.getSocket().emit(ChatTaskManager.SERVICE, taskArray, (response: any) => {
                    if (response?.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve();
                    }
                });
            });

            return taskArray.map((task) => {
                const sid = this.socketManager.getSocket().id;
                return `${sid}_${ChatTaskManager.TASK}_${task.index}`;
            });
        } catch (error) {
            console.error("[CHAT TASK MANAGER] Failed to run tasks:", error);
            throw error;
        }
    }

    async sendUserMessage(task: AiChatTaskData): Promise<string> {
        const eventNames = await this.sendUserMessages([task]);
        return eventNames[0];
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}
