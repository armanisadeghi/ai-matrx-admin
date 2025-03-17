import { SocketManager } from "../manager";
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

    /**
     * Sends multiple user messages and returns the event names
     */
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

    /**
     * Sends a single user message and returns the event name
     */
    async sendUserMessage(task: AiChatTaskData): Promise<string> {
        const eventNames = await this.sendUserMessages([task]);
        return eventNames[0];
    }

    /**
     * Streams a message with automatic event handling
     * Returns a cleanup function and the current response
     */
    streamMessage(
        conversationId: string, 
        message: Message, 
        options: StreamOptions = {}
    ): [() => void, () => string] {
        let fullText = '';
        let unsubscribe: (() => void) | null = null;
        
        // Create task data
        const taskData = new AiChatTaskData(conversationId, 0)
            .setMessage(message);
            
        if (options.modelOverride) {
            taskData.setModelOverride(options.modelOverride);
        }
        
        if (options.modeOverride) {
            taskData.setModeOverride(options.modeOverride);
        }
        
        // Pre-calculate the event name before sending
        const sid = this.socketManager.getSocket().id;
        const taskObj = taskData.getTask();
        const eventName = `${sid}_${ChatTaskManager.TASK}_${taskObj.index}`;

        // Set up event subscription first
        unsubscribe = this.socketManager.subscribeToEvent(eventName, (response: any) => {
            let chunk = '';
            
            if (response?.data) {
                chunk = response.data;
            } else if (typeof response === "string") {
                chunk = response;
            } else {
                return; // No valid data to process
            }
            
            fullText += chunk;
            options.onUpdate?.(chunk, fullText);
            
            // Check if this is the end of the stream (could be enhanced with a more reliable method)
            if (response?.end || response?.done) {
                options.onComplete?.(fullText);
            }
        });
        
        // Send the message after subscription is ready
        this.sendUserMessage(taskData).catch(err => {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            options.onError?.(errorMessage);
            
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
        });
        
        // Return cleanup function and a way to get the current response
        return [
            () => {
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
            },
            () => fullText
        ];
    }

    /**
     * Enhanced method that handles the entire process and returns a Promise
     * This is useful when you want to wait for the complete response
     */
    streamMessageAsync(
        conversationId: string, 
        message: Message, 
        options: Omit<StreamOptions, 'onComplete'> = {}
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const [cleanup, _] = this.streamMessage(
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
        });
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}