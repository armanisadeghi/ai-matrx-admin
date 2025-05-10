// File: features/applet/runner/layouts/options/VerticalSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/core/AppletInputLayoutManager";
import VerticalSearchGroup from "@/features/applet/runner/layouts/core/VerticalSearchGroup";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveAppletContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const VerticalSearchLayout: React.FC<AppletInputProps> = ({
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {
  const activeAppletContainers = useAppSelector(state => selectActiveAppletContainers(state))
  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {activeAppletContainers.map((container, index) => (
        <VerticalSearchGroup
          key={container.id}
          id={container.id}
          label={container.label}
          description={container.description}
          fields={container.fields}
          isActive={activeFieldId === container.id}
          onClick={(id) => setActiveFieldId(id === activeFieldId ? null : id)}
          onOpenChange={(open) => !open && setActiveFieldId(null)}
          isLast={index === activeAppletContainers.length - 1}
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
