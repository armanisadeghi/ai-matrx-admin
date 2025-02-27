// lib/redux/socket/recipe-task-data.ts
import { SocketManager } from "../manager";

interface BrokerValues {
    name?: string | null;
    id: string;
    value?: string | null;
    ready?: boolean;
}

interface Overrides {
    model_override?: string;
    processor_overrides?: Record<string, any>;
    other_overrides?: Record<string, any>;
}

interface RunRecipe {
    recipe_id: string;
    broker_values: BrokerValues[];
    overrides?: Overrides;
}

interface RecipeTask {
    task: string;
    index: number;
    stream: boolean;
    taskData: RunRecipe;
}

export class RecipeTaskData {
    private recipeId: string;
    private brokerValues: BrokerValues[];
    private overrides: Overrides;
    private index: number;
    private socketManager: SocketManager;

    constructor(recipeId: string, index: number = 0) {
        this.socketManager = SocketManager.getInstance(); // Use singleton
        this.recipeId = recipeId;
        this.brokerValues = [];
        this.overrides = {};
        this.index = index;
    }

    setModelOverride(modelOverride: string): this {
        this.overrides.model_override = modelOverride;
        return this;
    }

    setProcessorOverrides(processorOverrides: Record<string, any>): this {
        this.overrides.processor_overrides = processorOverrides;
        return this;
    }

    setOtherOverrides(otherOverrides: Record<string, any>): this {
        this.overrides.other_overrides = otherOverrides;
        return this;
    }

    addBroker(broker: BrokerValues): this {
        if (!broker.id) {
            throw new Error("Broker 'id' is required");
        }
        if (!broker.value) {
            throw new Error("Broker 'value' is required");
        }
        this.brokerValues.push({
            id: broker.id,
            name: broker.id,
            value: broker.value,
            ready: broker.ready ?? true,
        });
        return this;
    }

    getTask(): RecipeTask {
        return {
            task: "run_recipe",
            index: this.index,
            stream: true,
            taskData: {
                recipe_id: this.recipeId,
                broker_values: this.brokerValues,
                overrides: Object.keys(this.overrides).length > 0 ? this.overrides : undefined,
            },
        };
    }

    // Expose socketManager methods if needed
    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}