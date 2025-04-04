// File: components/search/layouts/TabsSearchLayout.tsx
import React, { useState } from "react";
import { SearchLayoutProps } from "../types";
import OpenSearchGroup from "../core/OpenSearchGroup";

const TabsSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      <div className="flex border-b dark:border-gray-700 mb-4 overflow-x-auto">
        {activeSearchGroups.map((group, index) => (
          <button
            key={group.id}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
              index === activeGroupIndex
                ? "border-b-2 border-rose-500 text-rose-500"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
            }`}
            onClick={() => setActiveGroupIndex(index)}
          >
            {group.label}
          </button>
        ))}
      </div>
      
      <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
        {activeSearchGroups.map((group, index) => (
          <div 
            key={group.id} 
            style={{ display: index === activeGroupIndex ? "block" : "none" }}
          >
            <OpenSearchGroup
              id={group.id}
              label={group.label}
              placeholder={group.placeholder}
              description={group.description}
              fields={group.fields}
              isActive={true}
              onClick={() => {}}
              onOpenChange={() => {}}
              isLast={true}
              isMobile={false}
              className="border-0"
            />
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setActiveGroupIndex(Math.max(0, activeGroupIndex - 1))}
          disabled={activeGroupIndex === 0}
          className={`px-4 py-2 rounded ${
            activeGroupIndex === 0
              ? "bg-gray-200 text-gray-500"
              : "bg-gray-300 hover:bg-gray-400 text-gray-800"
          }`}
        >
          Previous
        </button>
        
        {activeGroupIndex === activeSearchGroups.length - 1 ? (
          actionButton || (
            <button className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded">
              Search
            </button>
          )
        ) : (
          <button
            onClick={() => setActiveGroupIndex(Math.min(activeGroupIndex + 1, activeSearchGroups.length - 1))}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default TabsSearchLayout;
