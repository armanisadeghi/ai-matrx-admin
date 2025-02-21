import React, { useState } from "react";
import { SearchLayoutProps } from "../types";
import { fieldController } from "../../input-components-4/components/field-components/FieldController";

const MinimalistSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  return (
    <div className={`w-full max-w-5xl mx-auto p-4 ${className}`}>
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-8">
        <h2 className="text-2xl font-light text-center">What are you looking for?</h2>
      </div>
      
      <div className="space-y-10">
        {activeSearchGroups.map((group) => {
          const isExpanded = expandedGroup === group.id;
          
          return (
            <div key={group.id} className="transition-all duration-300">
              <div 
                className="flex items-center cursor-pointer py-3 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
              >
                <h3 className="text-xl font-light text-gray-800 dark:text-gray-200 flex-grow">{group.label}</h3>
                <div className={`transform transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
              
              <div 
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  isExpanded ? "max-h-[1000px] opacity-100 mt-6" : "max-h-0 opacity-0"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.fields.map((field) => (
                    <div key={field.brokerId} className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        {field.label}
                      </label>
                      {fieldController(field, false)}
                      {field.helpText && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-center mt-12">
        {actionButton || (
          <button className="bg-transparent hover:bg-rose-500 text-rose-500 hover:text-white border-2 border-rose-500 transition-colors duration-300 rounded-full px-8 py-3 text-lg">
            Search
          </button>
        )}
      </div>
    </div>
  );
};

export default MinimalistSearchLayout;