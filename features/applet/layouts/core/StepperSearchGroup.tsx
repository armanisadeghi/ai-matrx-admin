// File: components/search/core/StepperSearchGroup.tsx
// For the stepper layout
import React, { useEffect, useRef } from "react";
import { SearchGroupRendererProps } from "@/features/applet/layouts/options/layout.types";
import { fieldController } from "@/features/applet/runner/components/field-components/FieldController";

const StepperSearchGroup: React.FC<SearchGroupRendererProps> = ({
  id,
  label,
  placeholder,
  description,
  fields,
  isMobile = false,
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
    <div className="w-full">
      <h3 className="text-xl text-rose-500 font-medium mb-2">{label}</h3>
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
  );
};

export default StepperSearchGroup;
