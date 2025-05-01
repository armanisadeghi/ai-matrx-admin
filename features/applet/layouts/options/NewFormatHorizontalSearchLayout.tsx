// File: components/search/layouts/NewFormatHorizontalSearchLayout.tsx
import React from "react";
import HorizontalSearchLayout from "./HorizontalSearchLayout";
import { convertNewFieldToLegacy } from "@/features/applet/runner/utils/converter";
import { FieldDefinition } from "@/features/applet/builder/builder.types";

// Interface for the new format group structure
interface NewFormatGroup {
  id: string;
  label: string;
  placeholder?: string;
  description?: string;
  fields: FieldDefinition[];
}

interface NewFormatAppletInputProps {
  appletDefinition: NewFormatGroup[];
  activeTab: string;
  activeFieldId: string;
  setActiveFieldId: (id: string) => void;
  actionButton?: React.ReactNode;
  className?: string;
}

const NewFormatHorizontalSearchLayout: React.FC<NewFormatAppletInputProps> = (props) => {
  // Convert the new format to the legacy format
  const legacyAppletDefinition = props.appletDefinition.map(group => ({
    id: group.id,
    label: group.label,
    placeholder: group.placeholder,
    description: group.description,
    fields: group.fields.map(field => convertNewFieldToLegacy(field))
  }));

  // Pass the converted data to the existing layout
  return (
    <HorizontalSearchLayout
      appletDefinition={legacyAppletDefinition}
      activeTab={props.activeTab}
      activeFieldId={props.activeFieldId}
      setActiveFieldId={props.setActiveFieldId}
      actionButton={props.actionButton}
      className={props.className}
    />
  );
};

export default NewFormatHorizontalSearchLayout;