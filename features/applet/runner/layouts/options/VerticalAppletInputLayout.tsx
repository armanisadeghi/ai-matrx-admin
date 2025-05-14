// File: features/applet/runner/layouts/options/VerticalSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import VerticalSearchGroup from "@/features/applet/runner/layouts/core/VerticalSearchGroup";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const VerticalAppletInputLayout: React.FC<AppletInputProps>= ({
  appletId,
  activeContainerId,
  setActiveContainerId,
  actionButton,
  className = "",
  isMobile = false,
  source = "applet",
}) => {
  const appletContainers = useAppSelector(state => selectAppletRuntimeContainers(state, appletId))
  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {appletContainers.map((container, index) => (
        <VerticalSearchGroup
          key={container.id}
          id={container.id}
          label={container.label}
          description={container.description}
          fields={container.fields}
          appletId={appletId}
          isActive={activeContainerId === container.id}
          onClick={(id) => setActiveContainerId(id === activeContainerId ? null : id)}
          onOpenChange={(open) => !open && setActiveContainerId(null)}
          isLast={index === appletContainers.length - 1}
          isMobile={isMobile}
          className="mb-6"
          source={source}
        />
      ))}
      
      <div className="flex justify-end mt-6">
        {actionButton}
      </div>
    </div>
  );
};

export default VerticalAppletInputLayout;
