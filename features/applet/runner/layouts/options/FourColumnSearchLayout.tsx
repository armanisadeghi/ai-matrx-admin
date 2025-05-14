import React from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import OpenContainerGroup from "@/features/applet/runner/layouts/core/OpenContainerGroup";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const FourColumnSearchLayout: React.FC<AppletInputProps> = ({
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
    <div className={`w-full mx-auto p-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            isMobile={isMobile}
            source={source}
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

export default FourColumnSearchLayout;