// File: components/search/layouts/HorizontalSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "../core/AppletInputLayoutManager";
import { SearchGroupField } from "../core";
import AppletBrokerContainer from "../../search-bar/container/AppletBrokerContainer";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveAppletContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const HorizontalSearchLayout: React.FC<AppletInputProps> = ({
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {
  const activeAppletContainers = useAppSelector(state => selectActiveAppletContainers(state))

  const groupsCount = activeAppletContainers.length;
  const hideGroupPlaceholder = groupsCount > 4;


  return (
    <div className="w-full p-4">
      <AppletBrokerContainer
        activeFieldId={activeFieldId}
        onActiveFieldChange={setActiveFieldId}
        actionButton={actionButton}
        className={`mx-auto max-w-4xl rounded-full bg-white ${className}`}
      >
        {activeAppletContainers.map((container, index) => (
          <SearchGroupField
            key={container.id}
            id={container.id}
            label={container.label}
            description={container.description}
            fields={container.fields}
            isActive={activeFieldId === container.id}
            onClick={() => {}} // Managed by AppletBrokerContainer
            onOpenChange={() => {}} // Managed by AppletBrokerContainer
            isLast={index === activeAppletContainers.length - 1}
            isMobile={false}
            hideGroupPlaceholder={hideGroupPlaceholder}
          />
        ))}
      </AppletBrokerContainer>
    </div>
  );
};

export default HorizontalSearchLayout;
