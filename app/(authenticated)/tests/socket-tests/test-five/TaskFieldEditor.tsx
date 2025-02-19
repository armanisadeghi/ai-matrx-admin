// TaskFieldEditor.tsx
import React, { useState } from 'react';

interface TaskFieldEditorProps {
  currentPath: string;
  isResponseActive: boolean;
  onAddField: (key: string, value: any, type: string) => void;
}

const TaskFieldEditor: React.FC<TaskFieldEditorProps> = ({ 
  currentPath, 
  isResponseActive,
  onAddField
}) => {
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [newFieldType, setNewFieldType] = useState("string");

  const handleAddField = () => {
    if (!newFieldKey) return;
    
    // Auto-type detection
    let detectedType = newFieldType;
    if (newFieldType === "string") {
      // Detect arrays
      if (newFieldValue.trim().startsWith('[') && newFieldValue.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(newFieldValue);
          if (Array.isArray(parsed) && window.confirm('This looks like an array. Do you want to save it as an array type?')) {
            detectedType = "array";
          }
        } catch {}
      } 
      // Detect objects
      else if (newFieldValue.trim().startsWith('{') && newFieldValue.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(newFieldValue);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 
              window.confirm('This looks like an object. Do you want to save it as an object type?')) {
            detectedType = "object";
          }
        } catch {}
      }
      // Detect numbers
      else if (!isNaN(Number(newFieldValue)) && /^\d+(\.\d+)?$/.test(newFieldValue)) {
        if (window.confirm('This looks like a number. Do you want to save it as a number type?')) {
          detectedType = "number";
        }
      }
      // Detect booleans
      else if (newFieldValue === 'true' || newFieldValue === 'false') {
        if (window.confirm('This looks like a boolean. Do you want to save it as a boolean type?')) {
          detectedType = "boolean";
        }
      }
    }

    let parsedValue;
    try {
      switch (detectedType) {
        case "number":
          parsedValue = Number(newFieldValue);
          break;
        case "boolean":
          parsedValue = newFieldValue.toLowerCase() === "true";
          break;
        case "array":
          try {
            parsedValue = JSON.parse(newFieldValue || '[]');
            if (!Array.isArray(parsedValue)) {
              throw new Error('Not an array');
            }
          } catch (e) {
            console.warn('Invalid JSON array format');
            if (window.confirm('Invalid JSON array format. Use empty array instead?')) {
              parsedValue = [];
            } else {
              parsedValue = newFieldValue; // Keep as string if user declines
            }
          }
          break;
        case "object":
          try {
            parsedValue = JSON.parse(newFieldValue || '{}');
            if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
              throw new Error('Not an object');
            }
          } catch (e) {
            console.warn('Invalid JSON object format');
            if (window.confirm('Invalid JSON object format. Use empty object instead?')) {
              parsedValue = {};
            } else {
              parsedValue = newFieldValue; // Keep as string if user declines
            }
          }
          break;
        default:
          parsedValue = newFieldValue;
      }
    } catch (e) {
      console.warn('Error parsing field value', e);
      parsedValue = newFieldValue;
    }

    onAddField(newFieldKey, parsedValue, detectedType);
    setNewFieldKey("");
    setNewFieldValue("");
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Field Builder</h3>
      <div className={`space-y-4 ${isResponseActive ? "opacity-50 pointer-events-none" : ""}`}>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Field Name</label>
          <input
            type="text"
            value={newFieldKey}
            onChange={(e) => setNewFieldKey(e.target.value)}
            placeholder="e.g. web_url, max_limit"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            disabled={isResponseActive}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Value Type</label>
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isResponseActive}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="array">Array</option>
            <option value="object">Object</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Value</label>
          <input
            type="text"
            value={newFieldValue}
            onChange={(e) => setNewFieldValue(e.target.value)}
            placeholder={
              newFieldType === "boolean"
                ? "true/false"
                : newFieldType === "array"
                ? "[1,2,3]"
                : newFieldType === "object"
                ? '{"key":"value"}'
                : "value"
            }
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            disabled={isResponseActive}
          />
        </div>
        <button
          onClick={handleAddField}
          disabled={!newFieldKey || isResponseActive}
          className={`w-full py-2 rounded text-white font-medium ${
            !newFieldKey || isResponseActive
              ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
              : "bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800"
          }`}
        >
          Add Field
        </button>
      </div>
    </div>
  );
};

export default TaskFieldEditor;