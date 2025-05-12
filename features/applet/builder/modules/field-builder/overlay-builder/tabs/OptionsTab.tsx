// src/features/field-settings/tabs/OptionsTab.tsx
import React from "react";
import SmartOptionsManager from "../../editor/SmartOptionsManager";
import { FieldRowsComponent } from "./StylingTab";


interface OptionsTabProps {
  fieldId: string;
}

const OptionsTab: React.FC<OptionsTabProps> = ({ fieldId }) => {
  return (
    <div className="space-y-6 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Options</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Manage the options that will be available for selection in this field.
      </p>

      {/* Reuse the existing SmartOptionsManager component */}
      <SmartOptionsManager fieldId={fieldId} />
      <FieldRowsComponent fieldId={fieldId} />
    </div>
  );
};

export default OptionsTab;