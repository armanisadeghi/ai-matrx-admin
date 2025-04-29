// File: components/search/core/OpenSearchGroup.tsx
// For the open/non-collapsible layouts
import React, { useEffect, useRef } from "react";
import { SearchGroupRendererProps } from "../options/layout.types";
import { fieldController } from "@/features/applet/runner/components/field-components/FieldController";


const OpenSearchGroup: React.FC<SearchGroupRendererProps> = ({
  id,
  label,
  placeholder,
  description,
  fields,
  isMobile = false,
  className = "",
}) => {
  const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());

  useEffect(() => {
    fields.forEach((field) => {
      if (!fieldRefs.current.has(field.brokerId)) {
        fieldRefs.current.set(field.brokerId, fieldController(field, isMobile));
      }
    });
  }, [fields, isMobile]);

  return (
    <div className={`border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700 ${className}`}>
      {label && (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-medium text-rose-500">{label}</h3>
          {placeholder && <p className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</p>}
        </div>
      )}
      
      <div className="p-4">
        {description && (
          <div className="mb-5 text-sm text-gray-500 dark:text-gray-400">{description}</div>
        )}
        
        <div>
          {fields.map((field) => (
            <div key={field.brokerId} className="mb-6 last:mb-0">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                {field.label}
              </label>
              {fieldRefs.current.get(field.brokerId)}
              {field.helpText && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OpenSearchGroup;
