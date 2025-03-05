// 5. Properties Panel (right sidebar)
// src/components/workflow/PropertiesPanel.jsx
import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useWorkflow } from './WorkflowContext';


const PropertiesPanel = () => {
  const { selectedNode, nodes, brokers } = useWorkflow();
  const [expanded, setExpanded] = useState(true);

  // Get selected node details
  const selectedNodeDetails = selectedNode ? (
    nodes.find(n => n.id === selectedNode) || brokers.find(b => b.id === selectedNode)
  ) : null;

  if (!expanded) {
    return (
      <div className="w-10 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        <button 
          className="p-3 flex justify-center"
          onClick={() => setExpanded(true)}
        >
          <Settings size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      <div className="p-3 flex items-center justify-between font-medium border-b border-gray-200 dark:border-gray-700">
        <span className="flex items-center">
          <Settings className="mr-2" size={18} />
          Properties
        </span>
        <button onClick={() => setExpanded(false)}>
          <ChevronRight size={18} />
        </button>
      </div>
      
      <div className="p-2 flex-1 flex flex-col overflow-hidden">
        {selectedNodeDetails ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{selectedNodeDetails.name}</span>
              <button className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 mb-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Type</div>
              <div className="font-medium capitalize">{selectedNodeDetails.type}</div>
            </div>
            
            {selectedNodeDetails.type === 'action' && (
              <ActionProperties node={selectedNodeDetails} />
            )}
            
            {selectedNodeDetails.type === 'broker' && (
              <BrokerProperties broker={selectedNodeDetails} />
            )}
            
            {selectedNodeDetails.type === 'source' && (
              <SourceProperties source={selectedNodeDetails} />
            )}
            
            {selectedNodeDetails.type === 'destination' && (
              <DestinationProperties destination={selectedNodeDetails} />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <Settings size={24} />
            <p className="mt-2 text-sm">Select a node to edit properties</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Property editor subcomponents
const ActionProperties = ({ node }) => (
    <>
      <div className="text-sm font-medium mb-1">Inputs</div>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 mb-2 overflow-y-auto max-h-32">
        {node.inputs?.map((input, idx) => (
          <div key={idx} className="mb-1 last:mb-0 flex justify-between items-center">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${input.connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-500'} mr-2`}></div>
              <span>{input.name}{input.required ? '*' : ''}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{input.type}</span>
          </div>
        ))}
      </div>
      
      <div className="text-sm font-medium mb-1">Outputs</div>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 overflow-y-auto max-h-32">
        {node.outputs?.map((output, idx) => (
          <div key={idx} className="mb-1 last:mb-0 flex justify-between items-center">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${output.connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-500'} mr-2`}></div>
              <span>{output.name}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{output.type}</span>
          </div>
        ))}
      </div>
    </>
  );
  
  const BrokerProperties = ({ broker }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 flex-1 overflow-y-auto">
      <div className="mb-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Broker Name</label>
        <input 
          type="text" 
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
          value={broker.name}
          onChange={() => {}}
        />
      </div>
      
      <div className="mb-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Data Type</label>
        <select 
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
          value={broker.mappedType || ''}
          onChange={() => {}}
        >
          <option value="">Any type</option>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="object">Object</option>
          <option value="array">Array</option>
        </select>
      </div>
      
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Default Value</label>
        <textarea 
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 h-20 font-mono"
          placeholder="Default value (optional)"
          onChange={() => {}}
        ></textarea>
      </div>
    </div>
  );
  
  const SourceProperties = ({ source }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 flex-1 overflow-y-auto">
      <div className="mb-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Source Name</label>
        <input 
          type="text" 
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
          value={source.name}
          onChange={() => {}}
        />
      </div>
      
      <div className="mb-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Data Type</label>
        <select 
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
          value={source.dataType || 'string'}
          onChange={() => {}}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="object">Object</option>
        </select>
      </div>
      
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Description</label>
        <textarea 
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 h-20"
          value={source.description || ''}
          placeholder="Help text for users"
          onChange={() => {}}
        ></textarea>
      </div>
    </div>
  );
  
  const DestinationProperties = ({ destination }) => (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 flex-1 overflow-y-auto">
      <div className="mb-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Destination Name</label>
        <input 
          type="text" 
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
          value={destination.name}
          onChange={() => {}}
        />
      </div>
      
      <div className="mb-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Destination Type</label>
        <select 
          className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
          value={destination.destinationType}
          onChange={() => {}}
        >
          <option value="userOutput">User Output</option>
          <option value="database">Database</option>
          <option value="webhook">Webhook</option>
          <option value="file">File</option>
        </select>
      </div>
      <div>
      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Format</label>
      <select 
        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
        value={destination.format || ''}
        onChange={() => {}}
      >
        <option value="">Default</option>
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
        <option value="xml">XML</option>
        <option value="yaml">YAML</option>
        <option value="html">HTML</option>
        <option value="text">Text</option>
      </select>
    </div>  
    </div>
  );

  
  
  
  
  
  export default PropertiesPanel;

