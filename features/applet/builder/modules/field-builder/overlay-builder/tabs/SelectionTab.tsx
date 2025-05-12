// src/features/field-settings/tabs/SelectionTab.tsx
"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import {
  selectFieldMultiSelect,
  selectFieldMaxItems,
  selectFieldMinItems,
  selectFieldShowSelectAll,
  selectFieldIncludeOther
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import {
  setMultiSelect,
  setMaxItems,
  setMinItems,
  setShowSelectAll,
  setIncludeOther
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { fieldHelpTextItems } from "@/constants/app-builder-help-text";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon"; // Adjust path as needed
import { Card, CardContent } from "@/components/ui/card";

// INDIVIDUAL COMPONENTS

interface FieldComponentProps {
  fieldId: string;
}

// MultiSelect Component
export const FieldMultiSelectComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const multiSelect = useAppSelector((state) => selectFieldMultiSelect(state, fieldId));
  
  const handleMultiSelectChange = (checked: boolean) => {
    dispatch(setMultiSelect({ id: fieldId, multiSelect: checked }));
  };
  
  return (
    <div className="flex items-center space-x-2 cursor-pointer">
      <Checkbox
        id="multiSelect"
        checked={multiSelect || false}
        onCheckedChange={(checked) => handleMultiSelectChange(!!checked)}
        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
      />
      <Label 
        htmlFor="multiSelect" 
        className="text-gray-800 dark:text-gray-200 cursor-pointer"
        onClick={() => handleMultiSelectChange(!multiSelect)}
      >
        Allow Multiple Selection
      </Label>
      <HelpIcon text={fieldHelpTextItems.multiSelect || "Allow users to select multiple options"} />
    </div>
  );
};

// ShowSelectAll Component
export const FieldShowSelectAllComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const showSelectAll = useAppSelector((state) => selectFieldShowSelectAll(state, fieldId));
  
  const handleShowSelectAllChange = (checked: boolean) => {
    dispatch(setShowSelectAll({ id: fieldId, showSelectAll: checked }));
  };
  
  return (
    <div className="flex items-center space-x-2 cursor-pointer">
      <Checkbox
        id="showSelectAll"
        checked={showSelectAll || false}
        onCheckedChange={(checked) => handleShowSelectAllChange(!!checked)}
        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
      />
      <Label 
        htmlFor="showSelectAll" 
        className="text-gray-800 dark:text-gray-200 cursor-pointer"
        onClick={() => handleShowSelectAllChange(!showSelectAll)}
      >
        Show "Select All" Option
      </Label>
      <HelpIcon text={fieldHelpTextItems.showSelectAll || "Shows a 'Select All' option for multi-select fields"} />
    </div>
  );
};

// IncludeOther Component
export const FieldIncludeOtherComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const includeOther = useAppSelector((state) => selectFieldIncludeOther(state, fieldId));
  
  const handleIncludeOtherChange = (checked: boolean) => {
    dispatch(setIncludeOther({ id: fieldId, includeOther: checked }));
  };
  
  return (
    <div className="flex items-center space-x-2 cursor-pointer">
      <Checkbox
        id="includeOther"
        checked={includeOther || false}
        onCheckedChange={(checked) => handleIncludeOtherChange(!!checked)}
        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
      />
      <Label 
        htmlFor="includeOther" 
        className="text-gray-800 dark:text-gray-200 cursor-pointer"
        onClick={() => handleIncludeOtherChange(!includeOther)}
      >
        Include "Other" Option
      </Label>
      <HelpIcon text={fieldHelpTextItems.includeOther || "Add an 'Other' option with a text input"} />
    </div>
  );
};

// Selection Options Card Component
export const FieldSelectionOptionsCardComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  return (
    <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4 space-y-4">
        <FieldMultiSelectComponent fieldId={fieldId} />
        <FieldShowSelectAllComponent fieldId={fieldId} />
        <FieldIncludeOtherComponent fieldId={fieldId} />
      </CardContent>
    </Card>
  );
};

// MinItems Component
export const FieldMinItemsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const minItems = useAppSelector((state) => selectFieldMinItems(state, fieldId));
  
  const handleMinItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setMinItems({ id: fieldId, minItems: parseInt(e.target.value) || 0 }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="minItems" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Minimum Items
        </Label>
        <HelpIcon text={fieldHelpTextItems.minItems || "Minimum number of items that must be selected"} />
      </div>
      <Input
        type="number"
        id="minItems"
        name="minItems"
        min={0}
        value={minItems === null ? 0 : minItems}
        onChange={handleMinItemsChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
    </div>
  );
};

// MaxItems Component
export const FieldMaxItemsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const maxItems = useAppSelector((state) => selectFieldMaxItems(state, fieldId));
  
  const handleMaxItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? undefined : parseInt(e.target.value);
    dispatch(setMaxItems({ id: fieldId, maxItems: val }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="maxItems" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Maximum Items
        </Label>
        <HelpIcon text={fieldHelpTextItems.maxItems || "Maximum number of items that can be selected"} />
      </div>
      <Input
        type="number"
        id="maxItems"
        name="maxItems"
        min={0}
        value={maxItems === null || maxItems === undefined ? "" : maxItems}
        onChange={handleMaxItemsChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        placeholder="No limit"
      />
    </div>
  );
};

// WRAPPER COMPONENT

interface SelectionTabProps {
  fieldId: string;
}

const SelectionTab: React.FC<SelectionTabProps> = ({ fieldId }) => {
  return (
    <div className="space-y-6 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Selection Settings</h3>
      
      <FieldSelectionOptionsCardComponent fieldId={fieldId} />
      
      <div className="grid grid-cols-2 gap-6">
        <FieldMinItemsComponent fieldId={fieldId} />
        <FieldMaxItemsComponent fieldId={fieldId} />
      </div>
    </div>
  );
};

export default SelectionTab;