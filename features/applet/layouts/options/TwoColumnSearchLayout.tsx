// File: components/search/layouts/TwoColumnSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/layouts/options/layout.types";
import OpenSearchGroup from "@/features/applet/layouts/core/OpenSearchGroup";

const TwoColumnSearchLayout: React.FC<AppletInputProps> = ({
  appletDefinition,
  activeTab,
  actionButton,
  className = "",
}) => {

  return (
    <div className={`w-full max-w-6xl mx-auto p-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            className="h-full"
          />
        ))}
      </div>
      
      <div className="flex justify-end mt-6">
        {actionButton}
      </div>
    </div>
  );
};

export default TwoColumnSearchLayout;

