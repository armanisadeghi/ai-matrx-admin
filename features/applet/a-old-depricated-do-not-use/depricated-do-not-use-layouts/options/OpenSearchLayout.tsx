// File: components/search/layouts/OpenSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/layouts/options/layout.types";
import OpenSearchGroup from "@/features/applet/layouts/core/OpenSearchGroup";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";



const OpenSearchLayout: React.FC<AppletInputProps> = ({
  appletDefinition,
  activeAppletId,
  actionButton,
  className = "",
}) => {

const appletContainers = useAppSelector(
  state => selectAppletRuntimeContainers(state, activeAppletId || ""));

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {appletContainers.map((container, index) => (
        <OpenSearchGroup
          key={container.id}
          id={container.id}
          label={container.label}
          description={container.description}
          fields={container.fields}
          isActive={true} // Always active
          onClick={() => {}} // No-op
          onOpenChange={() => {}} // No-op
          isLast={index === appletDefinition.length - 1}
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
