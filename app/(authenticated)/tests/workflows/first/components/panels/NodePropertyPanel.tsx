"use client";
import { Node } from "reactflow";
import { NodeData } from "../WorkflowEditor";
import { Trash2, X, PlusCircle, Link, Package, Database, Search, Loader } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRegisteredFunctionWithFetch } from '@/lib/redux/entity/hooks/functions-and-args';

interface NodePropertyPanelProps {
  selectedNode: Node<NodeData> | null;
  onNodeDataChange: (nodeId: string, key: string, value: any) => void;
  onNodeDelete: (nodeId: string) => void;
  onClose: () => void;
}

const NodePropertyPanel: React.FC<NodePropertyPanelProps> = ({ 
  selectedNode, 
  onNodeDataChange,
  onNodeDelete,
  onClose
}) => {
  const [showBrokerSection, setShowBrokerSection] = useState(false);
  const [functionSearchTerm, setFunctionSearchTerm] = useState('');
  const [showFunctionDropdown, setShowFunctionDropdown] = useState(false);
  
  // Real database functions for genericFunction nodes
  const { 
    registeredFunctionRecords, 
    registeredFunctionIsLoading,
    fetchRegisteredFunctionAll 
  } = useRegisteredFunctionWithFetch();

  // Fetch functions when panel opens for genericFunction nodes
  useEffect(() => {
    if (selectedNode?.type === 'genericFunction' && Object.keys(registeredFunctionRecords).length === 0 && !registeredFunctionIsLoading) {
      fetchRegisteredFunctionAll();
    }
  }, [selectedNode, registeredFunctionRecords, registeredFunctionIsLoading, fetchRegisteredFunctionAll]);

  // Filter functions based on search term
  const filteredFunctions = useMemo(() => {
    const functions = Object.values(registeredFunctionRecords);
    if (!functionSearchTerm) return functions.slice(0, 10); // Limit to 10 for performance
    
    const search = functionSearchTerm.toLowerCase();
    return functions.filter(func => 
      func.name?.toLowerCase().includes(search) ||
      func.funcName?.toLowerCase().includes(search) ||
      func.description?.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [registeredFunctionRecords, functionSearchTerm]);

  // Handle function selection
  const handleFunctionSelect = (functionData: any) => {
    if (selectedNode) {
      onNodeDataChange(selectedNode.id, 'functionId', functionData.id);
      onNodeDataChange(selectedNode.id, 'functionName', functionData.name || functionData.funcName);
      onNodeDataChange(selectedNode.id, 'label', functionData.name || functionData.funcName || 'Function');
      if (functionData.description) {
        onNodeDataChange(selectedNode.id, 'description', functionData.description);
      }
      setShowFunctionDropdown(false);
      setFunctionSearchTerm('');
    }
  };
  
  // Effect to listen for custom events to open broker section
  useEffect(() => {
    const handleOpenBrokerSection = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (selectedNode && customEvent.detail.nodeId === selectedNode.id) {
        setShowBrokerSection(true);
      }
    };
    
    document.addEventListener('open-broker-section', handleOpenBrokerSection);
    
    return () => {
      document.removeEventListener('open-broker-section', handleOpenBrokerSection);
    };
  }, [selectedNode]);
  
  if (!selectedNode) return null;

  // Group properties by categories for better organization
  const propertyGroups = {
    basic: ['label', 'subLabel', 'description'],
    connection: ['endpoint', 'connectionStatus', 'method', 'query'],
    behavior: ['action', 'transformationType', 'operation', 'condition', 'loopType', 'collection', 'duration'],
    status: ['deliveryStatus', 'progress', 'active', 'connected', 'hasError', 'taskStatus', 'eventStatus'],
    other: [] as string[]
  };

  // Sort properties into groups, put unmatched ones in 'other'
  const sortedProperties = Object.entries(selectedNode.data)
    .filter(([key]) => typeof selectedNode.data[key] !== "object" && 
                       key !== 'brokerInputs' && 
                       key !== 'brokerOutputs')
    .reduce((acc, [key]) => {
      let matched = false;
      for (const group in propertyGroups) {
        if (propertyGroups[group].includes(key)) {
          matched = true;
          break;
        }
      }
      if (!matched && key !== 'label') {
        propertyGroups.other.push(key);
      }
      return acc;
    }, {});

  // Format property label for better display
  const formatPropertyLabel = (key: string) => {
    return key.charAt(0).toUpperCase() + 
      key.slice(1).replace(/([A-Z])/g, " $1");
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-180px)] overflow-y-auto w-[350px]">
      {/* Header with title and close button */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" 
               style={{ backgroundColor: getNodeColor(selectedNode.type) }}></div>
          {selectedNode.data.label || selectedNode.type}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Node type information */}
      <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Type: <span className="font-medium">{selectedNode.type}</span>
      </div>

      {/* Function Selector for genericFunction nodes */}
      {selectedNode.type === 'genericFunction' && (
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Database Function
            </h4>
            {registeredFunctionIsLoading && (
              <Loader className="h-3 w-3 text-indigo-500 animate-spin" />
            )}
          </div>
          
          {/* Current Function Display */}
          {selectedNode.data.functionId ? (
            <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <div className="text-xs text-green-600 dark:text-green-400 mb-1">Selected Function:</div>
              <div className="text-sm font-medium text-green-900 dark:text-green-100">
                {selectedNode.data.functionName || selectedNode.data.functionId}
              </div>
              {selectedNode.data.description && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {selectedNode.data.description}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                No function selected. Choose from {Object.keys(registeredFunctionRecords).length} available functions.
              </div>
            </div>
          )}

          {/* Function Selection Button */}
          <button
            onClick={() => setShowFunctionDropdown(!showFunctionDropdown)}
            className="w-full px-3 py-2 text-sm bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded transition-colors flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            {selectedNode.data.functionId ? 'Change Function' : 'Select Function'}
          </button>

          {/* Function Dropdown */}
          {showFunctionDropdown && (
            <div className="mt-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search functions..."
                    value={functionSearchTerm}
                    onChange={(e) => setFunctionSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* Function List */}
              <div className="max-h-64 overflow-y-auto">
                {registeredFunctionIsLoading ? (
                  <div className="p-4 text-center">
                    <Loader className="h-5 w-5 text-gray-400 animate-spin mx-auto mb-2" />
                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading functions...</div>
                  </div>
                ) : filteredFunctions.length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {functionSearchTerm ? `No functions found matching "${functionSearchTerm}"` : 'No functions available'}
                    </div>
                  </div>
                ) : (
                  <div className="p-2">
                    {filteredFunctions.map((func) => (
                      <button
                        key={func.id}
                        onClick={() => handleFunctionSelect(func)}
                        className="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {func.name || func.funcName}
                        </div>
                        {func.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {func.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          ID: {func.id}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Property groups */}
      {Object.entries(propertyGroups).map(([groupName, properties]) => {
        const filteredProps = properties.filter(key => 
          key in selectedNode.data && (key !== 'label' || groupName === 'basic')
        );
        
        if (filteredProps.length === 0) return null;
        
        return (
          <div key={groupName} className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
              {groupName} Properties
            </h4>
            <div className="space-y-3">
              {filteredProps.map(key => (
                <div key={key} className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {formatPropertyLabel(key)}
                  </label>
                  {key === 'description' ? (
                    <textarea
                      value={selectedNode.data[key]?.toString() || ""}
                      rows={2}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      onChange={(e) => onNodeDataChange(selectedNode.id, key, e.target.value)}
                    />
                  ) : typeof selectedNode.data[key] === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={!!selectedNode.data[key]}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                      onChange={(e) => onNodeDataChange(selectedNode.id, key, e.target.checked)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={selectedNode.data[key]?.toString() || ""}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      onChange={(e) => onNodeDataChange(selectedNode.id, key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      
      {/* Broker Mappings Toggle Button */}
      <div className="mt-6 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowBrokerSection(!showBrokerSection)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Broker Mappings
          </div>
          <div className="text-xs bg-purple-200 dark:bg-purple-800 px-2 py-0.5 rounded-full">
            {Object.keys(selectedNode.data.brokerInputs || {}).length + 
             Object.keys(selectedNode.data.brokerOutputs || {}).length || 0}
          </div>
        </button>
      </div>

      {/* Broker Mappings Section */}
      {showBrokerSection && (
        <BrokerMappingPanel 
          selectedNode={selectedNode}
          onNodeDataChange={onNodeDataChange}
        />
      )}
      
      {/* Delete Button Section */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onNodeDelete(selectedNode.id)}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded w-full justify-center transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete Node
        </button>
      </div>
    </div>
  );
};

// BrokerMappingPanel Component
const BrokerMappingPanel: React.FC<{
  selectedNode: Node<NodeData>;
  onNodeDataChange: (nodeId: string, key: string, value: any) => void;
}> = ({ selectedNode, onNodeDataChange }) => {
  // Initialize broker inputs/outputs if they don't exist
  // Make sure these are initialized as objects, not undefined
  const brokerInputs = selectedNode.data.brokerInputs || {};
  const brokerOutputs = selectedNode.data.brokerOutputs || {};

  // Function to handle adding a new input mapping
  const addInputMapping = () => {
    // Ensure we have a brokerInputs object before adding to it
    if (!selectedNode.data.brokerInputs) {
      onNodeDataChange(selectedNode.id, "brokerInputs", { [`param1`]: "" });
    } else {
      const updatedInputs = { 
        ...brokerInputs,
        [`param${Object.keys(brokerInputs).length + 1}`]: ""
      };
      onNodeDataChange(selectedNode.id, "brokerInputs", updatedInputs);
    }
  };

  // Function to handle adding a new output mapping
  const addOutputMapping = () => {
    // Ensure we have a brokerOutputs object before adding to it
    if (!selectedNode.data.brokerOutputs) {
      onNodeDataChange(selectedNode.id, "brokerOutputs", { [`result1`]: "" });
    } else {
      const updatedOutputs = { 
        ...brokerOutputs,
        [`result${Object.keys(brokerOutputs).length + 1}`]: ""
      };
      onNodeDataChange(selectedNode.id, "brokerOutputs", updatedOutputs);
    }
  };

  // Function to update an input mapping
  const updateInputMapping = (paramName: string, brokerId: string) => {
    const updatedInputs = { ...brokerInputs, [paramName]: brokerId };
    onNodeDataChange(selectedNode.id, "brokerInputs", updatedInputs);
  };

  // Function to update an output mapping
  const updateOutputMapping = (resultName: string, brokerId: string) => {
    const updatedOutputs = { ...brokerOutputs, [resultName]: brokerId };
    onNodeDataChange(selectedNode.id, "brokerOutputs", updatedOutputs);
  };

  // Function to remove an input mapping
  const removeInputMapping = (paramName: string) => {
    const updatedInputs = { ...brokerInputs };
    delete updatedInputs[paramName];
    onNodeDataChange(selectedNode.id, "brokerInputs", updatedInputs);
  };

  // Function to remove an output mapping
  const removeOutputMapping = (resultName: string) => {
    const updatedOutputs = { ...brokerOutputs };
    delete updatedOutputs[resultName];
    onNodeDataChange(selectedNode.id, "brokerOutputs", updatedOutputs);
  };

  return (
    <div className="mb-4">
      {/* Input Mappings */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400">Input Parameters</h5>
          <button 
            onClick={addInputMapping}
            className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <PlusCircle className="h-3 w-3" />
            Add
          </button>
        </div>
        
        {Object.keys(brokerInputs).length === 0 ? (
          <div className="text-xs italic text-gray-500 dark:text-gray-400 mb-2">
            No input parameters mapped
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(brokerInputs).map(([paramName, brokerId]) => (
              <div key={paramName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={paramName}
                  placeholder="Parameter name"
                  className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  onChange={(e) => {
                    const updatedInputs = { ...brokerInputs };
                    delete updatedInputs[paramName];
                    updatedInputs[e.target.value] = brokerId;
                    onNodeDataChange(selectedNode.id, "brokerInputs", updatedInputs);
                  }}
                />
                <Link className="h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  value={brokerId}
                  placeholder="Broker ID"
                  className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  onChange={(e) => updateInputMapping(paramName, e.target.value)}
                />
                <button
                  onClick={() => removeInputMapping(paramName)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Output Mappings */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400">Output Results</h5>
          <button 
            onClick={addOutputMapping}
            className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <PlusCircle className="h-3 w-3" />
            Add
          </button>
        </div>
        
        {Object.keys(brokerOutputs).length === 0 ? (
          <div className="text-xs italic text-gray-500 dark:text-gray-400">
            No output results mapped
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(brokerOutputs).map(([resultName, brokerId]) => (
              <div key={resultName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={resultName}
                  placeholder="Result name"
                  className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  onChange={(e) => {
                    const updatedOutputs = { ...brokerOutputs };
                    delete updatedOutputs[resultName];
                    updatedOutputs[e.target.value] = brokerId;
                    onNodeDataChange(selectedNode.id, "brokerOutputs", updatedOutputs);
                  }}
                />
                <Link className="h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  value={brokerId}
                  placeholder="Broker ID"
                  className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  onChange={(e) => updateOutputMapping(resultName, e.target.value)}
                />
                <button
                  onClick={() => removeOutputMapping(resultName)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get node color based on type
function getNodeColor(nodeType: string): string {
  switch (nodeType) {
    case 'trigger': return '#f87171';
    case 'agent': return '#93c5fd';
    case 'database': return '#67e8f9';
    case 'api': return '#818cf8';
    case 'transform': return '#6ee7b7';
    case 'conditional': return '#c084fc';
    case 'loop': return '#fbbf24';
    case 'delay': return '#60a5fa';
    case 'email': return '#60a5fa';
    case 'fileOperation': return '#4ade80';
    case 'authentication': return '#c084fc';
    case 'webhook': return '#facc15';
    case 'personalTask': return '#34d399';
    case 'calendarEvent': return '#38bdf8';
    default: return '#94a3b8';
  }
}

export default NodePropertyPanel; 