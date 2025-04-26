import React, { useState } from "react";
import { SearchLayoutProps } from "@/features/applet/layouts/types";
import { fieldController } from "@/features/applet/runner/components/field-components/FieldController";
import UniformHeightWrapper from "@/features/applet/layouts/helpers/UniformHeightWrapper";

const SidebarSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  const [activeGroupId, setActiveGroupId] = useState(
    activeSearchGroups.length > 0 ? activeSearchGroups[0].id : null
  );

  const activeGroup = activeSearchGroups.find(group => group.id === activeGroupId);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-r dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Search Options</h3>
          <div className="space-y-1">
            {activeSearchGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  activeGroupId === group.id
                    ? "bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-100"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <div className="flex items-center">
                  <span className="flex-grow">{group.label}</span>
                  {activeGroupId === group.id && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-grow p-6 bg-white dark:bg-gray-900">
          {activeSearchGroups.map((group) => (
            <UniformHeightWrapper
              key={group.id}
              groupId={group.id}
              layoutType="sidebar"
              className={`transition-opacity duration-300 ${
                activeGroupId === group.id 
                  ? 'opacity-100 visible' 
                  : 'opacity-0 invisible absolute'
              }`}
            >
              {group.id === activeGroupId && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-medium text-gray-900 dark:text-gray-100">
                      {group.label}
                    </h2>
                    {group.description && (
                      <p className="mt-2 text-gray-600 dark:text-gray-400">{group.description}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {group.fields.map((field) => (
                      <div key={field.brokerId}>
                        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                          {field.label}
                        </label>
                        {fieldController(field, false)}
                        {field.helpText && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-10">
                    {actionButton || (
                      <button className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-md px-6 py-3">
                        Search
                      </button>
                    )}
                  </div>
                </div>
              )}
            </UniformHeightWrapper>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SidebarSearchLayout;