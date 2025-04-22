import { SocketManager } from "../SocketManager";
import { AiChatTaskData } from "./ChatTaskData";
import { Message, ChatMode } from "@/types/chat/chat.types";

type StreamUpdateCallback = (text: string, fullText: string) => void;
type ErrorCallback = (error: string) => void;

interface StreamOptions {
  onUpdate?: StreamUpdateCallback;
  onError?: ErrorCallback;
  onComplete?: (fullText: string) => void;
  modelOverride?: string;
  modeOverride?: ChatMode;
}

export class ChatTaskManager {
    private static readonly SERVICE = "chat_service";
    private static readonly TASK = "ai_chat";
    private socketManager: SocketManager;

    constructor() {
        this.socketManager = SocketManager.getInstance();
    }

    async sendUserMessages(tasks: AiChatTaskData[]): Promise<string[]> {
        try {
            const socket = await this.socketManager.getSocket();
            if (!socket) {
                throw new Error("Socket connection unavailable");
            }

            const taskArray = tasks.map((task) => task.getTask());

            await new Promise<void>((resolve, reject) => {
                socket.emit(ChatTaskManager.SERVICE, taskArray, (response: any) => {
                    if (response?.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve();
                    }
                });
            });

            const sid = socket.id || "pending";
            return taskArray.map((task) => `${sid}_${ChatTaskManager.TASK}_${task.index}`);
        } catch (error) {
            console.error("[CHAT TASK MANAGER] Failed to run tasks:", error);
            throw error;
        }
    }

    async sendUserMessage(task: AiChatTaskData): Promise<string> {
        const eventNames = await this.sendUserMessages([task]);
        return eventNames[0];
    }

    async streamMessage(
        conversationId: string, 
        message: Message, 
        options: StreamOptions = {}
    ): Promise<[() => void, () => string]> {
        let fullText = '';
        let unsubscribe: (() => void) | null = null;
        
        try {
            const socket = await this.socketManager.getSocket();
            if (!socket) {
                throw new Error("Socket connection unavailable");
            }

            // Create task data
            const taskData = new AiChatTaskData(conversationId, 0)
                .setMessage(message);
                
            if (options.modelOverride) {
                taskData.setModelOverride(options.modelOverride);
            }
            
            if (options.modeOverride) {
                taskData.setModeOverride(options.modeOverride);
            }
            
            const taskObj = taskData.getTask();
            const eventName = `${socket.id || 'pending'}_${ChatTaskManager.TASK}_${taskObj.index}`;

            // Set up event subscription
            unsubscribe = this.socketManager.subscribeToEvent(eventName, (response: any) => {
                let chunk = '';
                
                if (response?.data) {
                    chunk = response.data;
                } else if (typeof response === "string") {
                    chunk = response;
                } else {
                    return;
                }
                
                fullText += chunk;
                options.onUpdate?.(chunk, fullText);
                
                if (response?.end || response?.done) {
                    options.onComplete?.(fullText);
                }
            });
            
            // Send the message
            await this.sendUserMessage(taskData);
            
            return [
                () => {
                    if (unsubscribe) {
                        unsubscribe();
                        unsubscribe = null;
                    }
                },
                () => fullText
            ];
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            options.onError?.(errorMessage);
            
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
            throw err;
        }
    }

    streamMessageAsync(
        conversationId: string, 
        message: Message, 
        options: Omit<StreamOptions, 'onComplete'> = {}
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const [cleanup] = await this.streamMessage(
                    conversationId,
                    message,
                    {
                        ...options,
                        onComplete: (fullText) => {
                            cleanup();
                            resolve(fullText);
                        },
                        onError: (error) => {
                            cleanup();
                            reject(new Error(error));
                        }
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}