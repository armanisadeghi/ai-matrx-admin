"use client";
import { Node } from "reactflow";
import { NodeData } from "../WorkflowEditor";

interface PropertyGroupsSectionProps {
  selectedNode: Node<NodeData>;
  onNodeDataChange: (nodeId: string, key: string, value: any) => void;
}

const PropertyGroupsSection: React.FC<PropertyGroupsSectionProps> = ({ 
  selectedNode, 
  onNodeDataChange 
}) => {
  // Group properties by categories for better organization
  const propertyGroups = {
    basic: ["label", "subLabel", "description"],
    connection: ["endpoint", "connectionStatus", "method", "query"],
    behavior: ["action", "transformationType", "operation", "condition", "loopType", "collection", "duration"],
    status: ["deliveryStatus", "progress", "active", "connected", "hasError", "taskStatus", "eventStatus"],
    other: [] as string[],
  };

  // Sort properties into groups, put unmatched ones in 'other'
  Object.entries(selectedNode.data)
    .filter(([key]) => typeof selectedNode.data[key] !== "object" && key !== "brokerInputs" && key !== "brokerOutputs")
    .forEach(([key]) => {
      let matched = false;
      for (const group in propertyGroups) {
        if (propertyGroups[group].includes(key)) {
          matched = true;
          break;
        }
      }
      if (!matched && key !== "label") {
        propertyGroups.other.push(key);
      }
    });

  // Format property label for better display
  const formatPropertyLabel = (key: string) => {
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
  };

  return (
    <>
      {Object.entries(propertyGroups).map(([groupName, properties]) => {
        const filteredProps = properties.filter(
          (key) => key in selectedNode.data && (key !== "label" || groupName === "basic")
        );

        if (filteredProps.length === 0) return null;

        return (
          <div key={groupName} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 capitalize">
              {groupName} Properties
            </h3>
            <div className="space-y-4">
              {filteredProps.map((key) => (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatPropertyLabel(key)}
                  </label>
                  {key === "description" ? (
                    <textarea
                      value={selectedNode.data[key]?.toString() || ""}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      onChange={(e) => onNodeDataChange(selectedNode.id, key, e.target.value)}
                    />
                  ) : typeof selectedNode.data[key] === "boolean" ? (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!selectedNode.data[key]}
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                        onChange={(e) => onNodeDataChange(selectedNode.id, key, e.target.checked)}
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        {selectedNode.data[key] ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  ) : (
                    <input
                      type="text"
                      value={selectedNode.data[key]?.toString() || ""}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      onChange={(e) => onNodeDataChange(selectedNode.id, key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default PropertyGroupsSection; 