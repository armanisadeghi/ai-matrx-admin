// File: features\applet\layouts\core\OpenSearchGroup.tsx
'use client';

// For the open/non-collapsible layouts
import React from "react";
import { SearchGroupRendererProps } from "../options/layout.types";
import SearchGroupHeader from "../helpers/SearchGroupHeader";
import GroupFieldsRenderer from "../helpers/GroupFieldsRenderer";

const OpenSearchGroup: React.FC<SearchGroupRendererProps> = ({
  id,
  label,
  description,
  fields,
  isMobile = false,
  className = "",
}) => {
  return (
    <div className={`border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700 ${className}`}>
      <SearchGroupHeader 
        label={label} 
        description={description} 
      />
      <GroupFieldsRenderer 
        fields={fields}
        description={description}
        isMobile={isMobile}
      />
    </div>
  );
};

export default OpenSearchGroup;
