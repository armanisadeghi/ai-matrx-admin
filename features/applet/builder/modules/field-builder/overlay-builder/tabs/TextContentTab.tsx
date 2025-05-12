// src/features/field-settings/tabs/TextContentTab.tsx
"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { 
  selectFieldMaxLength,
  selectFieldOnLabel,
  selectFieldOffLabel,
  selectFieldCustomContent
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { 
  setMaxLength,
  setOnLabel,
  setOffLabel,
  setCustomContent
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { fieldHelpTextItems } from "@/constants/app-builder-help-text";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";
import { Card, CardContent } from "@/components/ui/card";

// INDIVIDUAL COMPONENTS

interface FieldComponentProps {
  fieldId: string;
}

// MaxLength Component
export const FieldMaxLengthComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const maxLength = useAppSelector((state) => selectFieldMaxLength(state, fieldId));
  
  const handleMaxLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? undefined : parseInt(e.target.value);
    dispatch(setMaxLength({ id: fieldId, maxLength: val }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="maxLength" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Maximum Length
        </Label>
        <HelpIcon text={fieldHelpTextItems.maxLength || "Maximum number of characters allowed"} />
      </div>
      <Input
        type="number"
        id="maxLength"
        name="maxLength"
        min={0}
        value={maxLength === null || maxLength === undefined ? "" : maxLength}
        onChange={handleMaxLengthChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        placeholder="No limit"
      />
    </div>
  );
};

// Toggle Labels Component
export const FieldToggleLabelsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const onLabel = useAppSelector((state) => selectFieldOnLabel(state, fieldId));
  const offLabel = useAppSelector((state) => selectFieldOffLabel(state, fieldId));
  
  const handleOnLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setOnLabel({ id: fieldId, onLabel: e.target.value }));
  };
  
  const handleOffLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setOffLabel({ id: fieldId, offLabel: e.target.value }));
  };
  
  return (
    <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Label settings for toggle components
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1">
              <Label htmlFor="onLabel" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ON Label
              </Label>
              <HelpIcon text={fieldHelpTextItems.onLabel || "Label for the 'on' state (e.g., Yes)"} />
            </div>
            <Input
              id="onLabel"
              name="onLabel"
              value={onLabel || ""}
              onChange={handleOnLabelChange}
              className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Yes"
            />
          </div>
          
          <div>
            <div className="flex items-center gap-1">
              <Label htmlFor="offLabel" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                OFF Label
              </Label>
              <HelpIcon text={fieldHelpTextItems.offLabel || "Label for the 'off' state (e.g., No)"} />
            </div>
            <Input
              id="offLabel"
              name="offLabel"
              value={offLabel || ""}
              onChange={handleOffLabelChange}
              className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="No"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Custom Content Component
export const FieldCustomContentComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const customContent = useAppSelector((state) => selectFieldCustomContent(state, fieldId));
  
  const handleCustomContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setCustomContent({ id: fieldId, customContent: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <Label htmlFor="customContent" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Custom Content
        </Label>
        <HelpIcon text={fieldHelpTextItems.customContent || "Custom content for the field (HTML/Markdown supported)"} />
      </div>
      <Textarea
        id="customContent"
        name="customContent"
        value={(customContent || "") as string}
        onChange={handleCustomContentChange}
        rows={5}
        className="resize-none mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        placeholder="Enter custom content here (supports HTML and Markdown)..."
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        This field accepts HTML and Markdown for rich formatting.
      </p>
    </div>
  );
};

// WRAPPER COMPONENT

interface TextContentTabProps {
  fieldId: string;
}

const TextContentTab: React.FC<TextContentTabProps> = ({ fieldId }) => {
  return (
    <div className="space-y-6 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Text Content</h3>
      
      <FieldMaxLengthComponent fieldId={fieldId} />
      <FieldToggleLabelsComponent fieldId={fieldId} />
      <FieldCustomContentComponent fieldId={fieldId} />
    </div>
  );
};

export default TextContentTab;