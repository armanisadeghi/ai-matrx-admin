import React from 'react';

const isUUID = (str) => {
  if (typeof str !== 'string') return false;
  
  // Standard UUID pattern
  const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const standardUUID = new RegExp(`^${uuidPattern}$`, 'i');
  
  // Prefixed UUID pattern (e.g., "id:" or "some_name:")
  const prefixedUUID = new RegExp(`^[a-z_]+:${uuidPattern}$`, 'i');
  
  return standardUUID.test(str) || prefixedUUID.test(str);
};

const formatUUIDDisplay = (uuid) => {
  const parts = uuid.split(':');
  if (parts.length === 2) {
    return {
      prefix: parts[0] + ':',
      shortUUID: '...' + parts[1].slice(-6),
      fullUUID: uuid
    };
  }
  return {
    prefix: '',
    shortUUID: '...' + uuid.slice(-6),
    fullUUID: uuid
  };
};

const toTitleCase = (str) => {
  // Handle camelCase
  const fromCamel = str.replace(/([A-Z])/g, ' $1');
  
  // Handle snake_case
  const fromSnake = fromCamel.replace(/_/g, ' ');
  
  // Capitalize first letter of each word and trim
  return fromSnake
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

const TableCell = ({ value }) => {
  const stringValue = value?.toString() || '-';
  
  if (isUUID(stringValue)) {
    const { prefix, shortUUID, fullUUID } = formatUUIDDisplay(stringValue);
    return (
      <div className="group relative">
        <span className="block">
          {prefix}<span className="font-mono">{shortUUID}</span>
        </span>
        <div className="absolute z-10 invisible group-hover:visible bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-md text-xs whitespace-nowrap shadow-lg -translate-y-full left-0 mt-1 font-mono">
          {fullUUID}
        </div>
      </div>
    );
  }
  
  return <div>{stringValue}</div>;
};

const CompactTable = ({ 
  data,
  className = '',
  labelClassName = 'font-medium',
  cellClassName = '',
  columns = 0
}) => {
  // Handle both single object and array of objects
  const rows = Array.isArray(data) ? data : [data];
  
  // Get all unique keys from all objects
  const keys = [...new Set(rows.flatMap(Object.keys))];
  
  // Use provided columns or default to number of keys
  const colCount = columns > 0 ? columns : keys.length;
  
  return (
    <div className={`w-full text-xs divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {/* Header row */}
      <div className="py-2">
        <div className={`grid grid-cols-${colCount} gap-2`}>
          {keys.map(key => (
            <div key={key} className={`${labelClassName} text-gray-900 dark:text-gray-100`}>
              {toTitleCase(key)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Data rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {rows.map((row, rowIndex) => (
          <div 
            key={rowIndex} 
            className={`py-2 ${
              rowIndex % 2 === 0 
                ? 'bg-gray-50 dark:bg-gray-800/50' 
                : 'bg-white dark:bg-gray-900'
            }`}
          >
            <div className={`grid grid-cols-${colCount} gap-2`}>
              {keys.map(key => (
                <div 
                  key={key} 
                  className={`${cellClassName} text-gray-600 dark:text-gray-300`}
                >
                  <TableCell value={row[key]} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompactTable;