import { SocketManager } from "../SocketManager";

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
    protected data: Record<string, any> = {};

    constructor(taskName: string, index: number = 0) {
        this.socketManager = SocketManager.getInstance();
        this.taskName = taskName;
        this.index = index;
    }

    setArg(name: string, value: any): this {
        const normalizedName = this.normalizeName(name);
        this.data[normalizedName] = value;
        return this;
    }

    setNestedArg(parentArg: string, path: string, value: any): this {
        const normalizedParent = this.normalizeName(parentArg);

        if (!this.data[normalizedParent] || typeof this.data[normalizedParent] !== "object") {
            this.data[normalizedParent] = {};
        }

        const pathParts = path.split(".");
        let current = this.data[normalizedParent];

        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!current[part] || typeof current[part] !== "object") {
                current[part] = {};
            }
            current = current[part];
        }

        current[pathParts[pathParts.length - 1]] = value;

        return this;
    }

    addToArrayArg(arrayArg: string, item: any): this {
        const normalizedName = this.normalizeName(arrayArg);

        if (!this.data[normalizedName]) {
            this.data[normalizedName] = [];
        } else if (!Array.isArray(this.data[normalizedName])) {
            this.data[normalizedName] = [this.data[normalizedName]];
        }

        this.data[normalizedName].push(item);
        return this;
    }

    setArrayArg(arrayArg: string, items: any[]): this {
        const normalizedName = this.normalizeName(arrayArg);
        this.data[normalizedName] = [...items]; // Create a copy
        return this;
    }

    updateArrayItem(arrayArg: string, index: number, item: any): this {
        const normalizedName = this.normalizeName(arrayArg);

        if (!this.data[normalizedName] || !Array.isArray(this.data[normalizedName])) {
            throw new Error(`Argument ${arrayArg} is not an array`);
        }

        if (index < 0 || index >= this.data[normalizedName].length) {
            throw new Error(`Index ${index} is out of bounds for array ${arrayArg}`);
        }

        this.data[normalizedName][index] = item;
        return this;
    }

    private normalizeName(name: string): string {
        return name
            .toLowerCase()
            .replace(/([A-Z])/g, "_$1")
            .toLowerCase();
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

    getData(): Record<string, any> {
        return { ...this.data };
    }
}
