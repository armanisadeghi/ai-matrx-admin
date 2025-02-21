// File: components/search/layouts/OpenSearchLayout.tsx
import React from "react";
import { SearchLayoutProps } from "../types";
import OpenSearchGroup from "../core/OpenSearchGroup";


const OpenSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {activeSearchGroups.map((group, index) => (
        <OpenSearchGroup
          key={group.id}
          id={group.id}
          label={group.label}
          placeholder={group.placeholder}
          description={group.description}
          fields={group.fields}
          isActive={true} // Always active
          onClick={() => {}} // No-op
          onOpenChange={() => {}} // No-op
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

export default OpenSearchLayout;
