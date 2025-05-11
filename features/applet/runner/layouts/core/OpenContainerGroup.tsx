// File: features\applet\layouts\core\OpenSearchGroup.tsx
'use client';

// For the open/non-collapsible layouts
import React from "react";
import SearchContainerHeader from "../helpers/SearchContainerHeader";
import ContainerFieldRenderer from "../helpers/ContainerFieldRenderer";
import { ContainerRenderProps } from "../AppletLayoutManager";

const OpenContainerGroup: React.FC<ContainerRenderProps> = ({
  id,
  label,
  description,
  fields,
  appletId,
  isMobile = false,
  className = "",
}) => {
  return (
    <div className={`border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700 ${className}`}>
      <SearchContainerHeader 
        label={label} 
        description={description}
      />
      <ContainerFieldRenderer 
        fields={fields}
        description={description}
        isMobile={isMobile}
        appletId={appletId}
      />
    </div>
  );
};

export default OpenContainerGroup;
