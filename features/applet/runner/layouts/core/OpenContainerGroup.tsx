// File: features\applet\layouts\core\OpenSearchGroup.tsx
'use client';

// For the open/non-collapsible layouts
import React from "react";
import SearchContainerHeader from "./SearchContainerHeader";
import ContainerFieldRenderer from "./ContainerFieldRenderer";
import { ContainerRenderProps } from "../AppletLayoutManager";

const OpenContainerGroup: React.FC<ContainerRenderProps> = ({
  id,
  label,
  description,
  fields,
  appletId,
  isMobile = false,
  className = "",
  source = "applet",
  containerDescriptionLocation = "container-header",
}) => {
  return (
    <div className={`border rounded-lg overflow-hidden bg-textured dark:border-gray-700 ${className}`}>
      <SearchContainerHeader 
        label={label} 
        description={description}
        containerDescriptionLocation={containerDescriptionLocation}
      />
      <ContainerFieldRenderer 
        fields={fields}
        description={description}
        isMobile={isMobile}
        appletId={appletId}
        source={source}
        containerDescriptionLocation={containerDescriptionLocation}
      />
    </div>
  );
};

export default OpenContainerGroup;
