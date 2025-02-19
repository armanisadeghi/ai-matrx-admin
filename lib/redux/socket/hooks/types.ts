
export interface RecipeOverrides {
    model_override: string;
    processor_overrides: Record<string, unknown>;
    other_overrides: Record<string, unknown>;
}

export interface RecipeTaskData {
    recipe_id: string;
    broker_values: BrokerValue[];
    overrides: RecipeOverrides;
}

export interface BrokerValue {
    id: string;
    official_name: string;
    data_type: string;
    value: unknown;
    ready: boolean;
    [key: string]: unknown;
}

export interface StreamingResponses {
    [taskIndex: number]: string;
}

export interface SocketTask {
    task: string;
    index: number;
    stream: boolean;
    taskData: any;
}

export interface RecipeSocketTask extends SocketTask {
    taskData: RecipeTaskData;
}
