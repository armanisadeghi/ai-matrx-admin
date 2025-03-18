// lib/redux/socket/recipe-task-data.ts
import { BaseTaskData } from "@/lib/redux/socket/task-data/base";

interface BrokerValues {
    name?: string | null;
    id: string;
    value?: string | null;
    ready?: boolean;
}

export class RecipeTaskData extends BaseTaskData {
    constructor(recipeId: string, index: number = 0) {
        super("run_recipe", index);
        this.setRecipeId(recipeId); // Use base method
    }

    addBroker(broker: BrokerValues): this {
        if (!broker.id) throw new Error("Broker 'id' is required");
        if (!broker.value) throw new Error("Broker 'value' is required");
        this.brokerValues.push({
            id: broker.id,
            name: broker.id,
            value: broker.value,
            ready: broker.ready ?? true,
        });
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

    protected buildTaskData(): Record<string, any> {
        return {
            recipe_id: this.recipeId,
            broker_values: this.brokerValues,
            overrides: Object.keys(this.overrides).length > 0 ? this.overrides : undefined,
        };
    }
}