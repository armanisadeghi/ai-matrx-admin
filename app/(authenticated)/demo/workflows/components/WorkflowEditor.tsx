'use client';
import { useState, useCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Database, 
  Globe, 
  ArrowRightLeft, 
  GitBranch, 
  Repeat, 
  Clock,
  Mail,
  FileText,
  Key,
  Webhook
} from 'lucide-react';

// Custom node components
import AgentNode from './nodes/AgentNode';
import ToolNode from './nodes/ToolNode';
import TriggerNode from './nodes/TriggerNode';
import DatabaseNode from './nodes/DatabaseNode';
import ApiNode from './nodes/ApiNode';
import TransformNode from './nodes/TransformNode';
import ConditionalNode from './nodes/ConditionalNode';
import LoopNode from './nodes/LoopNode';
import DelayNode from './nodes/DelayNode';
import EmailNode from './nodes/EmailNode';
import FileOperationNode from './nodes/FileOperationNode';
import AuthenticationNode from './nodes/AuthenticationNode';
import WebhookNode from './nodes/WebhookNode';
import PersonalTaskNode from './nodes/PersonalTaskNode';
import CalendarEventNode from './nodes/CalendarEventNode';

// Define comprehensive node data interface
interface NodeData {
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
};

const initialNodes = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 50, y: 200 },
    data: { label: 'When chat message received' },
  },
  {
    id: 'agent-1',
    type: 'agent',
    position: { x: 300, y: 200 },
    data: { 
      label: 'AI Agent',
      subLabel: 'Tools Agent',
      props: ['Chat Model', 'Memory', 'Tool']
    },
  },
  {
    id: 'api-1',
    type: 'api',
    position: { x: 600, y: 100 },
    data: { 
      label: 'API Request',
      endpoint: 'https://api.example.com/data',
      method: 'GET',
      auth: { type: 'Bearer', enabled: true }
    },
  },
  {
    id: 'database-1',
    type: 'database',
    position: { x: 600, y: 250 },
    data: { 
      label: 'PostgreSQL',
      action: 'SELECT * FROM users',
      connectionStatus: 'connected',
      query: 'SELECT * FROM users WHERE status = $1'
    },
  },
  {
    id: 'transform-1',
    type: 'transform',
    position: { x: 900, y: 175 },
    data: { 
      label: 'Transform',
      transformationType: 'JSON to CSV',
      schema: { input: 'JSON', output: 'CSV' }
    },
  },
  // Add example nodes for the new types
  {
    id: 'email-1',
    type: 'email',
    position: { x: 300, y: 400 },
    data: { 
      label: 'Send Email',
      subLabel: 'Notification',
      deliveryStatus: 'pending',
      template: 'Hi {{name}}, your appointment is scheduled for {{time}}.'
    },
  },
  {
    id: 'fileOperation-1',
    type: 'fileOperation',
    position: { x: 600, y: 400 },
    data: { 
      label: 'Upload Report',
      operation: 'upload',
      fileType: 'document',
      progress: 75
    },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'trigger-1', target: 'agent-1' },
  { id: 'e2-3', source: 'agent-1', target: 'api-1', animated: true, style: { strokeDasharray: '5,5' } },
  { id: 'e2-4', source: 'agent-1', target: 'database-1', animated: true, style: { strokeDasharray: '5,5' } },
  { id: 'e3-5', source: 'api-1', target: 'transform-1' },
  { id: 'e4-5', source: 'database-1', target: 'transform-1' },
  // Add example edges for the new nodes
  { id: 'e2-6', source: 'agent-1', target: 'email-1', animated: true },
  { id: 'e6-7', source: 'email-1', target: 'fileOperation-1' },
];

function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [nodeMenuOpen, setNodeMenuOpen] = useState(false);
  const [nodeMenuPosition, setNodeMenuPosition] = useState({ x: 0, y: 0 });
  
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );
  
  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);
  
  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setNodeMenuOpen(false);
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
  }, []);
  
  const addNewNode = useCallback((type) => {
    const newNodeId = `node-${Date.now()}`;
    let newNodeData: NodeData;
    
    switch(type) {
      case 'database':
        newNodeData = { 
          label: 'PostgreSQL',
          connectionStatus: 'disconnected',
        };
        break;
      case 'api':
        newNodeData = { 
          label: 'API Request',
          method: 'GET',
        };
        break;
      case 'transform':
        newNodeData = { 
          label: 'Transform',
          transformationType: 'JSON Transform',
        };
        break;
      case 'conditional':
        newNodeData = { 
          label: 'Condition',
          description: 'If/Else Branch',
          condition: 'data.value > 0',
        };
        break;
      case 'loop':
        newNodeData = { 
          label: 'Loop',
          loopType: 'For Each',
          collection: 'items',
        };
        break;
      case 'delay':
        newNodeData = { 
          label: 'Delay',
          duration: '5 seconds',
          showTimer: true,
          progress: 0,
        };
        break;
      // Add cases for the new node types
      case 'email':
        newNodeData = { 
          label: 'Send Email',
          deliveryStatus: 'pending',
          template: 'Hello {{name}},\n\nThis is an automated message.',
        };
        break;
      case 'personalTask':
        newNodeData = {
          label: 'Personal Task',
          taskStatus: 'pending',
        };
        break;
      case 'calendarEvent':
        newNodeData = {
          label: 'Calendar Event',
          eventStatus: 'upcoming',
        };
        break;
        
      case 'fileOperation':
        newNodeData = { 
          label: 'File Operation',
          operation: 'read',
          fileType: 'document',
          progress: 0,
        };
        break;
      case 'authentication':
        newNodeData = { 
          label: 'Authentication',
          authType: 'api_key',
          connected: false,
          securityWarning: 'Store credentials securely',
        };
        break;
      case 'webhook':
        newNodeData = { 
          label: 'Webhook',
          active: false,
          endpoint: 'https://api.example.com/webhook',
          lastTriggered: null,
        };
        break;
      default:
        newNodeData = { label: 'New Node' };
    }
    
    const newNode = {
      id: newNodeId,
      type: type,
      position: nodeMenuPosition,
      data: newNodeData,
    };
    
    setNodes((nds) => [...nds, newNode]);
    setNodeMenuOpen(false);
  }, [nodeMenuPosition, setNodes]);
  
  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onBackgroundClick}
        onContextMenu={onBackgroundContextMenu}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
        
        {/* Quick access node creation panel */}
        <Panel position="top-right">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={() => addNewNode('database')} variant="outline" size="sm" className="flex items-center gap-1">
                <Database className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Database
              </Button>
              <Button onClick={() => addNewNode('api')} variant="outline" size="sm" className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                API
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addNewNode('transform')} variant="outline" size="sm" className="flex items-center gap-1">
                <ArrowRightLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                Transform
              </Button>
              <Button onClick={() => addNewNode('conditional')} variant="outline" size="sm" className="flex items-center gap-1">
                <GitBranch className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Condition
              </Button>
            </div>
            {/* Add new node buttons */}
            <div className="flex gap-2">
              <Button onClick={() => addNewNode('email')} variant="outline" size="sm" className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Email
              </Button>
              <Button onClick={() => addNewNode('fileOperation')} variant="outline" size="sm" className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                File
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addNewNode('authentication')} variant="outline" size="sm" className="flex items-center gap-1">
                <Key className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Auth
              </Button>
              <Button onClick={() => addNewNode('webhook')} variant="outline" size="sm" className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                Webhook
              </Button>
            </div>
          </div>
        </Panel>
        
        {/* Context menu for node creation */}
        {nodeMenuOpen && (
          <div 
            className="absolute z-10 bg-white dark:bg-gray-800 shadow-md rounded-md border border-gray-200 dark:border-gray-700 p-2"
            style={{ left: nodeMenuPosition.x, top: nodeMenuPosition.y }}
          >
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-2">Add Node</div>
            <div className="space-y-1">
              <button 
                onClick={() => addNewNode('trigger')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <div className="w-4 h-4 text-red-500">🔴</div>
                Trigger
              </button>
              <button 
                onClick={() => addNewNode('agent')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <div className="w-4 h-4 text-gray-500">🤖</div>
                Agent
              </button>
              <button 
                onClick={() => addNewNode('database')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Database
              </button>
              <button 
                onClick={() => addNewNode('api')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                API
              </button>
              <button 
                onClick={() => addNewNode('transform')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                Transform
              </button>
              <button 
                onClick={() => addNewNode('conditional')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Condition
              </button>
              <button 
                onClick={() => addNewNode('loop')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Repeat className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Loop
              </button>
              <button 
                onClick={() => addNewNode('delay')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Delay
              </button>
              
              {/* Add new node options to context menu */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              
              <button 
                onClick={() => addNewNode('email')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Email
              </button>
              <button 
                onClick={() => addNewNode('calendarEvent')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Calendar Event
              </button>
              <button 
                onClick={() => addNewNode('personalTask')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Personal Task
              </button>

              <button 
                onClick={() => addNewNode('fileOperation')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                File Operation
              </button>
              <button 
                onClick={() => addNewNode('authentication')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Key className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Authentication
              </button>
              <button 
                onClick={() => addNewNode('webhook')}
                className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Globe className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                Webhook
              </button>
            </div>
          </div>
        )}
        
        {selectedNode && (
          <Panel position="top-left" className="max-w-lg">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {selectedNode.data.label || selectedNode.type} Properties
                </h3>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(selectedNode.data)
                  .filter(([key]) => typeof selectedNode.data[key] !== 'object' && key !== 'label')
                  .map(([key, value]) => (
                    <div key={key} className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </label>
                      <input 
                        type="text" 
                        value={value} 
                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        onChange={(e) => {
                          const newNodes = nodes.map(node => {
                            if (node.id === selectedNode.id) {
                              return {
                                ...node,
                                data: {
                                  ...node.data,
                                  [key]: e.target.value
                                }
                              };
                            }
                            return node;
                          });
                          setNodes(newNodes);
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export default WorkflowEditor;
