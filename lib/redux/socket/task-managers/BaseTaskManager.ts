import { SocketManager } from "@/lib/redux/socket/manager";

export interface TaskData {
    getTask(): any;
}

export interface StreamOptions<T = any> {
    onUpdate?: (chunk: string, fullText: string) => void;
    onError?: (error: string, isFatal: boolean) => void;
    onComplete?: (fullText: string) => void;
    onInfo?: (status: string, message: string, data?: any) => void;
}

export class BaseTaskManager<TData extends TaskData, TOverrides = any> {
    protected socketManager: SocketManager;
    protected readonly SERVICE: string;
    protected readonly TASK: string;
    private listenerSet: boolean = false;
    private isClientSide: boolean = typeof window !== "undefined";

    constructor(serviceName: string, taskName: string) {
        this.socketManager = SocketManager.getInstance();
        this.SERVICE = serviceName;
        this.TASK = taskName;
        if (this.isClientSide) {
            this.socketManager.connect().catch((err) => {
                console.error(`[${this.constructor.name}] Failed to connect socket:`, err);
            });
        }
    }

    private async getEventName(task: any): Promise<string> {
        if (!this.isClientSide) {
            return `${this.TASK}_${task.index}`;
        }
        const socket = await this.socketManager.getSocket();
        const sid = socket ? socket.id : "pending";
        return `${sid}_${this.TASK}_${task.index}`;
    }

    async sendTasks(tasks: TData[]): Promise<string[]> {
        if (!this.isClientSide) {
            return tasks.map((task) => `${this.TASK}_${task.getTask().index || 0}`);
        }
        const taskArray = tasks.map((task) => task.getTask());
        try {
            return await this.socketManager.createTask(this.SERVICE, taskArray);
        } catch (error) {
            console.error(`[${this.constructor.name}] Failed to send tasks:`, error);
            return [];
        }
    }

    async sendTask(task: TData): Promise<string> {
        const [eventName] = await this.sendTasks([task]);
        return eventName;
    }

    async streamTask(task: TData): Promise<string> {
        const taskObj = task.getTask();
        const eventName = await this.getEventName(taskObj);
        if (this.isClientSide) {
            this.sendTask(task).catch((err) => {
                console.error(`[${this.constructor.name}] Failed to stream task:`, err);
            });
        }
        return eventName;
    }

    async subscribeToResponses(taskIndex: number, options: StreamOptions<TOverrides> = {}): Promise<() => void> {
        if (!this.isClientSide) {
            return () => {};
        }
        if (this.listenerSet) {
            throw new Error("Listener already set for this task manager instance");
        }

        const socket = await this.socketManager.getSocket();
        const sid = socket ? socket.id : "pending";
        const eventName = `${sid}_${this.TASK}_${taskIndex}`;
        let fullText = "";

        const unsubscribe = this.socketManager.subscribeToEvent(eventName, (response: any) => {
            // if (response?.info) {
            //     options.onInfo?.(response.info.status, response.info.message, response.info.data);
            //     return;
            // }

            if (response?.end === true || response?.end === "true" || response?.end === "True") {
                options.onComplete?.(fullText);
                fullText = "";
                return;
            }

            if (response?.data !== undefined) {
                const data = response.data;
                if (data?.status === "fatal_error") {
                    options.onError?.(data.message, true);
                    fullText = "";
                    return;
                } else if (data?.status === "non_fatal_error") {
                    options.onError?.(data.message, false);
                    return;
                } else if (data?.info) {
                    options.onInfo?.(data.info.status, data.info.message, data.info.data);
                    return;
                }

                const chunk = typeof data === "string" || data === null ? data : null;
                if (chunk !== null) {
                    fullText += chunk;
                    options.onUpdate?.(chunk, fullText);
                }
            } else if (typeof response === "string") {
                fullText += response;
                options.onUpdate?.(response, fullText);
            }
        });

        this.listenerSet = true;
        return () => {
            unsubscribe();
            this.listenerSet = false;
        };
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}