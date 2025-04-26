// File: components/search/layouts/FlatSearchLayout.tsx
import React from "react";
import { SearchLayoutProps } from "@/features/applet/layouts/types";
import { fieldController } from "@/features/applet/runner/components/field-components/FieldController";

const FlatSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  
  // Flatten all fields from all groups
  const allFields = activeSearchGroups.flatMap(group => group.fields);

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">Search Options</h2>
        
        <div className="grid grid-cols-1 gap-y-6">
          {allFields.map((field) => (
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
        
        <div className="flex justify-end mt-8">
          {actionButton || (
            <button className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full px-6 py-3">
              Search
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlatSearchLayout;
