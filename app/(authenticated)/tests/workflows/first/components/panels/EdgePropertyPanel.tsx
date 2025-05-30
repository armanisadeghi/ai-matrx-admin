"use client";
import { Edge } from "reactflow";
import { Trash2, X, ArrowRight } from "lucide-react";
import { useTheme } from "@/styles/themes/ThemeProvider";

interface EdgePropertyPanelProps {
  selectedEdge: Edge | null;
  onEdgeDataChange: (edgeId: string, key: string, value: any) => void;
  onEdgeDelete: (edgeId: string) => void;
  onClose: () => void;
}

const EdgePropertyPanel: React.FC<EdgePropertyPanelProps> = ({
  selectedEdge,
  onEdgeDataChange,
  onEdgeDelete,
  onClose
}) => {
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';
  
  if (!selectedEdge) return null;

  // Common edge properties to edit, organized by sections
  const edgePropertyGroups = {
    appearance: [
      { key: "label", label: "Label", type: "text" },
      { key: "style.strokeWidth", label: "Width", type: "number" },
      { key: "style.stroke", label: "Color", type: "color" }
    ],
    behavior: [
      { key: "animated", label: "Animated", type: "checkbox" },
      { key: "type", label: "Type", type: "select", options: [
        { value: "default", label: "Default" },
        { value: "step", label: "Step" },
        { value: "smoothstep", label: "Smooth Step" },
        { value: "straight", label: "Straight" }
      ]}
    ]
  };
  
  // Get nested property value
  const getNestedValue = (obj: any, path: string) => {
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }
    
    return value;
  };
  
  // Set nested property value
  const setNestedValue = (edgeId: string, path: string, value: any) => {
    const parts = path.split('.');
    
    if (parts.length === 1) {
      // Direct property
      onEdgeDataChange(edgeId, path, value);
    } else {
      // Nested property (like style.stroke)
      const mainProp = parts[0];
      const subProp = parts[1];
      const currentValue = selectedEdge[mainProp] || {};
      
      onEdgeDataChange(edgeId, mainProp, {
        ...currentValue,
        [subProp]: value
      });
    }
  };

  // Get current edge style for preview
  const edgeStrokeColor = getNestedValue(selectedEdge, 'style.stroke') || '#b1b1b7';
  const edgeStrokeWidth = getNestedValue(selectedEdge, 'style.strokeWidth') || 2;
  const edgeLabel = selectedEdge.label || '';

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-180px)] overflow-y-auto w-[350px]">
      {/* Header with title and close button */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Edge Properties
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Connection preview */}
      <div className="mb-6 bg-gray-50 dark:bg-gray-900 p-3 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <div className="truncate max-w-[120px]">{selectedEdge.source}</div>
          <div className="flex-1 flex justify-center items-center">
            <div className="relative h-0.5 w-full" style={{ 
              backgroundColor: edgeStrokeColor,
              height: `${Math.min(edgeStrokeWidth, 6)}px`
            }}>
              {edgeLabel && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 text-xs border border-gray-200 dark:border-gray-700 rounded">
                  {edgeLabel}
                </div>
              )}
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 ml-1" style={{ color: edgeStrokeColor }} />
          </div>
          <div className="truncate max-w-[120px]">{selectedEdge.target}</div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
          <div>Source</div>
          <div>Target</div>
        </div>
      </div>

      {/* Property groups */}
      {Object.entries(edgePropertyGroups).map(([groupName, properties]) => (
        <div key={groupName} className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
            {groupName}
          </h4>
          <div className="space-y-3">
            {properties.map((prop) => {
              const value = getNestedValue(selectedEdge, prop.key);
              
              return (
                <div key={prop.key} className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {prop.label}
                  </label>
                  
                  {prop.type === 'checkbox' && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => setNestedValue(selectedEdge.id, prop.key, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                        {value ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}
                  
                  {prop.type === 'text' && (
                    <input
                      type="text"
                      value={value || ''}
                      onChange={(e) => setNestedValue(selectedEdge.id, prop.key, e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  )}
                  
                  {prop.type === 'number' && (
                    <input
                      type="number"
                      value={value || 2}
                      min={1}
                      max={10}
                      onChange={(e) => setNestedValue(selectedEdge.id, prop.key, parseInt(e.target.value))}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  )}
                  
                  {prop.type === 'color' && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={value || '#b1b1b7'}
                        onChange={(e) => setNestedValue(selectedEdge.id, prop.key, e.target.value)}
                        className="h-8 w-8 rounded border border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={value || '#b1b1b7'}
                        onChange={(e) => setNestedValue(selectedEdge.id, prop.key, e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  )}
                  
                  {prop.type === 'select' && (
                    <select
                      value={value || 'default'}
                      onChange={(e) => setNestedValue(selectedEdge.id, prop.key, e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {prop.options?.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Delete Button Section */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onEdgeDelete(selectedEdge.id)}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded w-full justify-center transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete Edge
        </button>
      </div>
    </div>
  );
};

export default EdgePropertyPanel; 