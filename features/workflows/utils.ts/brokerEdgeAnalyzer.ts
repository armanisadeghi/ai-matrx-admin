import { Edge } from 'reactflow';
import { CompleteWorkflowData } from '@/features/workflows/service/workflowService';

/**
 * Simple connection representing one step in the broker chain
 */
interface BrokerConnection {
  sourceBrokerId: string;
  sourceNodeId: string;
  targetNodeId: string;
  connectionType: 'to_argument' | 'to_relay' | 'to_dependency';
  metadata?: {
    targetArgName?: string; // For argument connections
    relayLabel?: string;    // For relay connections
    dependencyHasTarget?: boolean; // For dependency connections
  };
}

/**
 * Step-by-step broker connection analyzer
 * Starting with user inputs (the easiest and most reliable sources)
 */
export function analyzeBrokerConnections(completeData: CompleteWorkflowData): Edge[] {
  const connections: BrokerConnection[] = [];
  
  // Start with user inputs - they are always SOURCES (inputs only)
  completeData.userInputs.forEach(userInput => {
    const userInputConnections = traceUserInputBroker(userInput.broker_id, userInput.id, completeData);
    connections.push(...userInputConnections);
  });
  
  // Also trace from relay outputs to find subsequent connections
  completeData.relays.forEach(relay => {
    relay.target_broker_ids?.forEach(targetBrokerId => {
      const relayOutputConnections = traceRelayOutputBroker(targetBrokerId, relay.id, completeData);
      connections.push(...relayOutputConnections);
    });
  });
  
  // Also trace from workflow node return brokers to find subsequent connections
  completeData.nodes.forEach(node => {
    node.return_broker_overrides?.forEach(returnBrokerId => {
      const returnBrokerConnections = traceReturnBroker(returnBrokerId, node.id, completeData);
      connections.push(...returnBrokerConnections);
    });
  });
  
  // Also trace from dependency target brokers (internal relays) to find subsequent connections
  completeData.nodes.forEach(node => {
    node.additional_dependencies?.forEach(dependency => {
      if (dependency.target_broker_id) {
        const dependencyTargetConnections = traceDependencyTarget(dependency.target_broker_id, node.id, completeData);
        connections.push(...dependencyTargetConnections);
      }
    });
  });
  
  // Convert connections to ReactFlow edges
  return connections.map((connection, index) => createVirtualEdge(connection, index));
}

/**
 * Traces where a user input broker_id can go
 * Following the exact logic you described:
 * Option A: To a relay
 * Option B1: To a workflow node as a dependency  
 * Option B2: To a workflow node as an argument (most common)
 */
function traceUserInputBroker(brokerId: string, sourceNodeId: string, completeData: CompleteWorkflowData): BrokerConnection[] {
  const connections: BrokerConnection[] = [];
  
  // Option A: Check if this broker goes to any relays
  completeData.relays.forEach(relay => {
    if (relay.source_broker_id === brokerId) {
      connections.push({
        sourceBrokerId: brokerId,
        sourceNodeId: sourceNodeId,
        targetNodeId: relay.id,
        connectionType: 'to_relay',
        metadata: {
          relayLabel: relay.label || undefined
        }
      });
      
      // TODO: Next step would be to follow each relay.target_broker_ids
      // but let's start with just identifying the immediate connection
    }
  });
  
  // Option B: Check if this broker goes to any workflow nodes
  completeData.nodes.forEach(node => {
    
    // Option B1: Check if it's used as a dependency
    node.additional_dependencies?.forEach(dependency => {
      if (dependency.source_broker_id === brokerId) {
        connections.push({
          sourceBrokerId: brokerId,
          sourceNodeId: sourceNodeId,
          targetNodeId: node.id,
          connectionType: 'to_dependency',
          metadata: {
            dependencyHasTarget: !!dependency.target_broker_id
          }
        });
        
        // TODO: If dependency.target_broker_id exists, we need to follow that too
      }
    });
    
    // Option B2: Check if it's used as an argument (most common)
    node.arg_mapping?.forEach(mapping => {
      if (mapping.source_broker_id === brokerId) {
        connections.push({
          sourceBrokerId: brokerId,
          sourceNodeId: sourceNodeId,
          targetNodeId: node.id,
          connectionType: 'to_argument',
          metadata: {
            targetArgName: mapping.target_arg_name
          }
        });
      }
    });
  });
  
  return connections;
}

/**
 * Traces where a relay output broker_id can go
 * Similar to traceUserInputBroker but for relay target broker IDs
 */
function traceRelayOutputBroker(brokerId: string, sourceNodeId: string, completeData: CompleteWorkflowData): BrokerConnection[] {
  const connections: BrokerConnection[] = [];
  
  // Check if this relay output broker goes to any workflow nodes
  completeData.nodes.forEach(node => {
    
    // Check if it's used as a dependency
    node.additional_dependencies?.forEach(dependency => {
      if (dependency.source_broker_id === brokerId) {
        connections.push({
          sourceBrokerId: brokerId,
          sourceNodeId: sourceNodeId,
          targetNodeId: node.id,
          connectionType: 'to_dependency',
          metadata: {
            dependencyHasTarget: !!dependency.target_broker_id
          }
        });
      }
    });
    
    // Check if it's used as an argument (most common case)
    node.arg_mapping?.forEach(mapping => {
      if (mapping.source_broker_id === brokerId) {
        connections.push({
          sourceBrokerId: brokerId,
          sourceNodeId: sourceNodeId,
          targetNodeId: node.id,
          connectionType: 'to_argument',
          metadata: {
            targetArgName: mapping.target_arg_name
          }
        });
      }
    });
  });
  
  // Check if this relay output goes to other relays (relay chains)
  completeData.relays.forEach(targetRelay => {
    if (targetRelay.source_broker_id === brokerId && targetRelay.id !== sourceNodeId) {

      connections.push({
        sourceBrokerId: brokerId,
        sourceNodeId: sourceNodeId,
        targetNodeId: targetRelay.id,
        connectionType: 'to_relay',
        metadata: {
          relayLabel: targetRelay.label || undefined
        }
      });
    }
  });
  
  return connections;
}

/**
 * Traces where a workflow node return broker can go
 * Return brokers can connect to:
 * 1. Relays (as source_broker_id)
 * 2. Other nodes' arg_mapping
 * 3. Other nodes' dependencies
 */
function traceReturnBroker(brokerId: string, sourceNodeId: string, completeData: CompleteWorkflowData): BrokerConnection[] {
  const connections: BrokerConnection[] = [];
  
  // Check if this return broker goes to any relays
  completeData.relays.forEach(relay => {
    if (relay.source_broker_id === brokerId) {

      connections.push({
        sourceBrokerId: brokerId,
        sourceNodeId: sourceNodeId,
        targetNodeId: relay.id,
        connectionType: 'to_relay',
        metadata: {
          relayLabel: relay.label || undefined
        }
      });
    }
  });
  
  // Check if this return broker goes to any workflow nodes
  completeData.nodes.forEach(node => {
    // Skip the same node (can't connect to itself)
    if (node.id === sourceNodeId) return;
    
    // Check if it's used as a dependency
    node.additional_dependencies?.forEach(dependency => {
      if (dependency.source_broker_id === brokerId) {

        connections.push({
          sourceBrokerId: brokerId,
          sourceNodeId: sourceNodeId,
          targetNodeId: node.id,
          connectionType: 'to_dependency',
          metadata: {
            dependencyHasTarget: !!dependency.target_broker_id
          }
        });
      }
    });
    
    // Check if it's used as an argument
    node.arg_mapping?.forEach(mapping => {
      if (mapping.source_broker_id === brokerId) {

        connections.push({
          sourceBrokerId: brokerId,
          sourceNodeId: sourceNodeId,
          targetNodeId: node.id,
          connectionType: 'to_argument',
          metadata: {
            targetArgName: mapping.target_arg_name
          }
        });
      }
    });
  });
  
  return connections;
}

/**
 * Traces where a dependency target broker can go
 * Dependency targets act like internal relays - they receive data from the source
 * and can then distribute it to other consumers
 */
function traceDependencyTarget(brokerId: string, sourceNodeId: string, completeData: CompleteWorkflowData): BrokerConnection[] {
  const connections: BrokerConnection[] = [];
  
  // Check if this dependency target goes to any relays (as source_broker_id)
  completeData.relays.forEach(relay => {
    if (relay.source_broker_id === brokerId) {
      connections.push({
        sourceBrokerId: brokerId,
        sourceNodeId: sourceNodeId,
        targetNodeId: relay.id,
        connectionType: 'to_relay',
        metadata: {
          relayLabel: relay.label || undefined
        }
      });
    }
  });
  
  // Check if this dependency target goes to any workflow nodes
  completeData.nodes.forEach(node => {
    // Skip the same node (can't connect to itself)
    if (node.id === sourceNodeId) return;
    
    // Check if it's used as a dependency source
    node.additional_dependencies?.forEach(dependency => {
      if (dependency.source_broker_id === brokerId) {
        connections.push({
          sourceBrokerId: brokerId,
          sourceNodeId: sourceNodeId,
          targetNodeId: node.id,
          connectionType: 'to_dependency',
          metadata: {
            dependencyHasTarget: !!dependency.target_broker_id
          }
        });
      }
    });
    
    // Check if it's used as an argument source
    node.arg_mapping?.forEach(mapping => {
      if (mapping.source_broker_id === brokerId) {
        connections.push({
          sourceBrokerId: brokerId,
          sourceNodeId: sourceNodeId,
          targetNodeId: node.id,
          connectionType: 'to_argument',
          metadata: {
            targetArgName: mapping.target_arg_name
          }
        });
      }
    });
  });
  
  // Check if this dependency target could theoretically go to user inputs
  // (This would set the default value for the user input)
  completeData.userInputs.forEach(userInput => {
    if (userInput.broker_id === brokerId) {
      connections.push({
        sourceBrokerId: brokerId,
        sourceNodeId: sourceNodeId,
        targetNodeId: userInput.id,
        connectionType: 'to_argument', // Treat as argument since it's setting a value
        metadata: {
          targetArgName: 'default_value'
        }
      });
    }
  });
  
  return connections;
}

/**
 * Creates a ReactFlow Edge from a broker connection
 */
function createVirtualEdge(connection: BrokerConnection, index: number): Edge {
  const edgeId = `virtual_${connection.connectionType}_${index}`;
  
  // Style edges differently based on connection type
  const edgeStyles = {
    to_argument: { 
      stroke: '#10b981', 
      strokeWidth: 2,
      strokeDasharray: '5,5' 
    },
    to_relay: { 
      stroke: '#3b82f6', 
      strokeWidth: 2 
    },
    to_dependency: { 
      stroke: '#ef4444', 
      strokeWidth: 1,
      strokeDasharray: '2,2'
    }
  };
  
  // Create appropriate label based on connection type
  let label = '';
  switch (connection.connectionType) {
    case 'to_argument':
      label = connection.metadata?.targetArgName || 'argument';
      break;
    case 'to_relay':
      label = connection.metadata?.relayLabel || 'relay';
      break;
    case 'to_dependency':
      label = 'dependency';
      break;
  }
  
  return {
    id: edgeId,
    source: connection.sourceNodeId,
    target: connection.targetNodeId,
    sourceHandle: 'output', // Default output handle for source node
    targetHandle: 'input',  // Default input handle for target node
    type: 'smoothstep',
    animated: connection.connectionType === 'to_dependency',
    style: edgeStyles[connection.connectionType],
    label: label,
    data: {
      connectionType: connection.connectionType,
      sourceBrokerId: connection.sourceBrokerId,
      metadata: connection.metadata
    }
  };
} 