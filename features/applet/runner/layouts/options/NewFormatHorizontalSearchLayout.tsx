// File: components/search/layouts/NewFormatHorizontalSearchLayout.tsx
import React from "react";
import HorizontalSearchLayout from "./HorizontalSearchLayout";
import { FieldDefinition } from "@/types/customAppTypes";

interface NewFormatGroup {
  id: string;
  label: string;
  placeholder?: string;
  description?: string;
  fields: FieldDefinition[];
}

interface NewFormatAppletInputProps {
  activeAppletContainers: NewFormatGroup[];
  activeTab: string;
  activeFieldId: string;
  setActiveFieldId: (id: string) => void;
  actionButton?: React.ReactNode;
  className?: string;
}

const NewFormatHorizontalSearchLayout: React.FC<NewFormatAppletInputProps> = (props) => {

  return (
    <HorizontalSearchLayout
      activeFieldId={props.activeFieldId}
      setActiveFieldId={props.setActiveFieldId}
      actionButton={props.actionButton}
      className={props.className}
    />
  );
};

export default NewFormatHorizontalSearchLayout;