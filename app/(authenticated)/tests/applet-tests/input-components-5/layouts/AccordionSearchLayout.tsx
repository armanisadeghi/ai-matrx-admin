// File: components/search/layouts/AccordionSearchLayout.tsx
import React, { useState } from "react";
import { SearchLayoutProps } from "../types";
import { ChevronDown, ChevronUp } from "lucide-react";
import OpenSearchGroup from "../core/OpenSearchGroup";


const AccordionSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set([activeSearchGroups[0]?.id]));

  const toggleGroup = (groupId: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupId)) {
      newExpandedGroups.delete(groupId);
    } else {
      newExpandedGroups.add(groupId);
    }
    setExpandedGroups(newExpandedGroups);
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        {activeSearchGroups.map((group, index) => (
          <div key={group.id} className="border-b last:border-b-0 dark:border-gray-700">
            <button
              className="w-full text-left p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
              onClick={() => toggleGroup(group.id)}
            >
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{group.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{group.placeholder}</p>
              </div>
              <div>
                {expandedGroups.has(group.id) ? (
                  <ChevronUp className="text-gray-500" size={20} />
                ) : (
                  <ChevronDown className="text-gray-500" size={20} />
                )}
              </div>
            </button>
            
            {expandedGroups.has(group.id) && (
              <div className="p-4">
                <OpenSearchGroup
                  id={group.id}
                  label=""  // Hide duplicate label
                  placeholder=""
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
            )}
          </div>
        ))}
      </div>
      
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

export default AccordionSearchLayout;
