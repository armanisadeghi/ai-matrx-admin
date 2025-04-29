'use client';

import React from 'react';

interface SearchGroupHeaderProps {
  label?: string;
  placeholder?: string;
}

const SearchGroupHeader: React.FC<SearchGroupHeaderProps> = ({
  label,
  placeholder,
}) => {
  return (
    <>
      {label && (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-medium text-rose-500">{label}</h3>
          {placeholder && <p className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</p>}
        </div>
      )}
    </>
  );
};

export default SearchGroupHeader; 