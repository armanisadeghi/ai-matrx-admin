"use client";
import { Node } from "reactflow";
import { NodeData } from "../WorkflowEditor";
import { X, Package } from "lucide-react";

interface BrokerMappingsSectionProps {
  selectedNode: Node<NodeData>;
  onNodeDataChange: (nodeId: string, key: string, value: any) => void;
}

const BrokerMappingsSection: React.FC<BrokerMappingsSectionProps> = ({ 
  selectedNode, 
  onNodeDataChange 
}) => {
  return (
    <div className="mt-8 p-6 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
      <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-6 flex items-center gap-3">
        <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        Broker Mappings
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Mappings */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">Input Parameters</h4>
            <button 
              onClick={() => {
                const inputs = selectedNode.data.brokerInputs || {};
                const newInputs = { ...inputs, [`param${Object.keys(inputs).length + 1}`]: "" };
                onNodeDataChange(selectedNode.id, "brokerInputs", newInputs);
              }}
              className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white rounded-lg transition-colors"
            >
              + Add Input
            </button>
          </div>
          
          <div className="space-y-2">
            {Object.entries(selectedNode.data.brokerInputs || {}).map(([paramName, brokerId]) => (
              <div
                key={paramName}
                className="grid grid-cols-5 gap-2 items-center p-3 bg-textured rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <input
                  type="text"
                  value={paramName}
                  placeholder="Parameter name"
                  className="col-span-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                  onChange={(e) => {
                    const inputs = { ...selectedNode.data.brokerInputs };
                    delete inputs[paramName];
                    inputs[e.target.value] = brokerId;
                    onNodeDataChange(selectedNode.id, "brokerInputs", inputs);
                  }}
                />
                <div className="text-center text-gray-400 dark:text-gray-500 font-medium">→</div>
                <input
                  type="text"
                  value={brokerId}
                  placeholder="Broker ID"
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                  onChange={(e) => {
                    const inputs = { ...selectedNode.data.brokerInputs, [paramName]: e.target.value };
                    onNodeDataChange(selectedNode.id, "brokerInputs", inputs);
                  }}
                />
                <button
                  onClick={() => {
                    const inputs = { ...selectedNode.data.brokerInputs };
                    delete inputs[paramName];
                    onNodeDataChange(selectedNode.id, "brokerInputs", inputs);
                  }}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {Object.keys(selectedNode.data.brokerInputs || {}).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic bg-textured rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                No input parameters mapped
                <div className="text-xs mt-1 text-gray-400 dark:text-gray-500">Click "Add Input" to create parameter mappings</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Output Mappings */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">Output Results</h4>
            <button 
              onClick={() => {
                const outputs = selectedNode.data.brokerOutputs || {};
                const newOutputs = { ...outputs, [`result${Object.keys(outputs).length + 1}`]: "" };
                onNodeDataChange(selectedNode.id, "brokerOutputs", newOutputs);
              }}
              className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white rounded-lg transition-colors"
            >
              + Add Output
            </button>
          </div>
          
          <div className="space-y-2">
            {Object.entries(selectedNode.data.brokerOutputs || {}).map(([resultName, brokerId]) => (
              <div
                key={resultName}
                className="grid grid-cols-5 gap-2 items-center p-3 bg-textured rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <input
                  type="text"
                  value={resultName}
                  placeholder="Result name"
                  className="col-span-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                  onChange={(e) => {
                    const outputs = { ...selectedNode.data.brokerOutputs };
                    delete outputs[resultName];
                    outputs[e.target.value] = brokerId;
                    onNodeDataChange(selectedNode.id, "brokerOutputs", outputs);
                  }}
                />
                <div className="text-center text-gray-400 dark:text-gray-500 font-medium">→</div>
                <input
                  type="text"
                  value={brokerId}
                  placeholder="Broker ID"
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                  onChange={(e) => {
                    const outputs = { ...selectedNode.data.brokerOutputs, [resultName]: e.target.value };
                    onNodeDataChange(selectedNode.id, "brokerOutputs", outputs);
                  }}
                />
                <button
                  onClick={() => {
                    const outputs = { ...selectedNode.data.brokerOutputs };
                    delete outputs[resultName];
                    onNodeDataChange(selectedNode.id, "brokerOutputs", outputs);
                  }}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {Object.keys(selectedNode.data.brokerOutputs || {}).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic bg-textured rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                No output results mapped
                <div className="text-xs mt-1 text-gray-400 dark:text-gray-500">Click "Add Output" to create result mappings</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerMappingsSection; 