"use client";

import { useMemo, useCallback } from 'react';
import { BrokerConnection, BrokerEdge, WorkflowRelays } from '../../types/broker';

export interface BrokerConnectionManagerProps {
  steps: any[];
  userInputs: any[];
  workflowRelays?: WorkflowRelays;
  selectedBrokers?: Set<string>;
}

export interface BrokerConnectionManagerResult {
  brokerConnections: Map<string, BrokerConnection>;
  brokerEdges: BrokerEdge[];
  activeBrokers: string[];
  connectedNodeIds: Set<string>;
}

export const useBrokerConnectionManager = ({
  steps,
  userInputs,
  workflowRelays,
  selectedBrokers = new Set()
}: BrokerConnectionManagerProps): BrokerConnectionManagerResult => {

  // Convert selectedBrokers Set to a stable array for useMemo
  const selectedBrokersArray = useMemo(() => Array.from(selectedBrokers).sort(), [selectedBrokers]);

  // Generate broker connections from workflow steps and user inputs
  const brokerConnections = useMemo(() => {
    const connections = new Map<string, BrokerConnection>();

    // Process user inputs first
    userInputs?.forEach(input => {
      if (typeof input.broker_id === 'string' && !connections.has(input.broker_id)) {
        connections.set(input.broker_id, {
          brokerId: input.broker_id,
          sourceSteps: ['USER_INPUT'],
          targetSteps: [],
          isUserInput: true,
          currentValue: input.value,
          dataType: typeof input.value
        });
      }
    });

    // Process workflow steps
    steps.forEach((step, index) => {
      const stepName = step.step_name || step.nodeId || `step_${index}`;
      
      // Handle outputs (return_broker_override)
      const outputs = step.return_broker_override || step.override_data?.return_broker_override;
      if (outputs) {
        const outputArray = Array.isArray(outputs) ? outputs : [outputs];
        outputArray.forEach(brokerId => {
          if (typeof brokerId === 'string' && !connections.has(brokerId)) {
            connections.set(brokerId, {
              brokerId,
              sourceSteps: [],
              targetSteps: []
            });
          }
          const connection = connections.get(brokerId)!;
          if (!connection.sourceSteps.includes(stepName)) {
            connection.sourceSteps.push(stepName);
          }
        });
      }
      
      // Handle inputs (arg_mapping)
      const argMapping = step.arg_mapping || step.override_data?.arg_mapping;
      if (argMapping) {
        Object.values(argMapping).forEach(brokerId => {
          if (typeof brokerId === 'string') {
            if (!connections.has(brokerId)) {
              connections.set(brokerId, {
                brokerId,
                sourceSteps: [],
                targetSteps: []
              });
            }
            const connection = connections.get(brokerId)!;
            if (!connection.targetSteps.includes(stepName)) {
              connection.targetSteps.push(stepName);
            }
          }
        });
      }

      // Handle visual broker connections (for UI state)
      if (step.nodeData?.brokerInputs) {
        Object.values(step.nodeData.brokerInputs).forEach(brokerId => {
          if (typeof brokerId === 'string' && !connections.has(brokerId)) {
            connections.set(brokerId, {
              brokerId,
              sourceSteps: [],
              targetSteps: [stepName]
            });
          }
        });
      }

      if (step.nodeData?.brokerOutputs) {
        Object.values(step.nodeData.brokerOutputs).forEach(brokerId => {
          if (typeof brokerId === 'string' && !connections.has(brokerId)) {
            connections.set(brokerId, {
              brokerId,
              sourceSteps: [stepName],
              targetSteps: []
            });
          }
        });
      }
    });

    // Apply workflow relays
    if (workflowRelays?.simple_relays) {
      workflowRelays.simple_relays.forEach(relay => {
        relay.targets.forEach(targetBrokerId => {
          const sourceConnection = connections.get(relay.source);
          const targetConnection = connections.get(targetBrokerId);
          
          if (sourceConnection && targetConnection) {
            // Copy source steps to target broker
            sourceConnection.sourceSteps.forEach(stepName => {
              if (!targetConnection.sourceSteps.includes(stepName)) {
                targetConnection.sourceSteps.push(stepName);
              }
            });
          }
        });
      });
    }

    return connections;
  }, [steps, userInputs, workflowRelays]);

  // Generate visual broker edges for ReactFlow
  const brokerEdges = useMemo(() => {
    const edges: BrokerEdge[] = [];
    const connectedNodes = new Set<string>();

    brokerConnections.forEach((connection, brokerId) => {
      // Skip if we're filtering brokers and this one isn't selected
      if (selectedBrokersArray.length > 0 && !selectedBrokersArray.includes(brokerId)) {
        return;
      }

      // Create edges from sources to targets
      connection.sourceSteps.forEach(sourceStep => {
        if (sourceStep === 'USER_INPUT') return; // Skip user input visualization for now
        
        connectedNodes.add(sourceStep);
        
        connection.targetSteps.forEach(targetStep => {
          if (sourceStep === targetStep) return; // Skip self-connections
          
          connectedNodes.add(targetStep);
          
          const edgeId = `broker-${brokerId}-${sourceStep}-${targetStep}`;
          edges.push({
            id: edgeId,
            source: sourceStep,
            target: targetStep,
            type: 'broker',
            animated: true,
            style: {
              strokeWidth: 2,
              stroke: '#9333ea' // Purple color for broker connections
            },
            data: {
              label: `Broker: ${brokerId}`,
              isBrokerEdge: true,
              brokerId
            }
          });
        });
      });
    });

    return edges;
  }, [brokerConnections, selectedBrokersArray]);

  // Get list of active brokers
  const activeBrokers = useMemo(() => {
    return Array.from(brokerConnections.keys()).sort();
  }, [brokerConnections]);

  // Get connected node IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    const nodeIds = new Set<string>();
    
    brokerConnections.forEach((connection, brokerId) => {
      if (selectedBrokersArray.length > 0 && !selectedBrokersArray.includes(brokerId)) {
        return;
      }
      
      connection.sourceSteps.forEach(stepName => {
        if (stepName !== 'USER_INPUT') {
          nodeIds.add(stepName);
        }
      });
      
      connection.targetSteps.forEach(stepName => {
        nodeIds.add(stepName);
      });
    });
    
    return nodeIds;
  }, [brokerConnections, selectedBrokersArray]);

  return {
    brokerConnections,
    brokerEdges,
    activeBrokers,
    connectedNodeIds
  };
};

// Utility functions for broker management
export const brokerUtils = {
  // Find all brokers connected to a specific step
  findBrokersForStep: (stepName: string, connections: Map<string, BrokerConnection>): string[] => {
    const brokers: string[] = [];
    connections.forEach((connection, brokerId) => {
      if (connection.sourceSteps.includes(stepName) || connection.targetSteps.includes(stepName)) {
        brokers.push(brokerId);
      }
    });
    return brokers;
  },

  // Find all steps connected to a specific broker
  findStepsForBroker: (brokerId: string, connections: Map<string, BrokerConnection>): string[] => {
    const connection = connections.get(brokerId);
    if (!connection) return [];
    
    return [...new Set([...connection.sourceSteps, ...connection.targetSteps])];
  },

  // Validate broker connections
  validateConnections: (connections: Map<string, BrokerConnection>) => {
    const issues: string[] = [];
    
    connections.forEach((connection, brokerId) => {
      // Check for orphaned brokers (no producers or consumers)
      if (connection.sourceSteps.length === 0 && connection.targetSteps.length === 0) {
        issues.push(`Broker ${brokerId} has no connections`);
      }
      
      // Check for brokers with only producers (potential data loss)
      if (connection.sourceSteps.length > 0 && connection.targetSteps.length === 0 && !connection.isUserInput) {
        issues.push(`Broker ${brokerId} has producers but no consumers`);
      }
      
      // Check for brokers with only consumers (potential missing data)
      if (connection.sourceSteps.length === 0 && connection.targetSteps.length > 0) {
        issues.push(`Broker ${brokerId} has consumers but no producers`);
      }
    });
    
    return issues;
  },

  // Generate a unique broker ID
  generateBrokerId: (prefix: string = 'broker'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}; 