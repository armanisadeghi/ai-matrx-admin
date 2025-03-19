import { SocketManager } from "@/lib/redux/socket/manager";

export interface TaskData {
    getTask(): any;
}

export interface StreamOptions<T = any> {
    onUpdate?: (chunk: string, fullText: string) => void;
    onError?: (error: string, isFatal: boolean) => void;
    onComplete?: (fullText: string) => void;
    onInfo?: (status: string, message: string, data?: any) => void;
    overrides?: T;
}

export class BaseTaskManager<TData extends TaskData, TOverrides = any> {
    protected socketManager: SocketManager;

    // These will be overridden by child classes
    protected readonly SERVICE: string;
    protected readonly TASK: string;

    constructor(serviceName: string, taskName: string) {
        this.socketManager = SocketManager.getInstance();
        this.SERVICE = serviceName;
        this.TASK = taskName;
    }

    async sendTasks(tasks: TData[]): Promise<string[]> {
        try {
            const taskArray = tasks.map((task) => task.getTask());

            await new Promise<void>((resolve, reject) => {
                this.socketManager.getSocket().emit(this.SERVICE, taskArray, (response: any) => {
                    if (response?.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve();
                    }
                });
            });

            return taskArray.map((task) => {
                const sid = this.socketManager.getSocket().id;
                return `${sid}_${this.TASK}_${task.index}`;
            });
        } catch (error) {
            console.error(`[${this.constructor.name}] Failed to run tasks:`, error);
            throw error;
        }
    }

    async sendTask(task: TData): Promise<string> {
        const eventNames = await this.sendTasks([task]);
        return eventNames[0];
    }

    streamTask(task: TData, options: StreamOptions<TOverrides> = {}): [() => void, () => string] {
        let fullText = "";
        let unsubscribe: (() => void) | null = null;

        try {
            const sid = this.socketManager.getSocket().id;
            const taskObj = task.getTask();
            const eventName = `${sid}_${this.TASK}_${taskObj.index}`;

            unsubscribe = this.socketManager.subscribeToEvent(eventName, (response: any) => {
                console.log(response); // Debug log

                // Handle info messages
                if (response?.info) {
                    const { status, message, data } = response.info;
                    console.log(`[STREAM] Info: ${status} - ${message}`);
                    options.onInfo?.(status, message, data);
                    return;
                }

                // Check for the explicit end signal
                if (response?.end === true || response?.end === "true" || response?.end === "True") {
                    console.log(`[STREAM] Stream ended for ${eventName}`);
                    options.onComplete?.(fullText);
                    if (unsubscribe) {
                        unsubscribe(); // Clean up subscription
                        unsubscribe = null;
                    }
                    return;
                }

                // Process data field (chunks, errors)
                if (response?.data !== undefined) {
                    const data = response.data;

                    // Check for error statuses within data
                    if (data && typeof data === "object" && data.status) {
                        if (data.status === "fatal_error") {
                            console.error(`[STREAM] Fatal error for ${eventName}: ${data.message}`);
                            options.onError?.(data.message, true);
                            if (unsubscribe) {
                                unsubscribe();
                                unsubscribe = null;
                            }
                        } else if (data.status === "non_fatal_error") {
                            console.warn(`[STREAM] Non-fatal error for ${eventName}: ${data.message}`);
                            options.onError?.(data.message, false);
                        }
                        return;
                    }

                    // Handle regular data chunks
                    let chunk = data;
                    if (typeof data === "string" || data === null) {
                        chunk = data;
                    } else {
                        console.warn(`[STREAM] Unexpected data format for ${eventName}:`, data);
                        return;
                    }

                    // Only append non-null data (skip null from end signal)
                    if (chunk !== null) {
                        fullText += chunk;
                        options.onUpdate?.(chunk, fullText);
                    }
                } else if (typeof response === "string") {
                    // Fallback for raw string responses (unlikely with your server setup)
                    fullText += response;
                    options.onUpdate?.(response, fullText);
                } else {
                    console.warn(`[STREAM] Unexpected response format for ${eventName}:`, response);
                }
            });

            this.sendTask(task).catch((err) => {
                const errorMessage = err instanceof Error ? err.message : "An error occurred";
                console.error(`[STREAM] Task submission failed for ${eventName}:`, errorMessage);
                options.onError?.(errorMessage, true); // Treat submission errors as fatal
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            console.error(`[STREAM] Initialization failed:`, errorMessage);
            options.onError?.(errorMessage, true); // Treat initialization errors as fatal
        }

        return [
            () => {
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
            },
            () => fullText,
        ];
    }

    streamTaskAsync(task: TData, options: Omit<StreamOptions<TOverrides>, "onComplete"> = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            const [cleanup, _] = this.streamTask(task, {
                ...options,
                onComplete: (fullText) => {
                    cleanup();
                    resolve(fullText);
                },
                onError: (error) => {
                    cleanup();
                    reject(new Error(error));
                },
            });
        });
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}
