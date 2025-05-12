// src/features/field-settings/tabs/BasicTab.tsx
"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import {
  selectFieldLabel,
  selectFieldDescription,
  selectFieldHelpText,
  selectFieldPlaceholder,
  selectFieldRequired,
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import {
  setLabel,
  setDescription,
  setHelpText,
  setPlaceholder,
  setRequired,
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { fieldHelpTextItems } from "@/constants/app-builder-help-text";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";

// INDIVIDUAL COMPONENTS

interface FieldComponentProps {
  fieldId: string;
}

// Field Label Component
export const FieldLabelComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const label = useAppSelector((state) => selectFieldLabel(state, fieldId));
  
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setLabel({ id: fieldId, label: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="label" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Label
        </Label>
        <HelpIcon text={fieldHelpTextItems.label} />
      </div>
      <Input
        id="label"
        name="label"
        value={label || ""}
        onChange={handleLabelChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
    </div>
  );
};

// Field Description Component
export const FieldDescriptionComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const description = useAppSelector((state) => selectFieldDescription(state, fieldId));
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setDescription({ id: fieldId, description: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Description
        </Label>
        <HelpIcon text={fieldHelpTextItems.description} />
      </div>
      <Textarea
        id="description"
        name="description"
        value={description || ""}
        onChange={handleDescriptionChange}
        rows={3}
        className="resize-none mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
    </div>
  );
};

// Help Text Component
export const FieldHelpTextComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const helpText = useAppSelector((state) => selectFieldHelpText(state, fieldId));
  
  const handleHelpTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setHelpText({ id: fieldId, helpText: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="helpText" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Help Text
        </Label>
        <HelpIcon text={fieldHelpTextItems.helpText} />
      </div>
      <Textarea
        id="helpText"
        name="helpText"
        value={helpText || ""}
        onChange={handleHelpTextChange}
        rows={3}
        className="resize-none mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
    </div>
  );
};

// Placeholder Component
export const FieldPlaceholderComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const placeholder = useAppSelector((state) => selectFieldPlaceholder(state, fieldId));
  
  const handlePlaceholderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setPlaceholder({ id: fieldId, placeholder: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="placeholder" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Placeholder
        </Label>
        <HelpIcon text={fieldHelpTextItems.placeholder} />
      </div>
      <Input
        id="placeholder"
        name="placeholder"
        value={placeholder || ""}
        onChange={handlePlaceholderChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
    </div>
  );
};

// Required Component
export const FieldRequiredComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const required = useAppSelector((state) => selectFieldRequired(state, fieldId));
  
  const handleRequiredChange = (checked: boolean) => {
    dispatch(setRequired({ id: fieldId, required: checked }));
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 cursor-pointer">
        <Checkbox
          id="required"
          checked={required || false}
          onCheckedChange={(checked) => handleRequiredChange(!!checked)}
          className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
        />
        <Label 
          htmlFor="required" 
          className="text-gray-800 dark:text-gray-200 cursor-pointer"
          onClick={() => handleRequiredChange(!required)}
        >
          Required
        </Label>
        <HelpIcon text={fieldHelpTextItems.required} />
      </div>
    </div>
  );
};

// WRAPPER COMPONENT

interface BasicTabProps {
  fieldId: string;
}

const BasicTab: React.FC<BasicTabProps> = ({ fieldId }) => {
  return (
    <div className="space-y-6 p-6">
      <FieldLabelComponent fieldId={fieldId} />
      <FieldDescriptionComponent fieldId={fieldId} />
      <FieldHelpTextComponent fieldId={fieldId} />
      <FieldPlaceholderComponent fieldId={fieldId} />
      <FieldRequiredComponent fieldId={fieldId} />
    </div>
  );
};

export default BasicTab;