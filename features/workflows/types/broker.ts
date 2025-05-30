// Broker system types for workflow editor

export interface BrokerConnection {
  brokerId: string;
  sourceSteps: string[];      // Steps that publish to this broker
  targetSteps: string[];      // Steps that consume from this broker
  relayMappings?: {
    simpleRelays: SimpleRelay[];
    bidirectionalRelays: any[];
    relayChains: any[];
  };
  isUserInput?: boolean;
  currentValue?: any;
  dataType?: string;          // Type hint for the data this broker carries
}

export interface BrokerVisualization {
  connections: Map<string, BrokerConnection>;
  visualEdges: BrokerEdge[];   // Visual representation for ReactFlow
}

export interface BrokerEdge {
  id: string;
  source: string;
  target: string;
  type: 'broker';
  animated: boolean;
  style: {
    strokeWidth: number;
    stroke: string;
  };
  data: {
    label: string;
    isBrokerEdge: true;
    brokerId: string;
  };
}

export interface SimpleRelay {
  source: string;
  targets: string[];
}

export interface BidirectionalRelay {
  brokerA: string;
  brokerB: string;
}

export interface RelayChain {
  brokers: string[];
  direction: 'forward' | 'reverse' | 'bidirectional';
}

export interface WorkflowRelays {
  simple_relays?: SimpleRelay[];
  bidirectional_relays?: BidirectionalRelay[];
  relay_chains?: RelayChain[];
}

// Broker management for the UI
export interface BrokerManager {
  // Core operations
  generateBrokerConnections: (steps: any[], userInputs: any[]) => Map<string, BrokerConnection>;
  createBrokerVisualization: (connections: Map<string, BrokerConnection>) => BrokerEdge[];
  
  // Validation
  validateBrokerConnections: (steps: any[]) => any[]; // Will import BrokerValidationResult from validation
  
  // Utilities
  findConnectedSteps: (brokerId: string, connections: Map<string, BrokerConnection>) => string[];
  getBrokerDataFlow: (brokerId: string) => BrokerDataFlow;
}

export interface BrokerDataFlow {
  brokerId: string;
  producers: string[];        // Steps that produce data for this broker
  consumers: string[];        // Steps that consume data from this broker
  dataPath: string[];         // Flow path through the workflow
} 