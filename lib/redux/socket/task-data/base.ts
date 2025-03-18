// lib/redux/socket/base-task-data.ts
import { SocketManager } from "../manager";

interface BaseTask {
    task: string;
    index: number;
    stream: boolean;
    taskData: Record<string, any>;
}

export class BaseTaskData {
    protected taskName: string;
    protected index: number;
    protected socketManager: SocketManager;

    protected conversationId?: string;
    protected message?: any;
    protected modelOverride?: string;
    protected recipeId?: string;
    protected brokerValues: any[] = [];
    protected overrides: Record<string, any> = {};
    protected metadata?: any;
    protected urls?: string[];
    protected content?: string;
    protected compiled_id?: string;
    protected compiled_recipe?: string;
    protected data?: Record<string, any>;

    constructor(taskName: string, index: number = 0) {
        this.socketManager = SocketManager.getInstance();
        this.taskName = taskName;
        this.index = index;
    }

    setConversationId(conversationId: string): this {
        this.conversationId = conversationId;
        return this;
    }

    setMessage(message: any): this {
        this.message = message;
        return this;
    }

    setModelOverride(modelOverride: string): this {
        this.modelOverride = modelOverride;
        return this;
    }

    setRecipeId(recipeId: string): this {
        this.recipeId = recipeId;
        return this;
    }

    addBrokerValue(broker: any): this {
        this.brokerValues.push(broker);
        return this;
    }

    setOverrides(overrides: Record<string, any>): this {
        this.overrides = { ...this.overrides, ...overrides };
        return this;
    }

    setMetadata(metadata: any): this {
        this.metadata = metadata;
        return this;
    }

    setUrls(urls: string[]): this {
        this.urls = urls;
        return this;
    }

    setContent(content: string): this {
        this.content = content;
        return this;
    }

    setCompiledId(compiledId: string): this {
        this.compiled_id = compiledId;
        return this;
    }

    setCompiledRecipe(compiledRecipe: string): this {
        this.compiled_recipe = compiledRecipe;
        return this;
    }

    setData(data: Record<string, any>): this {
        this.data = data;
        return this;
    }

    getTask(): BaseTask {
        return {
            task: this.taskName,
            index: this.index,
            stream: true,
            taskData: this.buildTaskData(),
        };
    }

    protected buildTaskData(): Record<string, any> {
        throw new Error("Subclasses must implement buildTaskData");
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}