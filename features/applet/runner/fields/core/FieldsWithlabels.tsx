// File: features/applet/layouts/core/FieldsWithLabels.tsx
"use client";
import React from "react";
import { FieldDefinition } from "@/types";
import { AppletFieldController } from "@/features/applet/runner/fields/core/AppletFieldController";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";
import { cn } from "@/lib/utils";

interface FieldsListProps {
    fields: FieldDefinition[];
    sourceId: string;
    isMobile?: boolean;
    source?: string;
    className?: string;
    wrapperClassName?: string;
    showLabels?: boolean;
    showHelpText?: boolean;
    showRequired?: boolean;
    labelPosition?: "top" | "left" | "right";
    labelClassName?: string;
    emptyLabelSpacing?: string;
}

const FieldsWithLabels: React.FC<FieldsListProps> = ({
    fields,
    sourceId,
    isMobile = false,
    source = "applet",
    className = "",
    wrapperClassName = "mb-5 last:mb-0",
    showLabels = true,
    showHelpText = true,
    showRequired = true,
    labelPosition = "top",
    labelClassName = "",
    emptyLabelSpacing = "mb-3", // Default spacing matching original component
  }) => {
    // Safety checks to prevent runtime errors
    if (!fields) {
      return <div className={className}></div>;
    }
    
    if (!Array.isArray(fields)) {
      console.warn('FieldsWithLabels: fields prop must be an array');
      return <div className={className}></div>;
    }
    
    if (fields.length === 0) {
      return <div className={className}></div>;
    }

    return (
      <div className={className}>
        {fields.map((field) => {
          const isHorizontalLayout = labelPosition === "left" || labelPosition === "right";
          
          return (
            <div 
              key={field.id} 
              className={cn(
                wrapperClassName,
                isHorizontalLayout ? "flex items-start" : ""
              )}
            >
              {showLabels ? (
                <CustomFieldLabelAndHelpText
                  fieldId={field.id}
                  fieldLabel={field.label}
                  helpText={field.helpText}
                  required={field.required}
                  showRequired={showRequired}
                  showHelpText={showHelpText}
                  labelPosition={labelPosition}
                  className={cn(
                    isHorizontalLayout ? "flex-none" : "mb-2",
                    labelClassName
                  )}
                />
              ) : (
                // Add empty spacing div when labels are hidden (matches original behavior)
                <div className={emptyLabelSpacing}></div>
              )}
              <AppletFieldController
                field={field}
                sourceId={sourceId}
                isMobile={isMobile}
                source={source}
                className={isHorizontalLayout ? "flex-1" : ""}
              />
            </div>
          );
        })}
      </div>
    );
  };

export default FieldsWithLabels;