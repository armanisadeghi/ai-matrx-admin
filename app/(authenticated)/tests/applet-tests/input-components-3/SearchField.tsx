// SearchField.tsx

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

const SearchField = ({
  id,
  label,
  placeholder,
  isActive,
  onClick,
  onOpenChange,
  isLast = false,
  actionButton = null,
  children
}) => {
  return (
    <Popover open={isActive} onOpenChange={(open) => onOpenChange(open ? id : null)}>
      <PopoverTrigger asChild>
        <button 
          className={`flex-1 min-w-24 text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 ${!isLast ? 'border-r dark:border-gray-700' : ''} ${actionButton ? 'flex items-center' : ''}`}
          onClick={() => onClick(id)}
        >
          <div className={actionButton ? 'flex-grow' : ''}>
            <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">{label}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</div>
          </div>
          {actionButton}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-96 p-0 bg-white dark:bg-gray-800 border dark:border-gray-700" align={isLast ? "end" : "start"} side="bottom">
        {children}
      </PopoverContent>
    </Popover>
  );
};

export default SearchField;