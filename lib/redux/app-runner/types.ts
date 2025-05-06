// --- Types ---

// Types related to broker values
export interface BrokerValue {
    id: string;
    value: any;
    sourceComponentId?: string; // Optional reference to a component
    type?: string; // Optional type information to help with transformations
    metadata?: Record<string, any>; // Additional metadata that might be useful
  }
  
  // Map to track component instances to broker IDs
  export interface ComponentToBrokerMapping {
    componentId: string;         // Component instance ID
    brokerId: string;            // Associated broker ID
    instanceId: string;          // Unique instance ID for the component assigned at runtime
  }
  
  export interface RuntimeBrokerDefinition {
    id: string;
    name: string;
    dataType: string;
    defaultValue: any;
}

export interface RuntimeCompiledRecipe {
    id: string;
    recipe_id: string;
    version: number;
    brokers: Record<string, RuntimeBrokerDefinition>;
}
