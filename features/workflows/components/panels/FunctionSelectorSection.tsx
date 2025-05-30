"use client";
import { Node } from "reactflow";
import { NodeData } from "../WorkflowEditor";
import { Database, Search, Loader } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRegisteredFunctionWithFetch } from "@/lib/redux/entity/hooks/functions-and-args";

interface FunctionSelectorSectionProps {
  selectedNode: Node<NodeData>;
  onNodeDataChange: (nodeId: string, key: string, value: any) => void;
}

const FunctionSelectorSection: React.FC<FunctionSelectorSectionProps> = ({ 
  selectedNode, 
  onNodeDataChange 
}) => {
  const [functionSearchTerm, setFunctionSearchTerm] = useState("");
  const [showFunctionDropdown, setShowFunctionDropdown] = useState(false);

  // Real database functions for genericFunction nodes
  const { 
    registeredFunctionRecords, 
    registeredFunctionIsLoading, 
    registeredFunctionIsError, 
    fetchRegisteredFunctionAll 
  } = useRegisteredFunctionWithFetch();

  // Fetch functions when panel opens for genericFunction nodes
  useEffect(() => {
    if (
      selectedNode?.type === "genericFunction" &&
      Object.keys(registeredFunctionRecords).length === 0 &&
      !registeredFunctionIsLoading
    ) {
      fetchRegisteredFunctionAll();
    }
  }, [selectedNode, registeredFunctionRecords, registeredFunctionIsLoading, fetchRegisteredFunctionAll]);

  // Filter functions based on search term
  const filteredFunctions = useMemo(() => {
    const functions = Object.values(registeredFunctionRecords);

    if (!functionSearchTerm) return functions.slice(0, 20); // Show more for expanded view

    const search = functionSearchTerm.toLowerCase();
    return functions
      .filter((func) => func.name?.toLowerCase().includes(search) || func.description?.toLowerCase().includes(search))
      .slice(0, 20);
  }, [registeredFunctionRecords, functionSearchTerm]);

  // Handle function selection
  const handleFunctionSelect = (functionData: any) => {
    if (selectedNode) {
      onNodeDataChange(selectedNode.id, "functionId", functionData.id);
      onNodeDataChange(selectedNode.id, "functionName", functionData.name);
      onNodeDataChange(selectedNode.id, "label", functionData.name || "Function");
      if (functionData.description) {
        onNodeDataChange(selectedNode.id, "description", functionData.description);
      }
      setShowFunctionDropdown(false);
      setFunctionSearchTerm("");
    }
  };

  // Only show for genericFunction nodes
  if (selectedNode.type !== "genericFunction") {
    return null;
  }

  return (
    <div className="lg:col-span-2 p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
          Database Function Configuration
        </h3>
        {registeredFunctionIsLoading && (
          <Loader className="h-5 w-5 text-indigo-500 dark:text-indigo-400 animate-spin" />
        )}
      </div>

      {/* Current Function Display */}
      {selectedNode.data.functionId ? (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="text-sm text-green-600 dark:text-green-400 mb-2">Selected Function:</div>
          <div className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
            {selectedNode.data.functionName || selectedNode.data.functionId}
          </div>
          {selectedNode.data.description && (
            <div className="text-sm text-green-600 dark:text-green-400">
              {selectedNode.data.description}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            No function selected. Choose from available functions below.
          </div>
        </div>
      )}

      {/* Function Selection */}
      <div className="space-y-4">
        <button
          onClick={() => setShowFunctionDropdown(!showFunctionDropdown)}
          className="w-full px-4 py-3 text-left bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {selectedNode.data.functionId ? "Change Function" : "Select Function"}
          </span>
          <span className="text-sm text-indigo-600 dark:text-indigo-400">
            {Object.keys(registeredFunctionRecords).length} available
          </span>
        </button>

        {/* Function Dropdown */}
        {showFunctionDropdown && (
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search functions by name or description..."
                  value={functionSearchTerm}
                  onChange={(e) => setFunctionSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Function List */}
            <div className="max-h-80 overflow-y-auto">
              {registeredFunctionIsLoading ? (
                <div className="p-8 text-center">
                  <Loader className="h-8 w-8 text-gray-400 dark:text-gray-500 animate-spin mx-auto mb-4" />
                  <div className="text-gray-500 dark:text-gray-400">Loading functions...</div>
                </div>
              ) : filteredFunctions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    {functionSearchTerm
                      ? `No functions found matching "${functionSearchTerm}"`
                      : "No functions available"}
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  {filteredFunctions.map((func) => (
                    <button
                      key={func.id}
                      onClick={() => handleFunctionSelect(func)}
                      className="w-full text-left p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {func.name}
                      </div>
                      {func.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {func.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 dark:text-gray-500">
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
    </div>
  );
};

export default FunctionSelectorSection; 