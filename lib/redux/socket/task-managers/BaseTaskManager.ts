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
    private listenerSet: Set<string> = new Set();
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

    private async getEventNames(task: any): Promise<string[] | null> {
        const taskData = { ...task, task: this.TASK };
        try {
            const eventNames = await this.socketManager.createTask(this.SERVICE, [taskData]);
            if (!eventNames.length) {
                console.warn(`[${this.constructor.name}] Server returned no event names`);
                return null;
            }
            return eventNames;
        } catch (error) {
            console.error(`[${this.constructor.name}] Failed to get event names:`, error);
            return null;
        }
    }

    async sendTasks(tasks: TData[]): Promise<string[] | null> {
        if (!this.isClientSide) {
            console.warn(`[${this.constructor.name}] Tasks cannot be sent server-side`);
            return null;
        }
        
        const taskArray = tasks.map((task) => ({ ...task.getTask(), task: this.TASK }));
        try {
            const eventNames = await this.socketManager.createTask(this.SERVICE, taskArray);
            if (!eventNames.length) {
                console.warn(`[${this.constructor.name}] Server returned no event names`);
                return null;
            }
            return eventNames;
        } catch (error) {
            console.error(`[${this.constructor.name}] Failed to send tasks:`, error);
            return null;
        }
    }

    async sendTask(task: TData): Promise<string[] | null> {
        console.log("-> BaseTaskManager sendTask task", task);
        return this.sendTasks([task]);
    }

    async streamTask(task: TData): Promise<string[] | null> {
        return this.sendTasks([task]);
    }

    async subscribeToResponses(taskIndex: number, options: StreamOptions<TOverrides> = {}): Promise<() => void> {
        const task = { index: taskIndex };
        const eventNames = await this.getEventNames(task);

        if (!eventNames) {
            console.warn(`[${this.constructor.name}] No event names for subscription, skipping`);
            return () => {};
        }

        const newEventNames = eventNames.filter((name) => !this.listenerSet.has(name));
        if (!newEventNames.length && this.listenerSet.size > 0) {
            console.warn(`[${this.constructor.name}] Listeners already set for this task`);
            return () => {};
        }

        let fullText = "";
        const unsubscribers: Array<() => void> = [];

        newEventNames.forEach((eventName) => {
            const unsubscribe = this.socketManager.subscribeToEvent(eventName, (response: any) => {
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

            this.listenerSet.add(eventName);
            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach((unsub) => unsub());
            newEventNames.forEach((name) => this.listenerSet.delete(name));
        };
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}