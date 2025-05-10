// File: components/search/layouts/FlatSearchLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/layouts/options/layout.types";
import { fieldController } from "@/features/applet/a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/FieldController";

const FlatSearchLayout: React.FC<AppletInputProps> = ({
  appletDefinition,
  activeTab,
  actionButton,
  className = "",
}) => {
  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
        {appletDefinition.map((group, groupIndex) => (
          <div key={group.id} className="mb-8">
            {/* Group header with minimal padding */}
            {appletDefinition.length > 1 && (
              <div className="mb-4">
                <h4 className="text-lg font-medium text-rose-500 dark:text-rose-400">{group.label}</h4>
                {group.placeholder && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.placeholder}</p>
                )}
                {group.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
                )}
              </div>
            )}
            
            {/* Group fields */}
            <div className="grid grid-cols-1 gap-y-6">
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
            
            {/* Add a subtle divider between groups if not the last group */}
            {groupIndex < appletDefinition.length - 1 && (
              <div className="border-b-3 border-gray-200 dark:border-gray-700 mt-8"></div>
            )}
          </div>
        ))}
        
        <div className="flex justify-end mt-8">
          {actionButton}
        </div>
      </div>
    </div>
  );
};

export default FlatSearchLayout;
