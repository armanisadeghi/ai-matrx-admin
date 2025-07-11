import { PayloadAction } from "@reduxjs/toolkit";
import { WorkflowState } from "../types";
import { 
    BrokerSourceConfig, 
    BrokerDestination,
    Bookmark,
    Result,
    Relay
} from "../types";


export type NodeInputType = "unused" | "arg_override" | "arg_mapping" | "user_input" | "environment" | "broker" | "direct";

export interface InputMapping {
    type?: NodeInputType;
    arg_name?: string | null;
    source_broker_id?: string | null;
    default_value?: any;
    ready?: boolean;
    use_system_default?: boolean;
    required?: boolean;
    data_type?: string;
    metadata?: Record<string, any>;
}

export interface Output {
    broker_id: string | null;
    is_default_output: boolean;
    name: string | null;
    bookmark: Bookmark | null;
    conversion: any;
    data_type: string | null;
    result: Result | null;
    relays?: Relay[];
    metadata: Record<string, any>;
}

export interface Dependency {
    type?: string | null;
    id?: string | null;
    metadata?: Record<string, any>;
}


// Generic array update function
const updateArrayField = <T>(
    state: WorkflowState,
    id: string,
    field: 'inputs' | 'outputs' | 'dependencies' | 'sources' | 'destinations',
    value: T[]
) => {
    if (state.entities[id]) {
        (state.entities[id] as any)[field] = value;
        state.isDirty[id] = true;
    }
};

// Generic array item addition function
const addArrayItem = <T>(
    state: WorkflowState,
    id: string,
    field: 'inputs' | 'outputs' | 'dependencies' | 'sources' | 'destinations',
    item: T
) => {
    if (state.entities[id]) {
        const currentArray = (state.entities[id] as any)[field];
        if (!currentArray) {
            (state.entities[id] as any)[field] = [];
        }
        (state.entities[id] as any)[field].push(item);
        state.isDirty[id] = true;
    }
};

// Generic array item removal function
const removeArrayItem = (
    state: WorkflowState,
    id: string,
    field: 'inputs' | 'outputs' | 'dependencies' | 'sources' | 'destinations',
    index: number
) => {
    if (state.entities[id] && (state.entities[id] as any)[field]) {
        (state.entities[id] as any)[field].splice(index, 1);
        state.isDirty[id] = true;
    }
};

// Generic array item update function
const updateArrayItem = <T>(
    state: WorkflowState,
    id: string,
    field: 'inputs' | 'outputs' | 'dependencies' | 'sources' | 'destinations',
    index: number,
    item: T
) => {
    if (state.entities[id] && 
        (state.entities[id] as any)[field] && 
        (state.entities[id] as any)[field][index] !== undefined) {
        (state.entities[id] as any)[field][index] = item;
        state.isDirty[id] = true;
    }
};

// Input Management Reducers
export const inputReducers = {
    updateInputs: (state: WorkflowState, action: PayloadAction<{ id: string; inputs: InputMapping[] }>) => {
        const { id, inputs } = action.payload;
        updateArrayField(state, id, 'inputs', inputs);
    },
    
    addInput: (state: WorkflowState, action: PayloadAction<{ id: string; input: InputMapping }>) => {
        const { id, input } = action.payload;
        addArrayItem(state, id, 'inputs', input);
    },
    
    removeInput: (state: WorkflowState, action: PayloadAction<{ id: string; index: number }>) => {
        const { id, index } = action.payload;
        removeArrayItem(state, id, 'inputs', index);
    },
    
    updateInputItem: (state: WorkflowState, action: PayloadAction<{ id: string; index: number; input: InputMapping }>) => {
        const { id, index, input } = action.payload;
        updateArrayItem(state, id, 'inputs', index, input);
    },
};

// Output Management Reducers
export const outputReducers = {
    updateOutputs: (state: WorkflowState, action: PayloadAction<{ id: string; outputs: Output[] }>) => {
        const { id, outputs } = action.payload;
        updateArrayField(state, id, 'outputs', outputs);
    },
    
    addOutput: (state: WorkflowState, action: PayloadAction<{ id: string; output: Output }>) => {
        const { id, output } = action.payload;
        addArrayItem(state, id, 'outputs', output);
    },
    
    removeOutput: (state: WorkflowState, action: PayloadAction<{ id: string; index: number }>) => {
        const { id, index } = action.payload;
        removeArrayItem(state, id, 'outputs', index);
    },
    
    updateOutputItem: (state: WorkflowState, action: PayloadAction<{ id: string; index: number; output: Output }>) => {
        const { id, index, output } = action.payload;
        updateArrayItem(state, id, 'outputs', index, output);
    },
};

// Dependency Management Reducers
export const dependencyReducers = {
    updateDependencies: (state: WorkflowState, action: PayloadAction<{ id: string; dependencies: Dependency[] }>) => {
        const { id, dependencies } = action.payload;
        updateArrayField(state, id, 'dependencies', dependencies);
    },
    
    addDependency: (state: WorkflowState, action: PayloadAction<{ id: string; dependency: Dependency }>) => {
        const { id, dependency } = action.payload;
        addArrayItem(state, id, 'dependencies', dependency);
    },
    
    removeDependency: (state: WorkflowState, action: PayloadAction<{ id: string; index: number }>) => {
        const { id, index } = action.payload;
        removeArrayItem(state, id, 'dependencies', index);
    },
    
    updateDependencyItem: (state: WorkflowState, action: PayloadAction<{ id: string; index: number; dependency: Dependency }>) => {
        const { id, index, dependency } = action.payload;
        updateArrayItem(state, id, 'dependencies', index, dependency);
    },
};

// Source Management Reducers
export const sourceReducers = {
    updateSources: (state: WorkflowState, action: PayloadAction<{ id: string; sources: BrokerSourceConfig[] }>) => {
        const { id, sources } = action.payload;
        updateArrayField(state, id, 'sources', sources);
    },
    
    addSource: (state: WorkflowState, action: PayloadAction<{ id: string; source: BrokerSourceConfig }>) => {
        const { id, source } = action.payload;
        addArrayItem(state, id, 'sources', source);
    },
    
    removeSource: (state: WorkflowState, action: PayloadAction<{ id: string; index: number }>) => {
        const { id, index } = action.payload;
        removeArrayItem(state, id, 'sources', index);
    },
    
    removeSourceByBrokerId: (state: WorkflowState, action: PayloadAction<{ id: string; brokerId: string }>) => {
        const { id, brokerId } = action.payload;
        if (state.entities[id] && state.entities[id].sources) {
            state.entities[id].sources = state.entities[id].sources!.filter(source => source.brokerId !== brokerId);
            state.isDirty[id] = true;
        }
    },
    
    updateSourceItem: (state: WorkflowState, action: PayloadAction<{ id: string; index: number; source: BrokerSourceConfig }>) => {
        const { id, index, source } = action.payload;
        updateArrayItem(state, id, 'sources', index, source);
    },
};

// Destination Management Reducers
export const destinationReducers = {
    updateDestinations: (state: WorkflowState, action: PayloadAction<{ id: string; destinations: BrokerDestination[] }>) => {
        const { id, destinations } = action.payload;
        updateArrayField(state, id, 'destinations', destinations);
    },
    
    addDestination: (state: WorkflowState, action: PayloadAction<{ id: string; destination: BrokerDestination }>) => {
        const { id, destination } = action.payload;
        addArrayItem(state, id, 'destinations', destination);
    },
    
    removeDestination: (state: WorkflowState, action: PayloadAction<{ id: string; index: number }>) => {
        const { id, index } = action.payload;
        removeArrayItem(state, id, 'destinations', index);
    },
    
    updateDestinationItem: (state: WorkflowState, action: PayloadAction<{ id: string; index: number; destination: BrokerDestination }>) => {
        const { id, index, destination } = action.payload;
        updateArrayItem(state, id, 'destinations', index, destination);
    },
};

// Combined array reducers for easy import
export const arrayReducers = {
    ...inputReducers,
    ...outputReducers,
    ...dependencyReducers,
    ...sourceReducers,
    ...destinationReducers,
};