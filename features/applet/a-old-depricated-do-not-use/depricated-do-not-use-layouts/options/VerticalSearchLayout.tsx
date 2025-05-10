// File: components/search/layouts/VerticalSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/layouts/options/layout.types";
import VerticalSearchGroup from "@/features/applet/layouts/core/VerticalSearchGroup";

const VerticalSearchLayout: React.FC<AppletInputProps> = ({
  appletDefinition,
  activeTab,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {
  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {appletDefinition.map((group, index) => (
        <VerticalSearchGroup
          key={group.id}
          id={group.id}
          label={group.label}
          placeholder={group.placeholder}
          description={group.description}
          fields={group.fields}
          isActive={activeFieldId === group.id}
          onClick={(id) => setActiveFieldId(id === activeFieldId ? null : id)}
          onOpenChange={(open) => !open && setActiveFieldId(null)}
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

export default VerticalSearchLayout;
