'use client';

import React from 'react';

interface SearchContainerHeaderProps {
  label?: string;
  description?: string;
  containerDescriptionLocation?: "container-header" | "container-body";
}

const SearchContainerHeader: React.FC<SearchContainerHeaderProps> = ({
  label,
  description,
  containerDescriptionLocation = "container-header",
}) => {

  const showDescription = containerDescriptionLocation === "container-header" ? true : false;

  return (
    <>
      {label && (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-medium text-rose-500">{label}</h3>
          {description && showDescription && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      )}
    </>
  );
};

export default SearchContainerHeader;