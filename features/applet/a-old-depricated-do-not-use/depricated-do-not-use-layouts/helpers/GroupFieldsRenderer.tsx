'use client';

import React, { useEffect, useRef } from "react";
import { GroupFieldConfig } from "@/features/applet/a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/types";
import { fieldController } from "@/features/applet/a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/FieldController";

interface GroupFieldsRendererProps {
  fields: GroupFieldConfig[];
  description?: string;
  isMobile?: boolean;
}

const GroupFieldsRenderer: React.FC<GroupFieldsRendererProps> = ({
  fields,
  description,
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
  );
};

export default GroupFieldsRenderer; 