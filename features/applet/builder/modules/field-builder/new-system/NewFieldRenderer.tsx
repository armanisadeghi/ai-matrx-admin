'use client';

import React from 'react';
import { FieldDefinition } from '@/types/customAppTypes';
import { normalizeFieldDefinition } from '@/features/applet/utils/field-normalization';
import PreviewFieldController from './PreviewFieldController';
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";

interface FieldRendererProps {
  field: FieldDefinition;
}

export const NewFieldRenderer: React.FC<FieldRendererProps> = ({ field: rawField }) => {
  // Normalize the field to ensure all properties exist
  const field = normalizeFieldDefinition(rawField);
  
  return (
    <div className="w-full min-w-96 p-4 bg-white rounded-xl dark:bg-gray-800 border dark:border-gray-700">
      <div>
        <div className="mb-6 last:mb-0">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
            {field.label}
            {field.helpText && <HelpIcon text={field.helpText} />}
            {field.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
          </label>
          <PreviewFieldController field={field} />
        </div>
      </div>
    </div>
  );
};

export default NewFieldRenderer; 