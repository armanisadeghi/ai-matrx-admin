// File: features/applet/runner/layouts/options/OpenSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import OpenContainerGroup from "@/features/applet/runner/layouts/core/OpenContainerGroup";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";


const OpenSearchLayout: React.FC<AppletInputProps> = ({
  appletId,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {
  const appletContainers = useAppSelector(state => selectAppletRuntimeContainers(state, appletId))

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {appletContainers.map((container, index) => (
        <OpenContainerGroup
          key={container.id}
          id={container.id}
          label={container.label}
          description={container.description}
          fields={container.fields}
          appletId={appletId}
          isActive={true} // Always active
          onClick={() => {}} // No-op
          onOpenChange={() => {}} // No-op
          isLast={index === appletContainers.length - 1}
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
