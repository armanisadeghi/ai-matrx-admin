// File: components/search/layouts/HorizontalSearchLayout.tsx
import React from "react";
import { SearchLayoutProps } from "@/features/applet/layouts/types";
import FieldRow from "@/features/applet/layouts/core/FieldRow";
import SearchGroupField from "@/features/applet/layouts/core/SearchGroupField";
import { Search } from "lucide-react";

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

  const activeSearchGroups = config[activeTab] || [];

  return (
    <div className="w-full p-4">
      <FieldRow
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
      </FieldRow>
    </div>
  );
};

export default HorizontalSearchLayout;
