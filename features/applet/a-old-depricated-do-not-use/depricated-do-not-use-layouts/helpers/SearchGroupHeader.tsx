'use client';

import React from 'react';

interface SearchGroupHeaderProps {
  label?: string;
  description?: string;
}

const SearchGroupHeader: React.FC<SearchGroupHeaderProps> = ({
  label,
  description,
}) => {
  return (
    <>
      {label && (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-medium text-rose-500">{label}</h3>
          {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      )}
    </>
  );
};

export default SearchGroupHeader; 