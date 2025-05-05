// File: components/search/layouts/OpenSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/layouts/options/layout.types";
import OpenSearchGroup from "@/features/applet/layouts/core/OpenSearchGroup";


const OpenSearchLayout: React.FC<AppletInputProps> = ({
  appletDefinition,
  activeTab,
  actionButton,
  className = "",
}) => {

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {appletDefinition.map((group, index) => (
        <OpenSearchGroup
          key={group.id}
          id={group.id}
          label={group.label}
          placeholder={group.placeholder}
          description={group.description}
          fields={group.fields}
          isActive={true} // Always active
          onClick={() => {}} // No-op
          onOpenChange={() => {}} // No-op
          isLast={index === appletDefinition.length - 1}
          isMobile={false}
          className="mb-6"
        />
      ))}
      
      <div className="flex justify-end mt-6">
        {actionButton}
      </div>
    </div>
  );
};

export default OpenSearchLayout;
