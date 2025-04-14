"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import AccordionWrapper from "../../matrx/matrx-collapsible/AccordionWrapper";
import * as LucideIcons from "lucide-react";
import {
  SchemaField,
  getReferenceOptions,
  fieldsToSchema,
  getDefaultField,
  ReferenceOption,
} from "./schema-builder-utils";

// Component props
interface SchemaBuilderProps {
  onGenerate?: (pythonCode: string) => void;
  className?: string;
}

// Helper function to convert string to UPPER_SNAKE_CASE
const toUpperSnakeCase = (str: string): string => {
  return str
    .replace(/\s+/g, '_')        // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters except underscores
    .toUpperCase();              // Convert to uppercase
};

// Helper function to convert JavaScript values to Python format
const toPythonValue = (value: any): string => {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") {
    if (value.startsWith("socket_internal_")) {
      return `"${value}"`;
    }
    return `"${value}"`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.map(toPythonValue).join(", ")}]`;
  }
  if (typeof value === "object") {
    if (Object.keys(value).length === 0) return "{}";
    let result = "{\n";
    for (const [k, v] of Object.entries(value)) {
      result += `        "${k}": ${toPythonValue(v)},\n`;
    }
    result += "    }";
    return result;
  }
  return String(value);
};

// Validate if icon exists in Lucide
const validateIcon = (iconName: string): boolean => {
  return Boolean((LucideIcons as any)[iconName]);
};

const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ onGenerate, className }) => {
  const [taskName, setTaskName] = useState<string>("");
  const [fields, setFields] = useState<SchemaField[]>([getDefaultField()]);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  
  // Available data types and components
  const dataTypes = ["string", "integer", "boolean", "array", "list", "object"];
  const components = ["Input", "Checkbox", "Select", "arrayField", "relatedFieldsDisplay", ""];
  
  // Get reference options
  const referenceOptions = useMemo<ReferenceOption[]>(getReferenceOptions, []);
  
  // Track icon validation status for each field
  const [iconValidation, setIconValidation] = useState<Record<number, boolean | null>>({});
  
  // Update generated code whenever fields or taskName change
  useEffect(() => {
    const schema = fieldsToSchema(fields);
    const formattedTaskName = taskName ? 
      `${toUpperSnakeCase(taskName)}_DEFINITION` : 
      "TASK_NAME_DEFINITION";
    
    let code = `${formattedTaskName} = {\n`;
    Object.entries(schema).forEach(([key, value]) => {
      code += `    "${key}": {\n`;
      code += `        "REQUIRED": ${value.REQUIRED ? "True" : "False"},\n`;
      code += `        "DEFAULT": ${toPythonValue(value.DEFAULT)},\n`;
      code += `        "VALIDATION": ${value.VALIDATION ? toPythonValue(value.VALIDATION) : "None"},\n`;
      code += `        "DATA_TYPE": "${value.DATA_TYPE}",\n`;
      code += `        "CONVERSION": ${value.CONVERSION ? toPythonValue(value.CONVERSION) : "None"},\n`;
      code += `        "REFERENCE": ${value.REFERENCE ? toPythonValue(value.REFERENCE) : "None"},\n`;
      code += `        "COMPONENT": "${value.COMPONENT}",\n`;
      code += `        "COMPONENT_PROPS": ${toPythonValue(value.COMPONENT_PROPS)},\n`;
      code += `        "ICON_NAME": "${value.ICON_NAME}",\n`;
      code += `        "DESCRIPTION": "${value.DESCRIPTION}",\n`;
      code += `    },\n`;
    });
    code += `}\n`;
    setGeneratedCode(code);
  }, [fields, taskName]);

  // Add a new field
  const addField = () => {
    setFields([...fields, getDefaultField()]);
  };
  
  // Update a field
  const updateField = (index: number, updatedField: Partial<SchemaField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updatedField };
    setFields(newFields);
    
    // Clear icon validation status when icon name changes
    if (updatedField.ICON_NAME !== undefined) {
      setIconValidation(prev => ({...prev, [index]: null}));
    }
  };
  
  // Remove a field
  const removeField = (index: number) => {
    if (fields.length <= 1) {
      // Don't remove the last field
      alert("Tasks must have at least one field");
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
    // Remove validation status for the removed field
    setIconValidation(prev => {
      const updated = {...prev};
      delete updated[index];
      return updated;
    });
  };
  
  // Validate an icon
  const checkIcon = (index: number) => {
    const iconName = fields[index].ICON_NAME;
    const isValid = validateIcon(iconName);
    setIconValidation(prev => ({...prev, [index]: isValid}));
  };
  
  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    alert("Schema code copied to clipboard!");
    if (onGenerate) {
      onGenerate(generatedCode);
    }
  };
  
  // Get icon validation message
  const getIconMessage = (index: number) => {
    const status = iconValidation[index];
    if (status === null) return null;
    return status ? 
      <span className="text-green-600 dark:text-green-400 text-xs">✓ Valid icon</span> : 
      <span className="text-red-600 dark:text-red-400 text-xs">✗ Icon not found</span>;
  };
  
  return (
    <div className={cn("w-full h-full flex flex-col bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200", className)}>
      {/* Header */}
      <div className="w-full p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Socket Schema Builder</h1>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Name</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
              placeholder="Enter task name (e.g., Create User)"
            />
          </div>
          
          <div className="flex space-x-2 mt-2 md:mt-0 justify-end">
            <button
              onClick={addField}
              className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Add Field
            </button>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              Copy Code
            </button>
          </div>
        </div>
      </div>

      {/* Main content - Split layout */}
      <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
        {/* Left side - Form */}
        <div className="w-full lg:w-1/2 h-full overflow-y-auto p-4">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div 
                key={index}
                className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm"
              >
                <AccordionWrapper
                  title={`Field ${index + 1}: ${field.name || "New Field"}`}
                  value={`field-${index}`}
                  defaultOpen={index === 0}
                >
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Field Name</label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(index, { name: e.target.value })}
                          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                          placeholder="e.g., user_id"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Type</label>
                        <select
                          value={field.DATA_TYPE}
                          onChange={(e) => updateField(index, { DATA_TYPE: e.target.value })}
                          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                        >
                          {dataTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Value</label>
                        <input
                          type="text"
                          value={field.DEFAULT ?? ""}
                          onChange={(e) =>
                            updateField(index, {
                              DEFAULT: e.target.value === "" ? null : e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                          placeholder="Enter the default value"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
                        <select
                          value={field.REFERENCE || ""}
                          onChange={(e) => updateField(index, { REFERENCE: e.target.value || null })}
                          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">None</option>
                          {referenceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Component</label>
                        <select
                          value={field.COMPONENT}
                          onChange={(e) => updateField(index, { COMPONENT: e.target.value })}
                          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                        >
                          {components.map((comp) => (
                            <option key={comp} value={comp}>
                              {comp || "None"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icon Name</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={field.ICON_NAME}
                            onChange={(e) => updateField(index, { ICON_NAME: e.target.value })}
                            className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                            placeholder="Must be a valid Lucide icon name"
                          />
                          <button
                            onClick={() => checkIcon(index)}
                            className="mt-1 px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={!field.ICON_NAME}
                          >
                            Test
                          </button>
                        </div>
                        {getIconMessage(index)}
                        {iconValidation[index] === true && field.ICON_NAME && (
                          <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded flex justify-center items-center">
                            {React.createElement((LucideIcons as any)[field.ICON_NAME], {
                              size: 20,
                              className: 'text-gray-700 dark:text-gray-300'
                            })}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Validation Function Name</label>
                        <input
                          type="text"
                          value={field.VALIDATION ?? ""}
                          onChange={(e) =>
                            updateField(index, { VALIDATION: e.target.value || null })
                          }
                          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                          placeholder="Must be a pre-defined Python function"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">Must be a pre-defined Python function</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conversion Function Name</label>
                        <input
                          type="text"
                          value={field.CONVERSION ?? ""}
                          onChange={(e) =>
                            updateField(index, { CONVERSION: e.target.value || null })
                          }
                          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                          placeholder="Must be a pre-defined Python function"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">Must be a pre-defined Python function</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                          value={field.DESCRIPTION}
                          onChange={(e) => updateField(index, { DESCRIPTION: e.target.value })}
                          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50 text-gray-900 dark:text-gray-100"
                          placeholder="Enter field description"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                          Required
                        </label>
                        <input
                          type="checkbox"
                          checked={field.REQUIRED}
                          onChange={(e) => updateField(index, { REQUIRED: e.target.checked })}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 focus:ring-opacity-50"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeField(index)}
                      className="px-3 py-1 rounded-md text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900 text-sm"
                      disabled={fields.length <= 1}
                    >
                      Remove Field
                    </button>
                  </div>
                </AccordionWrapper>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Code preview */}
        <div className="w-full lg:w-1/2 h-full p-4 border-t lg:border-t-0 lg:border-l border-gray-300 dark:border-gray-700">
          <div className="h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Generated Schema</h3>
              <button
                onClick={copyToClipboard}
                className="px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                Copy
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-gray-50 dark:bg-gray-950">
              <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {generatedCode}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaBuilder;