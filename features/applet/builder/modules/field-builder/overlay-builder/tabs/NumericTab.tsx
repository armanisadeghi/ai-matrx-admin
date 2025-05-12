// src/features/field-settings/tabs/NumericTab.tsx
"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { 
  selectFieldMin,
  selectFieldMax,
  selectFieldStep,
  selectFieldRows,
  selectFieldValuePrefix,
  selectFieldValueSuffix
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { 
  setMin,
  setMax,
  setStep,
  setRows,
  setValuePrefix,
  setValueSuffix
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";
import { Card, CardContent } from "@/components/ui/card";
import { fieldHelpTextItems } from "@/constants/app-builder-help-text";

// INDIVIDUAL COMPONENTS

interface FieldComponentProps {
  fieldId: string;
}

// Min Component
export const FieldMinComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const min = useAppSelector((state) => selectFieldMin(state, fieldId));
  
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setMin({ id: fieldId, min: parseFloat(e.target.value) || 0 }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="min" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Minimum
        </Label>
        <HelpIcon text={fieldHelpTextItems.min || "Minimum allowed value"} />
      </div>
      <Input
        type="number"
        id="min"
        name="min"
        value={min === null ? 0 : min}
        onChange={handleMinChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      />
    </div>
  );
};

// Max Component
export const FieldMaxComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const max = useAppSelector((state) => selectFieldMax(state, fieldId));
  
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setMax({ id: fieldId, max: parseFloat(e.target.value) || 0 }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="max" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Maximum
        </Label>
        <HelpIcon text={fieldHelpTextItems.max || "Maximum allowed value"} />
      </div>
      <Input
        type="number"
        id="max"
        name="max"
        value={max === null ? 100 : max}
        onChange={handleMaxChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      />
    </div>
  );
};

// Step Component
export const FieldStepComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const step = useAppSelector((state) => selectFieldStep(state, fieldId));
  
  const handleStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setStep({ id: fieldId, step: parseFloat(e.target.value) || 1 }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="step" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Step
        </Label>
        <HelpIcon text={fieldHelpTextItems.step || "Increment step for numeric values"} />
      </div>
      <Input
        type="number"
        id="step"
        name="step"
        min="0.01"
        step="0.01"
        value={step === null ? 1 : step}
        onChange={handleStepChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      />
    </div>
  );
};

// ValuePrefix Component
export const FieldValuePrefixComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const valuePrefix = useAppSelector((state) => selectFieldValuePrefix(state, fieldId));
  
  const handleValuePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setValuePrefix({ id: fieldId, valuePrefix: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="valuePrefix" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Value Prefix
        </Label>
        <HelpIcon text={fieldHelpTextItems.valuePrefix || "Text to display before the value (e.g., $)"} />
      </div>
      <Input
        id="valuePrefix"
        name="valuePrefix"
        value={valuePrefix || ""}
        onChange={handleValuePrefixChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        placeholder="e.g., $"
      />
    </div>
  );
};

// ValueSuffix Component
export const FieldValueSuffixComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const valueSuffix = useAppSelector((state) => selectFieldValueSuffix(state, fieldId));
  
  const handleValueSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setValueSuffix({ id: fieldId, valueSuffix: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="valueSuffix" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Value Suffix
        </Label>
        <HelpIcon text={fieldHelpTextItems.valueSuffix || "Text to display after the value (e.g., %)"} />
      </div>
      <Input
        id="valueSuffix"
        name="valueSuffix"
        value={valueSuffix || ""}
        onChange={handleValueSuffixChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        placeholder="e.g., %"
      />
    </div>
  );
};

// Range Card Component
export const FieldRangeCardComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  return (
    <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure the range and step for numeric values.
        </p>
        
        <div className="grid grid-cols-3 gap-4">
          <FieldMinComponent fieldId={fieldId} />
          <FieldMaxComponent fieldId={fieldId} />
          <FieldStepComponent fieldId={fieldId} />
        </div>
      </CardContent>
    </Card>
  );
};

// Format Card Component
export const FieldFormatCardComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  return (
    <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Number formatting and display
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <FieldValuePrefixComponent fieldId={fieldId} />
          <FieldValueSuffixComponent fieldId={fieldId} />
        </div>
      </CardContent>
    </Card>
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

// WRAPPER COMPONENT

interface NumericTabProps {
  fieldId: string;
}

const NumericTab: React.FC<NumericTabProps> = ({ fieldId }) => {
  return (
    <div className="space-y-6 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Numeric Settings</h3>
      
      <FieldRangeCardComponent fieldId={fieldId} />
      <FieldFormatCardComponent fieldId={fieldId} />
      <FieldRowsComponent fieldId={fieldId} />
    </div>
  );
};

export default NumericTab;