// File: features\applet\layouts\core\SearchGroupField.tsx
'use client';

import React, { useEffect, useRef } from "react";
import { fieldController } from "@/features/applet/runner/field-components/FieldController";
import SearchField from "./SearchField";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";
import { ContainerRenderProps } from "@/features/applet/runner/layouts/core/AppletInputLayoutManager";



const SearchGroupField: React.FC<ContainerRenderProps> = ({
  id,
  label,
  description,
  fields,
  isActive,
  onClick,
  onOpenChange,
  isLast = false,
  actionButton,
  className = "",
  isMobile = false,
  hideContainerPlaceholder=false,
}) => {
  const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());

  useEffect(() => {
    fields.forEach((field) => {
      if (!fieldRefs.current.has(field.id)) {
        fieldRefs.current.set(field.id, fieldController(field, isMobile));
      }
    });
  }, [fields, isMobile]);

  return (
    <SearchField
      id={id}
      label={label}
      description={description}
      isActive={isActive}
      onClick={onClick}
      onOpenChange={onOpenChange}
      isLast={isLast}
      actionButton={isLast ? actionButton : undefined}
      className={className}
      isMobile={isMobile}
      hideContainerPlaceholder={hideContainerPlaceholder}
    >
      <div className="w-full min-w-96 p-4 bg-white rounded-xl dark:bg-gray-800 border dark:border-gray-700">
        <h3 className="text-lg text-rose-500 font-medium mb-1">{label}</h3>
          {/* If the group has no placeholder, render the placeholder here instead */}
              {hideContainerPlaceholder && (
          <div className="pr-1 mb-2 text-sm text-gray-500 dark:text-gray-400">{description}</div>
        )}
        <div className="pr-1 mb-5 text-xs text-gray-500 dark:text-gray-400">{description}</div>
        <div>
          {fields.map((field) => (
            <div key={field.id} className="mb-6 last:mb-0">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                {field.label}
                <HelpIcon text={field.helpText} />
              </label>
              {/* Directly render the saved component */}
              {fieldRefs.current.get(field.id)}
            </div>
          ))}
        </div>
      </div>
    </SearchField>
  );
};

export default SearchGroupField;
