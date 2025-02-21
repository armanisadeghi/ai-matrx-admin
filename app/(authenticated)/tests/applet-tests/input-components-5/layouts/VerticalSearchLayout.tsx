// File: components/search/layouts/VerticalSearchLayout.tsx
import React from "react";
import { SearchLayoutProps } from "../types";
import VerticalSearchGroup from "../VerticalSearchGroup";

const VerticalSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {activeSearchGroups.map((group, index) => (
        <VerticalSearchGroup
          key={group.id}
          id={group.id}
          label={group.label}
          placeholder={group.placeholder}
          description={group.description}
          fields={group.fields}
          isActive={activeFieldId === group.id}
          onClick={(id) => setActiveFieldId(id === activeFieldId ? null : id)}
          onOpenChange={(open) => !open && setActiveFieldId(null)}
          isLast={index === activeSearchGroups.length - 1}
          isMobile={false}
          className="mb-6"
        />
      ))}
      
      <div className="flex justify-end mt-6">
        {actionButton || (
          <button className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full px-6 py-3">
            Search
          </button>
        )}
      </div>
    </div>
  );
};

export default VerticalSearchLayout;
