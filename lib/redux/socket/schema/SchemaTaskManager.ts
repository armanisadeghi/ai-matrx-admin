// lib/redux/socket/task-managers/SchemaTaskManager.ts
import { BaseTaskManager, StreamOptions } from "@/lib/redux/socket/task-managers/BaseTaskManager";
import { BaseTaskData } from "@/lib/redux/socket/schema/task-base";
import { Schema, SOCKET_TASKS, SERVICE_NAMES } from "@/constants/socket-constants";

export interface TaskData {
    getTask(): { task: string; index: number; stream: boolean; taskData: Record<string, any> };
}

export class SchemaTaskData extends BaseTaskData implements TaskData {
    constructor(taskName: string, index: number = 0) {
        super(taskName, index);
    }

    protected buildTaskData(): Record<string, any> {
        return { ...this.data };
    }
}

export class SchemaTaskManager extends BaseTaskManager<SchemaTaskData, Record<string, any>> {
    protected readonly SERVICE: string;
    protected readonly TASK: string;
    private schema: Schema;

    constructor(serviceName: (typeof SERVICE_NAMES)[number], taskName: string) {
        super(serviceName, taskName);
        this.SERVICE = serviceName;
        this.TASK = taskName;

        this.schema = SOCKET_TASKS[taskName] || {};
        if (!this.schema) {
            console.warn(`No schema found for task: ${taskName}`);
        }
    }

    createTask(index: number = 0): SchemaTaskBuilder {
        return new SchemaTaskBuilder(this.TASK, this.schema, this, index);
    }
    
}

export class SchemaTaskBuilder {
    private taskData: SchemaTaskData;
    private manager: SchemaTaskManager;
    private schema: Schema;

    constructor(taskName: string, schema: Schema, manager: SchemaTaskManager, index: number = 0) {
        this.taskData = new SchemaTaskData(taskName, index);
        this.schema = schema;
        this.manager = manager;
    }

    setArg(name: string, value: any): this {
        this.taskData.setArg(name, value);
        return this;
    }

    send(): Promise<string> {
        this.validateRequiredFields();
        return this.manager.sendTask(this.taskData);
    }

    sendMultiple(tasks: SchemaTaskBuilder[]): Promise<string[]> {
        tasks.forEach((task) => task.validateRequiredFields());
        return this.manager.sendTasks(tasks.map((t) => t.taskData));
    }

    stream(options: StreamOptions<Record<string, any>> = {}): [() => void, () => string] {
        this.validateRequiredFields();
        
        let fullText = '';
        let eventName = '';
        
        // Start the task but don't wait for it
        this.manager.streamTask(this.taskData)
            .then(name => {
                eventName = name;
                // Subscribe to the event once we have the name
                return this.manager.getSocketManager().subscribeToEvent(name, handleResponse);
            })
            .then(unsub => {
                unsubscribe = unsub;
            })
            .catch(err => {
                console.error('Error starting stream task:', err);
            });
            
        let unsubscribe = () => {};
        
        // Response handler function
        const handleResponse = (response: any) => {
            if (response?.end === true || response?.end === "true" || response?.end === "True") {
                options.onComplete?.(fullText);
                return;
            }

            if (response?.data !== undefined) {
                const data = response.data;
                if (data?.status === "fatal_error") {
                    options.onError?.(data.message, true);
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
        };
        
        // Create a cleanup function and a getText function to return as a tuple
        const cleanup = () => {
            unsubscribe();
        };
        
        const getText = () => {
            return fullText;
        };
        
        return [cleanup, getText];
    }

    streamAsync(options: Omit<StreamOptions<Record<string, any>>, "onComplete"> = {}): Promise<string> {
        this.validateRequiredFields();
        return this.manager.streamTask(this.taskData);
    }

    private validateRequiredFields(): void {
        const taskData = this.taskData.getTask().taskData;
        for (const [fieldName, field] of Object.entries(this.schema)) {
            if (field.REQUIRED && (taskData[fieldName] === undefined || taskData[fieldName] === null)) {
                throw new Error(`Required field '${fieldName}' is missing for task '${this.taskData["taskName"]}'`);
            }
        }
    }

    getTaskData(): SchemaTaskData {
        return this.taskData;
    }
}
