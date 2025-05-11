// sliceViewers/GenericSliceViewer.jsx
import React, { useState } from 'react';

const JsonTree = ({ data, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  
  if (data === null || data === undefined) {
    return <span className="text-gray-500">null</span>;
  }
  
  if (typeof data !== 'object') {
    // For primitive values
    return (
      <span className={typeof data === 'string' ? 'text-green-600' : 'text-blue-600'}>
        {JSON.stringify(data)}
      </span>
    );
  }
  
  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;
  
  if (isEmpty) {
    return <span className="text-gray-500">{isArray ? '[]' : '{}'}</span>;
  }
  
  return (
    <div className="ml-4">
      <span 
        className="cursor-pointer text-gray-700 hover:text-blue-500"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▼' : '►'} {isArray ? `Array(${Object.keys(data).length})` : 'Object'}
      </span>
      
      {isExpanded && (
        <div className="ml-4 border-l-2 border-gray-200 pl-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="my-1">
              <span className="text-purple-600">{key}: </span>
              <JsonTree data={value} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JsonTree;
