// TaskStructureExplorer.tsx
import React, { useState } from 'react';

interface TaskStructureExplorerProps {
  structure: any;
  currentPath: string;
  isResponseActive: boolean;
  onNavigateTo: (path: string) => void;
  onRemoveField: (path: string, key: string) => void;
  onEditField: (path: string, key: string, value: any) => void;
}

interface EditingState {
  path: string | null;
  value: string;
  type: string;
}

const TaskStructureExplorer: React.FC<TaskStructureExplorerProps> = ({
  structure,
  currentPath,
  isResponseActive,
  onNavigateTo,
  onRemoveField,
  onEditField
}) => {
  const [editing, setEditing] = useState<EditingState>({
    path: null,
    value: '',
    type: 'string'
  });

  // Start editing a field
  const startEditing = (path: string, key: string, value: any) => {
    const fullPath = path ? `${path}.${key}` : key;
    let valueType = "string";
    let stringValue = "";
    
    if (typeof value === "number") {
      valueType = "number";
      stringValue = value.toString();
    } else if (typeof value === "boolean") {
      valueType = "boolean";
      stringValue = value.toString();
    } else if (Array.isArray(value)) {
      valueType = "array";
      stringValue = JSON.stringify(value);
    } else if (value && typeof value === "object") {
      valueType = "object";
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }
    
    setEditing({
      path: fullPath,
      value: stringValue,
      type: valueType
    });
  };
  
  // Save edited field
  const saveEdit = () => {
    if (!editing.path) return;
    
    const pathParts = editing.path.split('.');
    const fieldName = pathParts.pop() || '';
    const fieldPath = pathParts.join('.');
    
    let parsedValue;
    try {
      switch (editing.type) {
        case "number":
          parsedValue = Number(editing.value);
          break;
        case "boolean":
          parsedValue = editing.value.toLowerCase() === "true";
          break;
        case "array":
          try {
            parsedValue = JSON.parse(editing.value);
            if (!Array.isArray(parsedValue)) {
              throw new Error('Not an array');
            }
          } catch (e) {
            alert('Invalid JSON array format');
            return;
          }
          break;
        case "object":
          try {
            parsedValue = JSON.parse(editing.value);
            if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
              throw new Error('Not an object');
            }
          } catch (e) {
            alert('Invalid JSON object format');
            return;
          }
          break;
        default:
          parsedValue = editing.value;
      }
    } catch (e) {
      alert(`Error parsing value: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    
    onEditField(fieldPath, fieldName, parsedValue);
    setEditing({ path: null, value: '', type: 'string' });
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditing({ path: null, value: '', type: 'string' });
  };

  // Detect type from input
  const detectTypeFromInput = (value: string) => {
    if (value.startsWith('[') && value.endsWith(']') && editing.type !== 'array') {
      try {
        JSON.parse(value);
        if (window.confirm('This looks like an array. Switch to array type?')) {
          setEditing(prev => ({ ...prev, type: 'array' }));
        }
      } catch {}
    } else if (value.startsWith('{') && value.endsWith('}') && editing.type !== 'object') {
      try {
        JSON.parse(value);
        if (window.confirm('This looks like an object. Switch to object type?')) {
          setEditing(prev => ({ ...prev, type: 'object' }));
        }
      } catch {}
    } else if (!isNaN(Number(value)) && editing.type !== 'number' && /^\d+(\.\d+)?$/.test(value)) {
      if (window.confirm('This looks like a number. Switch to number type?')) {
        setEditing(prev => ({ ...prev, type: 'number' }));
      }
    } else if ((value === 'true' || value === 'false') && editing.type !== 'boolean') {
      if (window.confirm('This looks like a boolean. Switch to boolean type?')) {
        setEditing(prev => ({ ...prev, type: 'boolean' }));
      }
    }
  };

  // Recursive function to render object structure
  const renderObjectStructure = (obj: any, path: string = "") => {
    if (!obj || typeof obj !== "object") return null;

    return (
      <div className="pl-4 border-l border-gray-200 dark:border-gray-700">
        {Object.keys(obj).map((key) => {
          const newPath = path ? `${path}.${key}` : key;
          const value = obj[key];
          const isEditing = editing.path === newPath;

          if (value && typeof value === "object" && !Array.isArray(value)) {
            return (
              <div key={key} className="mt-2">
                <div className="flex items-center">
                  <button
                    onClick={() => onNavigateTo(newPath)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center"
                    disabled={isResponseActive}
                  >
                    {key} <span className="text-xs ml-1">&#x1F4C1;</span>
                  </button>
                  {!isResponseActive && (
                    <div className="flex ml-2">
                      <button
                        onClick={() => onRemoveField(path, key)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                {renderObjectStructure(value, newPath)}
              </div>
            );
          } else {
            if (isEditing) {
              return (
                <div key={key} className="mt-1 space-y-2 pt-1 pb-2 px-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <div className="font-medium">{key}</div>
                  <div className="flex items-center space-x-2">
                    <select 
                      value={editing.type} 
                      onChange={(e) => setEditing(prev => ({ ...prev, type: e.target.value }))}
                      className="p-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array">Array</option>
                      <option value="object">Object</option>
                    </select>
                    <input
                      type="text"
                      value={editing.value}
                      onChange={(e) => {
                        setEditing(prev => ({ ...prev, value: e.target.value }));
                        detectTypeFromInput(e.target.value);
                      }}
                      className="flex-1 p-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEdit}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-2 py-1 text-xs bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={key} className="mt-1 flex items-center group">
                  <span className="font-medium">{key}: </span>
                  <span 
                    className={`ml-1 text-gray-600 dark:text-gray-400 ${isResponseActive ? '' : 'cursor-pointer hover:underline hover:text-blue-500 dark:hover:text-blue-400'}`}
                    onClick={() => !isResponseActive && startEditing(path, key, value)}
                    title={isResponseActive ? undefined : "Click to edit"}
                  >
                    {Array.isArray(value)
                      ? `[Array(${value.length})]`
                      : typeof value === "object" && value !== null
                      ? "{Object}"
                      : String(value)}
                  </span>
                  {!isResponseActive && (
                    <div className="ml-2 flex space-x-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => startEditing(path, key, value)}
                        className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onRemoveField(path, key)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-300 text-sm"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            }
          }
        })}
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Structure Explorer</h3>
      <div
        className={`bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 min-h-[200px] ${
          isResponseActive ? "opacity-75" : ""
        }`}
      >
        {renderObjectStructure(structure, currentPath)}
      </div>
    </div>
  );
};

export default TaskStructureExplorer;