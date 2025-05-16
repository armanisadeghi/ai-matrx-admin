// File: features/applet/layouts/core/SimpleFields.tsx
"use client";
import React from "react";
import FieldsWithLabels from "./FieldsWithLabels";
import { normalizeFieldDefinition } from "@/features/applet/utils/field-normalization";
import { FieldDefinition, ComponentType, ComponentProps } from "@/types/customAppTypes";

// Make a more flexible type that allows partial componentProps
export type SimpleField = {
  id: string;  // Required
  component: ComponentType;  // Required
  label?: string;
  description?: string;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  includeOther?: boolean;
  group?: string;
  iconName?: string;
  defaultValue?: any;
  options?: FieldDefinition['options'];
  componentProps?: Partial<ComponentProps>;  // Make componentProps partial
};

interface SimpleFieldsProps {
  fields: SimpleField | SimpleField[];
  sourceId: string;
  source?: string;
  isMobile?: boolean;
  className?: string;
  showLabels?: boolean;
  labelPosition?: "top" | "left" | "right";
}

const SimpleFields: React.FC<SimpleFieldsProps> = ({
  fields,
  sourceId,
  source = "applet",
  isMobile = false,
  className = "",
  showLabels = true,
  labelPosition = "top",
}) => {
  // Normalize to array if a single field is provided
  const fieldArray = Array.isArray(fields) ? fields : [fields];
  const normalizedFields: FieldDefinition[] = fieldArray.map(field => {
    return normalizeFieldDefinition(field as Partial<FieldDefinition>);
  });
  
  return (
    <FieldsWithLabels
      fields={normalizedFields}
      appletId={sourceId}
      isMobile={isMobile}
      source={source}
      className={className}
      showLabels={showLabels}
      labelPosition={labelPosition}
    />
  );
};

export default SimpleFields;