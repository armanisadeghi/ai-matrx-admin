"use client";
import { Node } from "reactflow";
import { NodeData } from "../WorkflowEditor";
import { Trash2, X, Minimize2 } from "lucide-react";
import FunctionSelectorSection from "./FunctionSelectorSection";
import PropertyGroupsSection from "./PropertyGroupsSection";
import BrokerMappingsSection from "./BrokerMappingsSection";

interface ExpandedNodePropertyPanelProps {
    selectedNode: Node<NodeData> | null;
    onNodeDataChange: (nodeId: string, key: string, value: any) => void;
    onNodeDelete: (nodeId: string) => void;
    onClose: () => void;
    onToggleCompact?: () => void;
}

const ExpandedNodePropertyPanel: React.FC<ExpandedNodePropertyPanelProps> = ({ 
    selectedNode, 
    onNodeDataChange, 
    onNodeDelete, 
    onClose,
    onToggleCompact
}) => {
    if (!selectedNode) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: getNodeColor(selectedNode.type) }}></div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {selectedNode.data.label || selectedNode.type}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Node Type: <span className="font-medium capitalize">{selectedNode.type}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Minimize Button */}
                        {onToggleCompact && (
                            <button
                                onClick={onToggleCompact}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Switch to compact view"
                            >
                                <Minimize2 className="w-5 h-5" />
                            </button>
                        )}
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Close panel"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto p-6">
                        {/* Function Selector Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <FunctionSelectorSection 
                                selectedNode={selectedNode}
                                onNodeDataChange={onNodeDataChange}
                            />
                            
                            {/* Property Groups Section */}
                            <PropertyGroupsSection 
                                selectedNode={selectedNode}
                                onNodeDataChange={onNodeDataChange}
                            />
                        </div>

                        {/* Broker Mappings Section */}
                        <BrokerMappingsSection 
                            selectedNode={selectedNode}
                            onNodeDataChange={onNodeDataChange}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <button
                        onClick={() => onNodeDelete(selectedNode.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                        <Trash2 className="h-5 w-5" />
                        Delete Node
                    </button>

                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper function to get node color based on type
function getNodeColor(nodeType: string): string {
    switch (nodeType) {
        case "trigger":
            return "#f87171";
        case "agent":
            return "#93c5fd";
        case "database":
            return "#67e8f9";
        case "api":
            return "#818cf8";
        case "transform":
            return "#6ee7b7";
        case "conditional":
            return "#c084fc";
        case "loop":
            return "#fbbf24";
        case "delay":
            return "#60a5fa";
        case "email":
            return "#60a5fa";
        case "fileOperation":
            return "#4ade80";
        case "authentication":
            return "#c084fc";
        case "webhook":
            return "#facc15";
        case "personalTask":
            return "#34d399";
        case "calendarEvent":
            return "#38bdf8";
        case "genericFunction":
            return "#a855f7";
        case "recipe":
            return "#8b5cf6";
        case "processor":
            return "#f59e0b";
        default:
            return "#94a3b8";
    }
}

export default ExpandedNodePropertyPanel;
