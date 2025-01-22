import React from 'react';

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
    <div className={`w-full text-xs ${className}`}>
      {/* Header row */}
      <div className={`grid grid-cols-${colCount} gap-2 border-b border-gray-200 pb-1 mb-1`}>
        {keys.map(key => (
          <div key={key} className={labelClassName}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </div>
        ))}
      </div>
      
      {/* Data rows */}
      {rows.map((row, rowIndex) => (
        <div 
          key={rowIndex} 
          className={`grid grid-cols-${colCount} gap-2 ${rowIndex < rows.length - 1 ? 'mb-1' : ''}`}
        >
          {keys.map(key => (
            <div key={key} className={cellClassName}>
              {row[key]?.toString() || '-'}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CompactTable;