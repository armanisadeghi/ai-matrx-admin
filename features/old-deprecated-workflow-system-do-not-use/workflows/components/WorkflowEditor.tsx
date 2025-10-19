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

// Import from new organized structure
// Core workflow nodes (NEW!)
import { RecipeNode, GenericFunctionNode, UserInputNode } from "./nodes/core";

// Utility nodes (NEW!)
import { ProcessorNode } from "./nodes/utilities";

// Integration nodes (existing)
import AgentNode from "./nodes/integrations/AgentNode";
import ToolNode from "./nodes/integrations/ToolNode";
import TriggerNode from "./nodes/integrations/TriggerNode";
import DatabaseNode from "./nodes/integrations/DatabaseNode";
import ApiNode from "./nodes/integrations/ApiNode";
import TransformNode from "./nodes/integrations/TransformNode";
import ConditionalNode from "./nodes/integrations/ConditionalNode";
import LoopNode from "./nodes/integrations/LoopNode";
import DelayNode from "./nodes/integrations/DelayNode";
import EmailNode from "./nodes/integrations/EmailNode";
import FileOperationNode from "./nodes/integrations/FileOperationNode";
import AuthenticationNode from "./nodes/integrations/AuthenticationNode";
import WebhookNode from "./nodes/integrations/WebhookNode";
import PersonalTaskNode from './nodes/integrations/PersonalTaskNode';
import CalendarEventNode from './nodes/integrations/CalendarEventNode';

// Custom edge component
import CustomEdge from "./edges/CustomEdge";

// New modular components from organized structure
import NodeMenu from "./menus/NodeMenu";
import QuickAccessPanel from "./menus/QuickAccessPanel";
import NodePropertyPanel from "./panels/NodePropertyPanel";
import ExpandedNodePropertyPanel from "./panels/ExpandedNodePropertyPanel";
import EdgePropertyPanel from "./panels/EdgePropertyPanel";
import NodeContextMenu from "./menus/NodeContextMenu";

// Broker system components
import { useBrokerConnectionManager } from "./broker/BrokerConnectionManager";

// Custom styles for dark mode
import "./reactflow-dark.css";

// Import icons
import { Package } from "lucide-react";

// Define comprehensive node data interface (keeping existing for compatibility)
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
  // Add function properties for database integration
  functionId?: string;
  functionName?: string;
  // Add broker mappings for inputs and outputs
  brokerInputs?: {
    [paramName: string]: string; // Maps parameter names to broker IDs
  };
  brokerOutputs?: {
    [resultName: string]: string; // Maps result field names to broker IDs
  };
}

// Define node types mapping (keeping existing + new core workflow nodes)
const nodeTypes = {
    // Core workflow nodes (NEW! 🚀)
    recipe: RecipeNode,
    genericFunction: GenericFunctionNode,
    userInput: UserInputNode,
    
    // Utility nodes (NEW! ⚡)
    processor: ProcessorNode,
    
    // Integration nodes (existing)
    agent: AgentNode,
    tool: ToolNode,
    trigger: TriggerNode,
    database: DatabaseNode,
    api: ApiNode,
    transform: TransformNode,
    conditional: ConditionalNode,
    loop: LoopNode,
    delay: DelayNode,
    email: EmailNode,
    fileOperation: FileOperationNode,
    authentication: AuthenticationNode,
    webhook: WebhookNode,
    personalTask: PersonalTaskNode,
    calendarEvent: CalendarEventNode,
    
    // TODO: Add core workflow nodes in Phase 2
    // iterativeRecipe: IterativeRecipeNode,
    // extractor: ExtractorNode,
    // resultsProcessor: ResultsProcessorNode,
    // textOperations: TextOperationsNode,
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
    brokerConnections: Map<string, any>;
    activeBrokers: string[];
  };
  toggleBrokerView: () => void;
  toggleExpandedPropertyPanel: () => void;
  showBrokerView: boolean;
  useExpandedPropertyPanel: boolean;
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

// Enhanced BrokerLegend component
const BrokerLegend = ({ 
  brokers, 
  selectedBrokers, 
  onSelectBroker,
  onClearSelection
}: { 
  brokers: string[],
  selectedBrokers: Set<string>,
  onSelectBroker: (brokerId: string) => void,
  onClearSelection: () => void
}) => {
  return (
    <div className="bg-textured p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-purple-500 dark:text-purple-400" />
        Active Brokers ({brokers.length})
      </h4>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {brokers.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
            No active brokers found
          </div>
        ) : (
          brokers.map((brokerId) => (
            <div 
              key={brokerId}
              onClick={() => onSelectBroker(brokerId)}
              className={`px-3 py-2 text-xs rounded-md cursor-pointer transition-all duration-200 flex items-center justify-between ${
                selectedBrokers.has(brokerId)
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 shadow-sm'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="truncate font-medium">
                {brokerId.length > 20 ? `${brokerId.substring(0, 20)}...` : brokerId}
              </span>
              <div className={`w-2 h-2 rounded-full ml-2 ${
                selectedBrokers.has(brokerId) 
                  ? 'bg-purple-500 dark:bg-purple-400' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}></div>
            </div>
          ))
        )}
      </div>
      {selectedBrokers.size > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={() => onClearSelection()}
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 font-medium"
          >
            Clear Selection
          </button>
        </div>
      )}
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
  const [useExpandedPropertyPanel, setUseExpandedPropertyPanel] = useState(false);
  const { mode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reactFlowInstance = useReactFlow();
  
  // Enhanced broker state management
  const [showBrokerView, setShowBrokerView] = useState(false);
  const [selectedBrokers, setSelectedBrokers] = useState<Set<string>>(new Set());
  const [userInputs] = useState<any[]>([]); // TODO: Implement user inputs management
  const [workflowRelays] = useState<any>(undefined); // TODO: Implement workflow relays

  // Create stable selectedBrokers array for useMemo dependencies
  const selectedBrokersArray = useMemo(() => Array.from(selectedBrokers).sort(), [selectedBrokers]);

  // Use the new broker connection manager
  const {
    brokerConnections,
    brokerEdges,
    activeBrokers,
    connectedNodeIds
  } = useBrokerConnectionManager({
    steps: nodes.map(node => ({
      nodeId: node.id,
      step_name: node.data.label,
      nodeData: node.data,
      // TODO: Map additional properties from node data
    })),
    userInputs,
    workflowRelays,
    selectedBrokers: showBrokerView ? selectedBrokers : new Set()
  });

  // Store latest broker data in refs to avoid infinite loops
  const latestBrokerEdges = useRef(brokerEdges);
  const latestConnectedNodeIds = useRef(connectedNodeIds);
  
  // Update refs when broker data changes
  useEffect(() => {
    latestBrokerEdges.current = brokerEdges;
    latestConnectedNodeIds.current = connectedNodeIds;
  }, [brokerEdges, connectedNodeIds]);

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

  // Update edges when broker view is enabled
  useEffect(() => {
    if (showBrokerView) {
      // Replace regular edges with broker edges
      setEdges(currentEdges => {
        const nonBrokerEdges = currentEdges.filter(edge => !edge.data?.isBrokerEdge);
        return [...nonBrokerEdges, ...latestBrokerEdges.current];
      });

      // Update node styles for highlighting
      setNodes(currentNodes => {
        return currentNodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            opacity: latestConnectedNodeIds.current.has(node.id) ? 1 : 0.4,
            boxShadow: latestConnectedNodeIds.current.has(node.id) ? '0 0 8px rgba(147, 51, 234, 0.5)' : undefined
          }
        }));
      });
    } else {
      // Remove broker edges and reset node styles
      setEdges(currentEdges => currentEdges.filter(edge => !edge.data?.isBrokerEdge));
      setNodes(currentNodes => {
        return currentNodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            opacity: 1,
            boxShadow: undefined
          }
        }));
      });
    }
  }, [showBrokerView]); // Only depend on showBrokerView to avoid infinite loops

  // Expose the getWorkflowData method to parent components
  useImperativeHandle(ref, () => ({
    getWorkflowData: () => ({
      nodes,
      edges,
      selectedNode,
      brokerConnections,
      activeBrokers,
    }),
    toggleBrokerView: () => {
      console.log('Editor toggleBrokerView called, current state:', showBrokerView);
      setShowBrokerView(prev => !prev);
    },
    toggleExpandedPropertyPanel: () => {
      setUseExpandedPropertyPanel(prev => !prev);
    },
    get showBrokerView() {
      return showBrokerView;
    },
    get useExpandedPropertyPanel() {
      return useExpandedPropertyPanel;
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

  // TODO: Implement addNewNode with new node types
  const addNewNode = useCallback((type: string, nodeData?: any) => {
    console.log('Adding new node of type:', type, 'with data:', nodeData);
    
    const newNodeId = `node-${Date.now()}`;
    const position = {
      x: nodeMenuPosition.x,
      y: nodeMenuPosition.y,
    };

    let newNode;
    
    switch (type) {
      case 'recipe':
        newNode = {
          id: newNodeId,
          type: 'recipe',
          position,
          data: {
            label: 'Recipe Node',
            stepName: 'new_recipe',
            stepType: 'recipe',
            functionType: 'workflow_recipe_executor.recipe_runner',
            status: 'pending',
            argMapping: {},
            argOverrides: [],
            brokerInputs: {},
            brokerOutputs: {},
            description: 'AI-powered recipe execution node',
            ...nodeData // Allow overriding any default data
          }
        };
        break;
        
      case 'genericFunction':
        newNode = {
          id: newNodeId,
          type: 'genericFunction',
          position,
          data: {
            label: 'Function Node',
            stepName: 'new_function',
            stepType: 'function',
            status: 'pending',
            argMapping: {},
            argOverrides: [],
            brokerInputs: {},
            brokerOutputs: {},
            description: 'Generic function processor node',
            ...nodeData // Allow overriding any default data
          }
        };
        break;
        
      case 'userInput':
        newNode = {
          id: newNodeId,
          type: 'userInput',
          position,
          data: {
            label: 'User Input',
            stepName: 'user_input',
            stepType: 'userInput',
            inputType: 'text',
            isRequired: true,
            status: 'pending',
            argMapping: {},
            argOverrides: [],
            brokerInputs: {},
            brokerOutputs: {},
            description: 'Collect user input for the workflow',
            ...nodeData // Allow overriding any default data
          }
        };
        break;
        
      case 'processor':
        newNode = {
          id: newNodeId,
          type: 'processor',
          position,
          data: {
            label: 'Processor',
            stepName: 'processor',
            stepType: 'function',
            processorType: 'transform',
            status: 'pending',
            argMapping: {},
            argOverrides: [],
            brokerInputs: {},
            brokerOutputs: {},
            description: 'Data processing and transformation node',
            ...nodeData // Allow overriding any default data
          }
        };
        break;
        
      default:
        // Fallback for integration nodes or unrecognized types
        newNode = {
          id: newNodeId,
          type: type,
          position,
          data: {
            label: `${type} Node`,
            description: `${type} integration node`,
            ...nodeData // Allow overriding any default data
          }
        };
        break;
    }

    if (newNode) {
      setNodes((nds) => [...nds, newNode]);
      setNodeMenuOpen(false);
    }
  }, [nodeMenuPosition, setNodes]);

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

  // Handler for selecting brokers
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

  // Handler for clearing broker selection
  const handleClearBrokerSelection = useCallback(() => {
    setSelectedBrokers(new Set());
  }, []);

  // Function to handle broker view for a specific node
  const handleViewBrokers = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Select the node and open its properties panel
    setSelectedNode(node);
    
    // TODO: Collect all broker IDs from this node
    // const brokerIds = new Set<string>();
    // Implementation will be added when we have proper broker mapping
    
    // Turn on broker view if it's not already on
    if (!showBrokerView) {
      setShowBrokerView(true);
    }
  }, [nodes, showBrokerView]);

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

        {/* Enhanced Broker Legend Panel - only shown when broker view is active */}
        {showBrokerView && (
          <Panel position="bottom-left" className="mb-16">
            <BrokerLegend
              brokers={activeBrokers}
              selectedBrokers={selectedBrokers}
              onSelectBroker={handleSelectBroker}
              onClearSelection={handleClearBrokerSelection}
            />
          </Panel>
        )}

        {/* Context menu for node creation */}
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
        {selectedNode && !useExpandedPropertyPanel && (
          <Panel position="top-left" className="max-w-lg">
            <NodePropertyPanel 
              selectedNode={selectedNode}
              onNodeDataChange={handleNodeDataChange}
              onNodeDelete={handleNodeDelete}
              onClose={() => setSelectedNode(null)}
              onToggleExpanded={() => setUseExpandedPropertyPanel(true)}
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
      
      {/* Expanded Node Property Panel - Full Screen Overlay */}
      {selectedNode && useExpandedPropertyPanel && (
        <ExpandedNodePropertyPanel 
          selectedNode={selectedNode}
          onNodeDataChange={handleNodeDataChange}
          onNodeDelete={handleNodeDelete}
          onClose={() => setSelectedNode(null)}
          onToggleCompact={() => setUseExpandedPropertyPanel(false)}
        />
      )}
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