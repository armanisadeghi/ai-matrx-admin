// File: components/search/layouts/HorizontalSearchLayout.tsx
import React from "react";
import SearchGroupField from "@/features/applet/layouts/core/SearchGroupField";
import AppletBrokerContainer from "@/features/applet/runner/components/search-bar/container/AppletBrokerContainer";
import { AppletInputProps } from "../options/layout.types";

const HorizontalSearchLayout: React.FC<AppletInputProps> = ({
  appletDefinition,
  activeTab,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {

  const groupsCount = appletDefinition.length;
  const hideGroupPlaceholder = groupsCount > 4;


  return (
    <div className="w-full p-4">
      <AppletBrokerContainer
        activeFieldId={activeFieldId}
        onActiveFieldChange={setActiveFieldId}
        actionButton={actionButton}
        className={`mx-auto max-w-4xl rounded-full bg-white ${className}`}
      >
        {appletDefinition.map((group, index) => (
          <SearchGroupField
            key={group.id}
            id={group.id}
            label={group.label}
            placeholder={group.placeholder}
            description={group.description}
            fields={group.fields}
            isActive={activeFieldId === group.id}
            onClick={() => {}} // Managed by AppletBrokerContainer
            onOpenChange={() => {}} // Managed by AppletBrokerContainer
            isLast={index === appletDefinition.length - 1}
            isMobile={false}
            hideGroupPlaceholder={hideGroupPlaceholder}
          />
        ))}
      </AppletBrokerContainer>
    </div>
  );
};

export default HorizontalSearchLayout;
