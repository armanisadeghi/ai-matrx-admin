import { BrokerValue } from '@/redux/features/broker/types';


export interface FlatRecipeData {
    recipe_id: string;
    needed_brokers: string[];
    broker_values: string[];
    stream: boolean;
    overrides?: Record<string, any>;
    model_override?: string;
    processor_override?: Record<string, any>;
    other_overrides?: Record<string, any>;
}


export interface SimpleRecipeData {
    recipe_id: string;
    broker_values: BrokerValue[];
    overrides?: Record<string, any>;
    stream: boolean;
}
export interface Overrides {
    model_override?: string;
    processor_override?: object;
    other_overrides?: object;
}

