import React, { useState, useEffect } from 'react';
import { TabsContent, ScrollArea, Label, Input, Textarea, Button } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";

interface Property {
  key: string;
  path: string;
  value: any;
  depth: number;
  isExpanded?: boolean;
  hasChildren: boolean;
  children?: Property[];
  type: 'object' | 'array' | 'primitive';
}

interface PropertiesBrowserTabProps {
  responses: any[];
  selectedObjectIndex: number;
  setSelectedObjectIndex: (index: number) => void;
  selectedObject: any;
  displayModes: Record<string, boolean>;
  toggleDisplayMode: (propPath: string) => void;
  safeStringify: (value: any, indent?: number) => string;
}

const RecursivePropertiesBrowser = ({
  responses,
  selectedObjectIndex,
  setSelectedObjectIndex,
  selectedObject,
  displayModes,
  toggleDisplayMode,
  safeStringify
}: PropertiesBrowserTabProps) => {
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  
  // Function to expand or collapse all properties
  const expandAll = (expand: boolean) => {
    const newState: Record<string, boolean> = {};
    if (selectedObject) {
      const setExpandedState = (obj: any, path = '') => {
        if (typeof obj === 'object' && obj !== null) {
          if (path) newState[path] = expand;
          
          Object.entries(obj).forEach(([key, value]) => {
            const currentPath = path ? `${path}.${key}` : key;
            if (typeof value === 'object' && value !== null) {
              setExpandedState(value, currentPath);
            }
          });
        }
      };
      
      setExpandedState(selectedObject);
    }
    setExpandedPaths(newState);
  };

  // Function to toggle the expanded state of a property
  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Auto-expand the first two top-level properties when selected object changes
  useEffect(() => {
    if (selectedObject) {
      const newState = { ...expandedPaths };
      let count = 0;
      
      // Function to auto-expand first 2 properties
      const autoExpandFirstTwo = (obj: any, path = '') => {
        if (typeof obj === 'object' && obj !== null && count < 2) {
          // Auto-expand top-level properties only
          if (!path) {
            Object.keys(obj).slice(0, 2).forEach(key => {
              newState[key] = true;
              count++;
            });
          }
        }
      };
      
      autoExpandFirstTwo(selectedObject);
      setExpandedPaths(newState);
    }
  }, [selectedObject]);

  // Function to recursively extract properties from objects and arrays
  const extractProperties = (obj: any, parentPath = '', depth = 0): Property[] => {
    if (obj === null || obj === undefined) {
      return [{
        key: parentPath.split('.').pop() || '',
        path: parentPath,
        value: obj,
        depth,
        hasChildren: false,
        type: 'primitive'
      }];
    }
    if (typeof obj !== 'object') {
      return [{
        key: parentPath.split('.').pop() || '',
        path: parentPath,
        value: obj,
        depth,
        hasChildren: false,
        type: 'primitive'
      }];
    }
    const properties: Property[] = [];
    const isArray = Array.isArray(obj);
    // First add the parent object/array itself
    if (parentPath) {
      properties.push({
        key: parentPath.split('.').pop() || '',
        path: parentPath,
        value: obj,
        depth,
        isExpanded: expandedPaths[parentPath],
        hasChildren: true,
        type: isArray ? 'array' : 'object'
      });
    }
    // If this path is not expanded, return only the parent
    if (parentPath && !expandedPaths[parentPath]) {
      return properties;
    }
    // Otherwise, add all children
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        const childProperties = extractProperties(value, currentPath, depth + 1);
        properties.push(...childProperties);
      } else {
        properties.push({
          key,
          path: currentPath,
          value,
          depth: depth + 1,
          hasChildren: false,
          type: 'primitive'
        });
      }
    });
    return properties;
  };

  // Get all properties of the selected object in a flat array
  const objectProperties = selectedObject ? extractProperties(selectedObject) : [];

  // Renders a primitive value (non-object, non-array)
  const renderPrimitiveValue = (prop: Property, idx: number) => (
    <div 
      key={`${prop.path}-${idx}`} 
      className="flex items-center py-2 border-b border-gray-400 dark:border-gray-500 last:border-b-0 w-full"
      style={{ paddingLeft: `${prop.depth * 12}px` }}
    >
      {/* Property Name - smaller fixed width */}
      <div className="flex items-center w-1/5 min-w-20 shrink-0 mr-3">
        <span className="text-xs font-medium truncate" title={prop.key}>
          {prop.key}
        </span>
      </div>
      
      {/* Value Field - takes up remaining space */}
      <div className="flex-grow overflow-hidden">
        {displayModes[prop.path] ? (
          <Textarea
            className="text-xs font-mono h-24 resize-y w-full"
            value={
              typeof prop.value === "object"
                ? safeStringify(prop.value)
                : String(prop.value)
            }
            readOnly
          />
        ) : (
          <Input
            className="text-xs h-8 font-mono w-full"
            value={
              typeof prop.value === "object"
                ? safeStringify(prop.value)
                : String(prop.value)
            }
            readOnly
          />
        )}
      </div>
      
      {/* Action Buttons - fixed width */}
      <div className="flex items-center shrink-0 ml-3 justify-end">
        <CopyButton
          className="mr-2"
          content={
            typeof prop.value === "object"
              ? safeStringify(prop.value)
              : String(prop.value)
          }
        />
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs whitespace-nowrap"
          onClick={() => toggleDisplayMode(prop.path)}
        >
          {displayModes[prop.path] ? "Collapse" : "Expand"}
        </Button>
      </div>
    </div>
  );

  // Renders an object or array parent
  const renderObjectParent = (prop: Property, idx: number) => (
    <div 
      key={`${prop.path}-${idx}`} 
      className="flex items-center py-2 border-b border-gray-400 dark:border-gray-500 last:border-b-0 w-full"
      style={{ paddingLeft: `${prop.depth * 12}px` }}
    >
      <div className="flex items-center flex-grow">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 mr-2 text-xs flex items-center justify-center" 
          onClick={() => toggleExpand(prop.path)}
        >
          {expandedPaths[prop.path] ? '▼' : '►'}
        </Button>
        <span className="text-xs font-medium truncate" title={prop.key}>
          {prop.key}
          {prop.type === 'array' && ' [ ]'}
          {prop.type === 'object' && ' { }'}
        </span>
        <span className="text-xs text-gray-500 ml-2 truncate">
          {!expandedPaths[prop.path] && (
            Array.isArray(prop.value) 
              ? `Array (${prop.value.length} items)` 
              : `Object (${Object.keys(prop.value).length} properties)`
          )}
        </span>
      </div>
      <div className="shrink-0">
        <CopyButton
          content={safeStringify(prop.value)}
        />
      </div>
    </div>
  );

  return (
    <TabsContent value="properties" className="w-full">
      <div className="flex justify-between items-center mb-3 w-full">
        <div className="flex items-center">
          <Label className="mr-2 text-xs">Select Object:</Label>
          <select
            className="px-2 py-1 text-xs border rounded bg-gray-100 dark:bg-gray-700"
            value={selectedObjectIndex}
            onChange={(e) => setSelectedObjectIndex(Number(e.target.value))}
          >
            {responses.map((_, index) => (
              <option key={index} value={index}>
                Response {index + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 flex items-center justify-center"
            title="Expand All"
            onClick={() => expandAll(true)}
          >
            <span className="text-xs">⊞</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 flex items-center justify-center"
            title="Collapse All"
            onClick={() => expandAll(false)}
          >
            <span className="text-xs">⊟</span>
          </Button>
          <CopyButton content={safeStringify(selectedObject)} label="Copy All" />
        </div>
      </div>
      <ScrollArea className="w-full rounded-md border border-gray-400 dark:border-gray-500 p-3 h-96">
        {objectProperties.length > 0 ? (
          <div className="space-y-1 w-full">
            {objectProperties.map((prop, idx) => 
              prop.hasChildren 
                ? renderObjectParent(prop, idx) 
                : renderPrimitiveValue(prop, idx)
            )}
          </div>
        ) : (
          <div className="text-center p-4 text-gray-500 italic">No properties to display</div>
        )}
      </ScrollArea>
    </TabsContent>
  );
};

export default RecursivePropertiesBrowser;