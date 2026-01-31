// File: features/applet/layouts/core/FieldsWithLabels.tsx
"use client";
import React from "react";
import { FieldDefinition } from "@/types/customAppTypes";
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
    separatorStyle?: "border" | "spacing" | "background" | "none";
}

const FieldsWithLabels: React.FC<FieldsListProps> = ({
    fields,
    sourceId,
    isMobile = false,
    source = "applet",
    className = "",
    wrapperClassName = "mb-6 last:mb-0", // Increased default spacing
    showLabels = true,
    showHelpText = true,
    showRequired = true,
    labelPosition = "top",
    labelClassName = "",
    emptyLabelSpacing = "mb-3",
    separatorStyle = "spacing", // Default to spacing separation
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

    const getSeparatorClasses = (isLast: boolean, index: number) => {
      if (isLast) return "";
      
      switch (separatorStyle) {
        case "border":
          return "border-b border-gray-300 dark:border-gray-700 pb-6 mb-6";
        case "background":
          // Alternate every other field with a subtle background overlay
          return index % 2 === 0 ? "bg-black/[0.02] dark:bg-white/[0.02] p-4 rounded-lg mb-4" : "mb-4";
        case "spacing":
          return "mb-8";
        case "none":
        default:
          return "";
      }
    };

    return (
      <div className={className}>
        {fields.map((field, index) => {
          const isHorizontalLayout = labelPosition === "left" || labelPosition === "right";
          const isLast = index === fields.length - 1;
          
          return (
            <div 
              key={field.id} 
              className={cn(
                // Base wrapper classes
                wrapperClassName,
                isHorizontalLayout ? "flex items-start" : "",
                // Separator classes
                getSeparatorClasses(isLast, index),
                // Add subtle transition for better UX
                "transition-all duration-200"
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