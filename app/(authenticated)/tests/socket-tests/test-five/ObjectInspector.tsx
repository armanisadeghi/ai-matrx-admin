// ObjectInspector.jsx
import React, { useState } from 'react';

const ObjectInspector = ({ data, expandedByDefault = false, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(expandedByDefault || level < 1);
  
  // Determine the type of data
  const getType = (value) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };
  
  const type = getType(data);
  const isExpandable = type === 'object' || type === 'array';
  
  // Format simple values
  const formatValue = (value, type) => {
    switch (type) {
      case 'null':
        return <span className="text-gray-400 dark:text-gray-500">null</span>;
      case 'undefined':
        return <span className="text-gray-400 dark:text-gray-500">undefined</span>;
      case 'boolean':
        return <span className="text-orange-600 dark:text-orange-400">{String(value)}</span>;
      case 'number':
        return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
      case 'string':
        return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
      case 'function':
        return <span className="text-purple-600 dark:text-purple-400">Function</span>;
      case 'symbol':
        return <span className="text-yellow-600 dark:text-yellow-400">Symbol</span>;
      default:
        return <span>{String(value)}</span>;
    }
  };
  
  // Determine if we should render children
  const renderChildren = () => {
    if (!isExpandable || !isExpanded) return null;
    
    const entries = type === 'array' 
      ? [...data.entries()]
      : Object.entries(data);
    
    if (entries.length === 0) {
      return type === 'array' 
        ? <div className="pl-6 text-gray-400 dark:text-gray-500">[]</div>
        : <div className="pl-6 text-gray-400 dark:text-gray-500">{'{}'}</div>;
    }
    
    return (
      <div className="pl-6">
        {entries.map(([key, value]) => (
          <div key={key} className="py-1">
            <span className="font-medium text-gray-800 dark:text-gray-200">{key}: </span>
            <ObjectInspector data={value} level={level + 1} />
          </div>
        ))}
      </div>
    );
  };
  
  // Render preview of contents for collapsed state
  const renderPreview = () => {
    if (type === 'array') {
      return `Array(${data.length})`;
    }
    
    if (type === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) return '{}';
      return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
    }
    
    return null;
  };
  
  return (
    <div className="font-mono text-sm">
      {isExpandable ? (
        <div>
          <div className="inline-flex items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <span className="mr-1 text-gray-500 dark:text-gray-400 select-none">
              {isExpanded ? '▼' : '►'}
            </span>
            <span className="text-gray-800 dark:text-gray-200">
              {type === 'array' ? '[' : '{'}
            </span>
            {!isExpanded && (
              <span className="text-gray-600 dark:text-gray-400 ml-1">
                {renderPreview()}
              </span>
            )}
            {!isExpanded && (
              <span className="text-gray-800 dark:text-gray-200">
                {type === 'array' ? ']' : '}'}
              </span>
            )}
          </div>
          {renderChildren()}
          {isExpanded && (
            <div className="text-gray-800 dark:text-gray-200">
              {type === 'array' ? ']' : '}'}
            </div>
          )}
        </div>
      ) : (
        formatValue(data, type)
      )}
    </div>
  );
};

export default ObjectInspector;