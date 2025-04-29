// File: components/search/layouts/HorizontalSearchLayout.tsx
import React, { ReactNode } from "react";
import SearchGroupField from "@/features/applet/layouts/core/SearchGroupField";
import { Search } from "lucide-react";
import AppletBrokerContainer from "../../runner/components/search-bar/container/AppletBrokerContainer";
import { AppletListItemConfig } from "../../runner/components/field-components/types";
import { GroupFieldConfig } from "../../runner/components/field-components/types";


export interface GroupConfig {
  tab: AppletListItemConfig;
  fields: GroupFieldConfig[];
  title?: string;
  description?: string;
}

export interface AppletContainersConfig {
  id: string;
  label: string;
  placeholder: string;
  description?: string;
  fields: GroupFieldConfig[];
}

export interface AvailableAppletConfigs {
  [key: string]: AppletContainersConfig[];
}


interface SearchLayoutProps {
  config: AvailableAppletConfigs;
  activeTab: string;
  activeFieldId: string | null;
  setActiveFieldId: (id: string | null) => void;
  actionButton?: ReactNode;
  className?: string;
}

const HorizontalSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {
  const searchButton = actionButton || (
    <div className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full p-3 ml-2">
      <Search size={24} />
    </div>
  );

  console.log("config", JSON.stringify(config, null, 2));

  const activeSearchGroups = config[activeTab] || [];

  return (
    <div className="w-full p-4">
      <AppletBrokerContainer
        activeFieldId={activeFieldId}
        onActiveFieldChange={setActiveFieldId}
        actionButton={searchButton}
        className={`mx-auto max-w-4xl rounded-full bg-white ${className}`}
      >
        {activeSearchGroups.map((group, index) => (
          <SearchGroupField
            key={group.id}
            id={group.id}
            label={group.label}
            placeholder={group.placeholder}
            description={group.description}
            fields={group.fields}
            isActive={activeFieldId === group.id}
            onClick={() => {}} // Managed by FieldRow
            onOpenChange={() => {}} // Managed by FieldRow
            isLast={index === activeSearchGroups.length - 1}
            isMobile={false}
          />
        ))}
      </AppletBrokerContainer>
    </div>
  );
};

export default HorizontalSearchLayout;
