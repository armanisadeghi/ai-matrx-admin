'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Types for our component
interface JSONEditorProps {
  data: any;
  rootName?: string;
  collapse?: number;
  restrictEdit?: boolean | ((props: { 
    value: any; 
    key: string | number; 
    level: number; 
    path: (string | number)[]; 
  }) => boolean);
  restrictDelete?: boolean | ((props: { 
    value: any; 
    key: string | number; 
    level: number; 
    path: (string | number)[]; 
  }) => boolean);
  restrictAdd?: boolean | ((props: { 
    value: any; 
    key: string | number; 
    level: number; 
    path: (string | number)[]; 
  }) => boolean);
  searchFilter?: 'key' | 'value' | 'all' | ((
    props: { path: (string | number)[]; fullData: any },
    searchText: string
  ) => boolean);
  onUpdate?: (props: {
    newData: any;
    oldData: any;
    path: (string | number)[];
  }) => void | string | boolean | Promise<boolean | string | void>;
  onChange?: (props: {
    newValue: any;
    oldValue: any;
    name: string | number;
  }) => any;
}

const JsonEditor: React.FC<JSONEditorProps> = ({
  data,
  rootName = 'root',
  collapse = 1,
  restrictEdit = false,
  restrictDelete = false,
  restrictAdd = false,
  searchFilter = 'all',
  onUpdate,
  onChange
}) => {
  const [editableData, setEditableData] = useState(data);
  const [searchText, setSearchText] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());

  // Function to check if a value is a non-null object or array
  const isExpandable = (value: any): boolean => {
    return value !== null && 
           typeof value === 'object' && 
           (Array.isArray(value) || Object.keys(value).length > 0);
  };

  // Function to get node info
  const getNodeInfo = (value: any) => {
    if (value === null || typeof value !== 'object') {
      return { isExpandable: false, length: 0, isArray: false };
    }
    const isArray = Array.isArray(value);
    return {
      isExpandable: isExpandable(value),
      length: isArray ? value.length : Object.keys(value).length,
      isArray
    };
  };

  // Function to toggle node expansion
  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Function to render primitive values
  const renderPrimitive = (value: any) => {
    if (value === null) return <span className="text-muted-foreground">null</span>;
    if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
    if (typeof value === 'boolean') return <span className="text-indigo-500 dark:text-indigo-400">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-blue-500 dark:text-blue-400">{value}</span>;
    if (typeof value === 'string') return <span className="text-emerald-600 dark:text-emerald-400">"{value}"</span>;
    return <span className="text-foreground">{String(value)}</span>;
  };

  // Function to render a value based on its type
  const renderValue = (value: any, path: (string | number)[], level: number) => {
    const nodeInfo = getNodeInfo(value);
    
    if (!nodeInfo.isExpandable) {
      return renderPrimitive(value);
    }
    
    const pathKey = path.join('.');
    const isExpanded = expandedNodes.has(pathKey);
    
    return (
      <div className="ml-4">
        <div 
          onClick={() => toggleNode(pathKey)}
          className="group cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/70 p-1 rounded flex items-center gap-1 transition-colors"
        >
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="text-foreground">{nodeInfo.isArray ? '[' : '{'}</span>
          {!isExpanded && (
            <span className="text-muted-foreground">
              {nodeInfo.length} {nodeInfo.isArray ? 'items' : 'properties'}
            </span>
          )}
        </div>
        {isExpanded && (
          <div className="ml-4 border-l-2 border-muted pl-2">
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="my-1">
                <span className="text-muted-foreground">{key}:</span>{' '}
                {renderValue(val, [...path, key], level + 1)}
              </div>
            ))}
          </div>
        )}
        <div className="text-foreground">{nodeInfo.isArray ? ']' : '}'}</div>
      </div>
    );
  };

  // Filter function for search
  const filterNode = (value: any, path: (string | number)[]) => {
    if (!searchText) return true;
    
    if (typeof searchFilter === 'function') {
      return searchFilter({ path, fullData: editableData }, searchText);
    }
    
    const stringValue = JSON.stringify(value).toLowerCase();
    const searchLower = searchText.toLowerCase();
    
    switch (searchFilter) {
      case 'key':
        return path[path.length - 1].toString().toLowerCase().includes(searchLower);
      case 'value':
        return typeof value !== 'object' && stringValue.includes(searchLower);
      case 'all':
      default:
        return stringValue.includes(searchLower);
    }
  };

  // Update editableData when data prop changes
  useEffect(() => {
    setEditableData(data);
  }, [data]);

  return (
    <Card className="w-full bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">{rootName}</CardTitle>
        <Input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-[200px]"
        />
      </CardHeader>
      <CardContent>
        <div className="font-mono text-sm">
          {renderValue(editableData, [], 0)}
        </div>
      </CardContent>
    </Card>
  );
};

export default JsonEditor;