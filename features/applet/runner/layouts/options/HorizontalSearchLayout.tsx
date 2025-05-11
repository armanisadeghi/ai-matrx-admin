// File: components/search/layouts/HorizontalSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "../AppletLayoutManager";
import { SearchGroupField } from "../core";
import AppletBrokerContainer from "../../search-bar/container/AppletBrokerContainer";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const HorizontalSearchLayout: React.FC<AppletInputProps> = ({
  appletId,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
  isMobile = false,
}) => {
  const appletContainers = useAppSelector(state => selectAppletRuntimeContainers(state, appletId))

  const groupsCount = appletContainers.length;
  const hideGroupPlaceholder = groupsCount > 4;


  return (
    <div className="w-full p-4">
      <AppletBrokerContainer
        activeFieldId={activeFieldId}
        onActiveFieldChange={setActiveFieldId}
        actionButton={actionButton}
        className={`mx-auto max-w-4xl rounded-full bg-white ${className}`}
      >
        {appletContainers.map((container, index) => (
          <SearchGroupField
            key={container.id}
            id={container.id}
            label={container.label}
            description={container.description}
            fields={container.fields}
            isActive={activeFieldId === container.id}
            onClick={() => {}} // Managed by AppletBrokerContainer
            onOpenChange={() => {}} // Managed by AppletBrokerContainer
            isLast={index === appletContainers.length - 1}
            isMobile={isMobile}
            hideGroupPlaceholder={hideGroupPlaceholder}
          />
        ))}
      </AppletBrokerContainer>
    </div>
  );
};

export default HorizontalSearchLayout;
