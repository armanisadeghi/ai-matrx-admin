"use client";
import { useState, useCallback, forwardRef, useImperativeHandle, useEffect, useMemo, useRef } from "react";
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  Panel, 
  useNodesState, 
  useEdgesState, 
  Node, 
  Edge,
  ConnectionLineType,
  MarkerType,
  useReactFlow,
  ReactFlowProvider
} from "reactflow";
import "reactflow/dist/style.css";
import { initialNodes, initialEdges } from "../../../../app/(authenticated)/tests/workflows/first/constants";
import { useTheme } from "@/styles/themes/ThemeProvider";
// Custom node components
import AgentNode from "./nodes/integrations/AgentNode";
import ToolNode from "./nodes/integrations/ToolNode";
import TriggerNode from "./nodes/integrations/TriggerNode";
import DatabaseNode from "./nodes/integrations/DatabaseNode";
import ApiNode from "./nodes/integrations/ApiNode";
import TransformNode from "./nodes/integrations/TransformNode";
import ConditionalNode from "./nodes/integrations/ConditionalNode";
import LoopNode from "./nodes/integrations/LoopNode";
import DelayNode from "./nodes/integrations/DelayNode";
// New node types
import EmailNode from "./nodes/integrations/EmailNode";
import FileOperationNode from "./nodes/integrations/FileOperationNode";
import AuthenticationNode from "./nodes/integrations/AuthenticationNode";
import WebhookNode from "./nodes/integrations/WebhookNode";
import PersonalTaskNode from './nodes/integrations/PersonalTaskNode';
import CalendarEventNode from './nodes/integrations/CalendarEventNode';

// Custom edge component
import CustomEdge from "./edges/CustomEdge";

// New modular components
import NodeMenu from "./menus/NodeMenu";
import QuickAccessPanel from "./menus/QuickAccessPanel";
import NodePropertyPanel from "./panels/NodePropertyPanel";
import EdgePropertyPanel from "./panels/EdgePropertyPanel";
import NodeContextMenu from "./menus/NodeContextMenu";

// Custom styles for dark mode
import "./reactflow-dark.css";

// Import icons
import { Package } from "lucide-react";

// Define comprehensive node data interface
export interface NodeData {
  label: string;
  subLabel?: string;
  props?: string[];
  endpoint?: string;
  method?: string;
  auth?: { type: string; enabled: boolean };
  action?: string;
  connectionStatus?: string;
  query?: string;
  transformationType?: string;
  schema?: { input: string; output: string };
  deliveryStatus?: string;
  template?: string;
  operation?: string;
  fileType?: string;
  progress?: number;
  description?: string;
  condition?: string;
  loopType?: string;
  collection?: string;
  duration?: string;
  showTimer?: boolean;
  authType?: string;
  connected?: boolean;
  securityWarning?: string;
  active?: boolean;
  lastTriggered?: string | null;
  hasError?: boolean;
  taskStatus?: string;
  eventStatus?: string;
  // Add broker mappings for inputs and outputs
  brokerInputs?: {
    [paramName: string]: string; // Maps parameter names to broker IDs
  };
  brokerOutputs?: {
    [resultName: string]: string; // Maps result field names to broker IDs
  };
}

// Define node types mapping
const nodeTypes = {
    agent: AgentNode,
    tool: ToolNode,
    trigger: TriggerNode,
    database: DatabaseNode,
    api: ApiNode,
    transform: TransformNode,
    conditional: ConditionalNode,
    loop: LoopNode,
    delay: DelayNode,
    // Add new node types
    email: EmailNode,
    fileOperation: FileOperationNode,
    authentication: AuthenticationNode,
    webhook: WebhookNode,
    personalTask: PersonalTaskNode,
    calendarEvent: CalendarEventNode,
};

// Define edge types mapping
const edgeTypes = {
  custom: CustomEdge,
};

// Define the handle for external access to editor methods
export interface WorkflowEditorHandle {
  getWorkflowData: () => {
    nodes: any[];
    edges: any[];
    selectedNode: any;
  };
  toggleBrokerView: () => void;
  showBrokerView: boolean;
}

// Define default edge options
const defaultEdgeOptions = {
  animated: false,
  type: 'custom',
  style: { 
    strokeWidth: 2,
    stroke: '#b1b1b7'
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
  },
};

// New BrokerLegend component
const BrokerLegend = ({ 
  brokers, 
  selectedBrokers, 
  onSelectBroker 
}: { 
  brokers: string[],
  selectedBrokers: Set<string>,
  onSelectBroker: (brokerId: string) => void
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 bg-textured p-2 rounded-md shadow-md border border-gray-200 dark:border-gray-700 max-w-xs">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
        <Package className="h-4 w-4 text-purple-500 dark:text-purple-400" />
        Active Brokers
      </h4>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {brokers.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            No active brokers found
          </div>
        ) : (
          brokers.map((brokerId) => (
            <div 
              key={brokerId}
              onClick={() => onSelectBroker(brokerId)}
              className={`px-2 py-1 text-xs rounded cursor-pointer flex items-center justify-between ${
                selectedBrokers.has(brokerId)
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="truncate">Broker: {brokerId}</span>
              <div className={`w-2 h-2 rounded-full ${
                selectedBrokers.has(brokerId) 
                  ? 'bg-purple-500 dark:bg-purple-400' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const WorkflowEditor = forwardRef<WorkflowEditorHandle, {}>((props, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [nodeMenuOpen, setNodeMenuOpen] = useState(false);
  const [nodeMenuPosition, setNodeMenuPosition] = useState({ x: 0, y: 0 });
  const [nodeContextMenu, setNodeContextMenu] = useState<{
    node: Node<NodeData>;
    position: { x: number; y: number };
  } | null>(null);
  const { mode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reactFlowInstance = useReactFlow();
  // Add state for broker view
  const [showBrokerView, setShowBrokerView] = useState(false);
  const [selectedBrokers, setSelectedBrokers] = useState<Set<string>>(new Set());
  // We'll use these refs to avoid infinite updates
  const brokerViewUpdating = useRef(false);
  const lastNodesRef = useRef(nodes);
  // Add a ref to track the last state to prevent unnecessary updates
  const lastStateRef = useRef({
    showBrokerView: false,
    selectedBrokersSize: 0
  });
  
  // On nodes change, update our ref
  useEffect(() => {
    lastNodesRef.current = nodes;
  }, [nodes]);

  // Apply dark mode class once mounted
  useEffect(() => {
    setMounted(true);
    
    // Add dark mode class to container if in dark mode
    const container = document.body;
    if (mode === 'dark') {
      container.classList.add('react-flow-dark-mode');
    } else {
      container.classList.remove('react-flow-dark-mode');
    }
    
    return () => {
      container.classList.remove('react-flow-dark-mode');
    };
  }, [mode]);

  // Expose the getWorkflowData method to parent components
  useImperativeHandle(ref, () => ({
    getWorkflowData: () => ({
      nodes,
      edges,
      selectedNode,
    }),
    toggleBrokerView: () => {
      console.log('Editor toggleBrokerView called, current state:', showBrokerView);
      setShowBrokerView(prev => !prev);
    },
    get showBrokerView() {
      return showBrokerView;
    }
  }));

  const onConnect = useCallback((params) => {
    // Apply default options to new connections
    setEdges((eds) => addEdge({
      ...params,
      ...defaultEdgeOptions
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    setSelectedEdge(null);
    setSelectedNode(node);
    setNodeContextMenu(null);
  }, []);
  
  const onNodeContextMenu = useCallback((event, node) => {
    // Prevent default context menu
    event.preventDefault();
    event.stopPropagation();
    
    // Get position for the context menu
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };
    
    // Open the context menu
    setNodeContextMenu({ node, position });
    setSelectedNode(node);
    setSelectedEdge(null);
    setNodeMenuOpen(false);
  }, []);
  
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    
    // If this is a broker edge, highlight related nodes
    if (edge.data?.isBrokerEdge && edge.data?.brokerId) {
      // Focus on this specific broker
      setSelectedBrokers(new Set([edge.data.brokerId]));
      
      // We'll regenerate edges in the next render cycle via effect
      // This avoids the circular dependency issue
      setSelectedNode(null);
    } else {
      // Regular edge behavior
      setSelectedNode(null);
      setSelectedEdge(edge);
    }
    
    setNodeContextMenu(null);
  }, []);

  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setNodeMenuOpen(false);
    setNodeContextMenu(null);
  }, []);

  const onBackgroundContextMenu = useCallback((event) => {
    // Prevent default context menu
    event.preventDefault();

    // Get the position within the workflow canvas
    const boundingRect = event.target.getBoundingClientRect();
    const position = {
      x: event.clientX - boundingRect.left,
      y: event.clientY - boundingRect.top,
    };

    // Open the node creation menu
    setNodeMenuPosition(position);
    setNodeMenuOpen(true);
    setNodeContextMenu(null);
  }, []);

  const addNewNode = useCallback(
    (type) => {
      const newNodeId = `node-${Date.now()}`;
      let newNodeData: NodeData;

      switch (type) {
        case "database":
          newNodeData = {
            label: "PostgreSQL",
            connectionStatus: "disconnected",
          };
          break;
        case "api":
          newNodeData = {
            label: "API Request",
            method: "GET",
          };
          break;
        case "transform":
          newNodeData = {
            label: "Transform",
            transformationType: "JSON Transform",
          };
          break;
        case "conditional":
          newNodeData = {
            label: "Condition",
            description: "If/Else Branch",
            condition: "data.value > 0",
          };
          break;
        case "loop":
          newNodeData = {
            label: "Loop",
            loopType: "For Each",
            collection: "items",
          };
          break;
        case "delay":
          newNodeData = {
            label: "Delay",
            duration: "5 seconds",
            showTimer: true,
            progress: 0,
          };
          break;
        // Add cases for the new node types
        case "email":
          newNodeData = {
            label: "Send Email",
            deliveryStatus: "pending",
            template: "Hello {{name}},\n\nThis is an automated message.",
          };
          break;
        case "personalTask":
          newNodeData = {
            label: "Personal Task",
            taskStatus: "pending",
          };
          break;
        case "calendarEvent":
          newNodeData = {
            label: "Calendar Event",
            eventStatus: "upcoming",
          };
          break;

        case "fileOperation":
          newNodeData = {
            label: "File Operation",
            operation: "read",
            fileType: "document",
            progress: 0,
          };
          break;
        case "authentication":
          newNodeData = {
            label: "Authentication",
            authType: "api_key",
            connected: false,
            securityWarning: "Store credentials securely",
          };
          break;
        case "webhook":
          newNodeData = {
            label: "Webhook",
            active: false,
            endpoint: "https://api.example.com/webhook",
            lastTriggered: null,
          };
          break;
        default:
          newNodeData = { label: "New Node" };
      }

      const newNode = {
        id: newNodeId,
        type: type,
        position: nodeMenuPosition,
        data: {
          ...newNodeData,
          // Initialize empty broker mappings
          brokerInputs: {},
          brokerOutputs: {}
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setNodeMenuOpen(false);
    },
    [nodeMenuPosition, setNodes]
  );

  // Handler for node data changes in the property panel
  const handleNodeDataChange = useCallback((nodeId, key, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [key]: value,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);
  
  // Handler for edge data changes in the property panel
  const handleEdgeDataChange = useCallback((edgeId, key, value) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            [key]: value,
          };
        }
        return edge;
      })
    );
  }, [setEdges]);
  
  // Handler for edge deletion
  const handleEdgeDelete = useCallback((edgeId) => {
    setEdges((eds) => eds.filter(e => e.id !== edgeId));
    setSelectedEdge(null);
  }, [setEdges]);
  
  // Handler for node deletion
  const handleNodeDelete = useCallback((nodeId) => {
    // First, delete all connected edges
    setEdges((eds) => eds.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    ));
    
    // Then delete the node
    setNodes((nds) => nds.filter(node => node.id !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);
  
  // Handler for node duplication
  const handleNodeDuplicate = useCallback((nodeId) => {
    const nodeToDuplicate = nodes.find(node => node.id === nodeId);
    
    if (nodeToDuplicate) {
      const newNodeId = `node-${Date.now()}`;
      const newNode = {
        ...nodeToDuplicate,
        id: newNodeId,
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50
        },
      };
      
      setNodes((nds) => [...nds, newNode]);
    }
  }, [nodes, setNodes]);
  
  // Handler for node editing
  const handleNodeEdit = useCallback((nodeId) => {
    const nodeToEdit = nodes.find(node => node.id === nodeId);
    if (nodeToEdit) {
      setSelectedNode(nodeToEdit);
    }
  }, [nodes]);

  // Handler for selecting brokers - doesn't directly call generateBrokerEdges
  const handleSelectBroker = useCallback((brokerId: string) => {
    setSelectedBrokers(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(brokerId)) {
        newSelection.delete(brokerId);
      } else {
        newSelection.add(brokerId);
      }
      return newSelection;
    });
  }, []);

  // Function to handle broker view for a specific node
  const handleViewBrokers = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Select the node and open its properties panel
    setSelectedNode(node);
    
    // Collect all broker IDs from this node
    const brokerIds = new Set<string>();
    const inputs = node.data.brokerInputs || {};
    const outputs = node.data.brokerOutputs || {};
    
    Object.values(inputs).forEach(id => {
      if (id) brokerIds.add(id.toString());
    });
    
    Object.values(outputs).forEach(id => {
      if (id) brokerIds.add(id.toString());
    });
    
    // Set the selected brokers
    setSelectedBrokers(brokerIds);
    
    // Turn on broker view if it's not already on
    if (!showBrokerView) {
      setShowBrokerView(true);
    }
    
    // Setting a custom event in the DOM to signal the node property panel
    // to open the broker section. This avoids prop drilling.
    const event = new CustomEvent('open-broker-section', { detail: { nodeId } });
    document.dispatchEvent(event);
  }, [nodes, showBrokerView, setSelectedNode, setSelectedBrokers, setShowBrokerView]);

  // Combined effect to handle all broker view state changes
  useEffect(() => {
    // Check if state actually changed before proceeding
    const currentSelectedBrokersSize = selectedBrokers.size;
    if (
      lastStateRef.current.showBrokerView === showBrokerView && 
      lastStateRef.current.selectedBrokersSize === currentSelectedBrokersSize
    ) {
      console.log('State unchanged, skipping broker update');
      return;
    }
    
    // Update the last state ref
    lastStateRef.current = {
      showBrokerView,
      selectedBrokersSize: currentSelectedBrokersSize
    };
    
    console.log('Broker view effect running - showBrokerView:', showBrokerView, 'selectedBrokers size:', selectedBrokers.size);
    
    if (brokerViewUpdating.current) {
      console.log('Skipping broker update - already updating');
      return;
    }
    
    console.log('Starting broker view update');
    brokerViewUpdating.current = true;

    // Clean up function to reset all states
    const resetAllVisualStates = () => {
      console.log('Resetting all broker visual states');
      // Reset edges
      setEdges(currentEdges => {
        const filteredEdges = currentEdges.filter(edge => !edge.data?.isBrokerEdge);
        return filteredEdges.length !== currentEdges.length ? filteredEdges : currentEdges;
      });

      // Reset nodes
      setNodes(currentNodes => {
        const updatedNodes = currentNodes.map(node => {
          if (node.style?.opacity !== 1 || node.style?.boxShadow !== undefined) {
            return {
              ...node,
              style: {
                ...node.style,
                opacity: 1,
                boxShadow: undefined
              }
            };
          }
          return node;
        });
        
        return updatedNodes.some((node, i) => node !== currentNodes[i])
          ? updatedNodes
          : currentNodes;
      });
    };

    try {
      if (showBrokerView) {
        console.log('Broker view enabled - processing connections');
        // Collect broker connections
        const brokerMap = new Map<string, { sources: string[], targets: string[] }>();
        // Use the ref to avoid dependency issues
        const currentNodes = lastNodesRef.current;
        
        currentNodes.forEach(node => {
          const outputs = node.data.brokerOutputs || {};
          Object.entries(outputs).forEach(([_, brokerId]) => {
            if (!brokerId) return;
            if (!brokerMap.has(brokerId)) {
              brokerMap.set(brokerId, { sources: [], targets: [] });
            }
            brokerMap.get(brokerId)?.sources.push(node.id);
          });

          const inputs = node.data.brokerInputs || {};
          Object.entries(inputs).forEach(([_, brokerId]) => {
            if (!brokerId) return;
            if (!brokerMap.has(brokerId)) {
              brokerMap.set(brokerId, { sources: [], targets: [] });
            }
            brokerMap.get(brokerId)?.targets.push(node.id);
          });
        });
        
        console.log('Broker map created with', brokerMap.size, 'brokers');

        // Generate new edges
        const newEdges: Edge[] = [];
        const connectedNodeIds = new Set<string>();

        brokerMap.forEach((connections, brokerId) => {
          if (selectedBrokers.size > 0 && !selectedBrokers.has(brokerId)) {
            return;
          }

          connections.sources.forEach(sourceId => {
            connectedNodeIds.add(sourceId);
            connections.targets.forEach(targetId => {
              if (sourceId === targetId) return;
              connectedNodeIds.add(targetId);
              const edgeId = `broker-${brokerId}-${sourceId}-${targetId}`;
              newEdges.push({
                id: edgeId,
                source: sourceId,
                target: targetId,
                type: 'custom',
                animated: true,
                style: { strokeWidth: 2, stroke: '#9333ea' },
                data: {
                  label: `Broker: ${brokerId}`,
                  isBrokerEdge: true,
                  brokerId
                }
              });
            });
          });
        });

        // Only update nodes if necessary
        setNodes(currentNodes => {
          console.log('Evaluating node updates for broker view');
          const updatedNodes = currentNodes.map(node => {
            const isConnected = connectedNodeIds.has(node.id);
            const opacity = selectedBrokers.size > 0 ? (isConnected ? 1 : 0.4) : 1;
            const boxShadow = isConnected ? '0 0 8px rgba(147, 51, 234, 0.5)' : undefined;

            // Only return a new node object if styles have changed
            if (
              node.style?.opacity !== opacity ||
              node.style?.boxShadow !== boxShadow
            ) {
              return {
                ...node,
                style: {
                  ...node.style,
                  opacity,
                  boxShadow
                }
              };
            }
            return node;
          });

          // Only return a new array if any node was updated
          const hasNodeChanges = updatedNodes.some((node, i) => node !== currentNodes[i]);
          console.log('Node updates needed:', hasNodeChanges);
          return hasNodeChanges
            ? updatedNodes
            : currentNodes;
        });

        // Only update edges if necessary
        setEdges(currentEdges => {
          console.log('Evaluating edge updates for broker view');
          const filteredEdges = currentEdges.filter(e => !e.data?.isBrokerEdge);
          const hasNewEdges = newEdges.length !== filteredEdges.length ||
            !filteredEdges.every(e => !e.data?.isBrokerEdge) ||
            newEdges.some(e => !currentEdges.some(ce => ce.id === e.id));

          console.log('Edge updates needed:', hasNewEdges, 'New broker edges:', newEdges.length);
          return hasNewEdges ? [...filteredEdges, ...newEdges] : currentEdges;
        });

        // Focus on relevant nodes
        if (reactFlowInstance && selectedBrokers.size > 0 && connectedNodeIds.size > 0) {
          setTimeout(() => {
            if (reactFlowInstance) {
              const relevantNodes = nodes.filter(node => connectedNodeIds.has(node.id));
              if (relevantNodes.length > 0) {
                reactFlowInstance.fitView({
                  nodes: relevantNodes,
                  padding: 0.2
                });
              }
            }
          }, 50);
        }
      } else {
        console.log('Broker view disabled - resetting state');
        resetAllVisualStates();
        setSelectedBrokers(new Set());
      }
    } finally {
      // Reset our flag so future updates can occur
      console.log('Finished broker view update');
      brokerViewUpdating.current = false;
    }

    // Clean up function when component unmounts or effect dependencies change
    return () => {
      console.log('Broker view effect cleanup');
      if (showBrokerView) {
        resetAllVisualStates();
      }
    };
  // We're intentionally not including nodes in the dependencies to avoid update cycles
  // We're also intentionally using refs for state tracking instead of dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactFlowInstance]);

  if (!mounted) return null;

  return (
    <div className={`h-full w-full ${mode === 'dark' ? 'react-flow-dark-mode' : ''}`} 
         style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f9fafb' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={onEdgeClick}
        onPaneClick={onBackgroundClick}
        onPaneContextMenu={onBackgroundContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        attributionPosition="bottom-right"
        edgesFocusable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          className={mode === 'dark' ? 'react-flow-controls-dark' : ''}
          position="bottom-left"
          showInteractive={false}
          style={{ bottom: 10, left: 10 }}
        />
        <MiniMap
          className={mode === 'dark' ? 'react-flow-minimap-dark' : ''}
          nodeColor={node => {
            switch (node.type) {
              case 'trigger': return '#f87171';
              case 'agent': return '#93c5fd';
              case 'database': return '#67e8f9';
              case 'api': return '#818cf8';
              case 'transform': return '#6ee7b7';
              case 'email': return '#60a5fa';
              default: return mode === 'dark' ? '#475569' : '#d1d5db';
            }
          }}
          maskColor={mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(240, 240, 240, 0.4)'}
          style={{ 
            backgroundColor: mode === 'dark' ? '#1e293b' : '#f9fafb',
            border: mode === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
          }}
        />
        <Background 
          gap={12} 
          size={1} 
          color={mode === 'dark' ? '#334155' : '#e5e7eb'} 
          style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f9fafb' }}
        />

        {/* Quick access node creation panel - Using our new component */}
        <Panel position="top-right">
          <QuickAccessPanel onAddNode={addNewNode} />
        </Panel>

        {/* Broker Legend Panel - only shown when broker view is active */}
        {showBrokerView && (
          <Panel position="bottom-left" className="mb-16">
            <BrokerLegend
              brokers={useMemo(() => {
                console.log('Calculating active brokers for legend');
                // Use our ref to avoid dependency issues
                return Array.from(lastNodesRef.current.reduce((acc, node) => {
                  // Collect all broker IDs from inputs and outputs
                  const inputs = node.data.brokerInputs || {};
                  const outputs = node.data.brokerOutputs || {};
                  
                  Object.values(inputs).forEach(id => {
                    if (id) acc.add(id.toString());
                  });
                  
                  Object.values(outputs).forEach(id => {
                    if (id) acc.add(id.toString());
                  });
                  
                  return acc;
                }, new Set<string>()));
              }, [showBrokerView])} // Only recalculate when broker view changes
              selectedBrokers={selectedBrokers}
              onSelectBroker={handleSelectBroker}
            />
          </Panel>
        )}

        {/* Context menu for node creation - Using our new component */}
        <NodeMenu 
          open={nodeMenuOpen}
          position={nodeMenuPosition}
          onClose={() => setNodeMenuOpen(false)}
          onAddNode={addNewNode}
        />
        
        {/* Context menu for node operations */}
        {nodeContextMenu && (
          <NodeContextMenu
            node={nodeContextMenu.node}
            position={nodeContextMenu.position}
            onClose={() => setNodeContextMenu(null)}
            onDelete={handleNodeDelete}
            onDuplicate={handleNodeDuplicate}
            onEdit={handleNodeEdit}
            onViewBrokers={handleViewBrokers}
          />
        )}

        {/* Node properties panel - Using our new component */}
        {selectedNode && (
          <Panel position="top-left" className="max-w-lg">
            <NodePropertyPanel 
              selectedNode={selectedNode}
              onNodeDataChange={handleNodeDataChange}
              onNodeDelete={handleNodeDelete}
              onClose={() => setSelectedNode(null)}
            />
          </Panel>
        )}
        
        {/* Edge properties panel - Using our new component */}
        {selectedEdge && (
          <Panel position="top-left" className="max-w-lg">
            <EdgePropertyPanel 
              selectedEdge={selectedEdge}
              onEdgeDataChange={handleEdgeDataChange}
              onEdgeDelete={handleEdgeDelete}
              onClose={() => setSelectedEdge(null)}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
});

WorkflowEditor.displayName = "WorkflowEditor";

// Create a wrapper component that provides ReactFlow context
const WorkflowEditorWithProvider = forwardRef<WorkflowEditorHandle, {}>((props, ref) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} ref={ref} />
    </ReactFlowProvider>
  );
});

WorkflowEditorWithProvider.displayName = "WorkflowEditorWithProvider";

// Export types and component
export { WorkflowEditorWithProvider as default };
