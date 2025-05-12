"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { 
  setWidth,
  setDirection,
  setGridCols,
  setRows,
  setSpellCheck
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { fieldHelpTextItems } from "@/constants/app-builder-help-text";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";
import {
  widthOptions,
  directionOptions,
  gridColsOptions
} from "@/features/applet/constants/field-constants";
import {  selectFieldWidth, 
  selectFieldDirection, 
  selectFieldGridCols, 
  selectFieldRows, 
  selectFieldSpellCheck,
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { fieldDirection } from "@/types/customAppTypes";

// INDIVIDUAL COMPONENTS

interface FieldComponentProps {
  fieldId: string;
}

// Width Component
export const FieldWidthComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const width = useAppSelector((state) => selectFieldWidth(state, fieldId));
  
  const handleWidthChange = (value: string) => {
    dispatch(setWidth({ id: fieldId, width: value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="width" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Width
        </Label>
        <HelpIcon text={fieldHelpTextItems.width || "Controls the width of the field"} />
      </div>
      <Select
        value={width || undefined}
        onValueChange={handleWidthChange}
      >
        <SelectTrigger className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <SelectValue placeholder="Select width" />
        </SelectTrigger>
        <SelectContent>
          {widthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Direction Component
export const FieldDirectionComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const direction = useAppSelector((state) => selectFieldDirection(state, fieldId));
  
  const handleDirectionChange = (value: fieldDirection) => {
    dispatch(setDirection({ id: fieldId, direction: value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="direction" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Layout Direction
        </Label>
        <HelpIcon text={fieldHelpTextItems.direction || "Controls the layout direction"} />
      </div>
      <Select
        value={direction || undefined}
        onValueChange={handleDirectionChange}
      >
        <SelectTrigger className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <SelectValue placeholder="Select direction" />
        </SelectTrigger>
        <SelectContent>
          {directionOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Grid Columns Component
export const FieldGridColsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const gridCols = useAppSelector((state) => selectFieldGridCols(state, fieldId));
  
  const handleGridColsChange = (value: string) => {
    dispatch(setGridCols({ id: fieldId, gridCols: value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="gridCols" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Grid Columns
        </Label>
        <HelpIcon text={fieldHelpTextItems.gridCols || "Number of columns in the grid layout"} />
      </div>
      <Select
        value={gridCols || undefined}
        onValueChange={handleGridColsChange}
      >
        <SelectTrigger className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <SelectValue placeholder="Select grid columns" />
        </SelectTrigger>
        <SelectContent>
          {gridColsOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Rows Component
export const FieldRowsComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const rows = useAppSelector((state) => selectFieldRows(state, fieldId));
  
  const handleRowsDecrease = () => {
    if (rows && rows > 1) {
      dispatch(setRows({ id: fieldId, rows: rows - 1 }));
    }
  };
  
  const handleRowsIncrease = () => {
    dispatch(setRows({ id: fieldId, rows: rows ? rows + 1 : 1 }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="rows" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Rows / Items Per View
        </Label>
        <HelpIcon text={fieldHelpTextItems.rows || "Number of rows or items to display before scrolling"} />
      </div>
      <div className="flex items-center mt-1 border rounded-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <button
          type="button"
          onClick={handleRowsDecrease}
          className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-md"
          aria-label="Decrease rows"
        >
          <span className="text-lg">−</span>
        </button>
        <div className="flex-1 px-3 py-2 text-center text-gray-900 dark:text-gray-100">{rows || 0} rows</div>
        <button
          type="button"
          onClick={handleRowsIncrease}
          className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-md"
          aria-label="Increase rows"
        >
          <span className="text-lg">+</span>
        </button>
      </div>
    </div>
  );
};

// Spell Check Component
export const FieldSpellCheckComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const spellCheck = useAppSelector((state) => selectFieldSpellCheck(state, fieldId));
  
  const handleSpellCheckChange = (checked: boolean) => {
    dispatch(setSpellCheck({ id: fieldId, spellCheck: checked }));
  };
  
  return (
    <div className="flex items-center space-x-2 cursor-pointer">
      <Checkbox
        id="spellCheck"
        checked={spellCheck || false}
        onCheckedChange={(checked) => handleSpellCheckChange(!!checked)}
        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700 dark:data-[state=checked]:text-white cursor-pointer"
      />
      <Label 
        htmlFor="spellCheck" 
        className="text-gray-800 dark:text-gray-200 cursor-pointer"
        onClick={() => handleSpellCheckChange(!spellCheck)}
      >
        Enable Spell Check
      </Label>
      <HelpIcon text={fieldHelpTextItems.spellCheck || "Enables browser spell checking"} />
    </div>
  );
};

// WRAPPER COMPONENT

interface StylingTabProps {
  fieldId: string;
}

const StylingTab: React.FC<StylingTabProps> = ({ fieldId }) => {
  return (
    <div className="space-y-6 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Styling</h3>
      
      <FieldWidthComponent fieldId={fieldId} />
      <FieldDirectionComponent fieldId={fieldId} />
      <FieldGridColsComponent fieldId={fieldId} />
      <FieldRowsComponent fieldId={fieldId} />
      <FieldSpellCheckComponent fieldId={fieldId} />
    </div>
  );
};

export default StylingTab;