// src/features/field-settings/tabs/DateTimeTab.tsx
"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { 
  selectFieldMinDate,
  selectFieldMaxDate,
  selectFieldAutoComplete
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { 
  setMinDate,
  setMaxDate,
  setAutoComplete
} from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { fieldHelpTextItems } from "@/constants/app-builder-help-text";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";
import { Card, CardContent } from "@/components/ui/card";

// INDIVIDUAL COMPONENTS

interface FieldComponentProps {
  fieldId: string;
}

// MinDate Component
export const FieldMinDateComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const minDate = useAppSelector((state) => selectFieldMinDate(state, fieldId));
  
  const handleMinDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setMinDate({ id: fieldId, minDate: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="minDate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Minimum Date
        </Label>
        <HelpIcon text={fieldHelpTextItems.minDate || "Earliest date that can be selected"} />
      </div>
      <Input
        type="date"
        id="minDate"
        name="minDate"
        value={minDate || ""}
        onChange={handleMinDateChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      />
    </div>
  );
};

// MaxDate Component
export const FieldMaxDateComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const maxDate = useAppSelector((state) => selectFieldMaxDate(state, fieldId));
  
  const handleMaxDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setMaxDate({ id: fieldId, maxDate: e.target.value }));
  };
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="maxDate" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Maximum Date
        </Label>
        <HelpIcon text={fieldHelpTextItems.maxDate || "Latest date that can be selected"} />
      </div>
      <Input
        type="date"
        id="maxDate"
        name="maxDate"
        value={maxDate || ""}
        onChange={handleMaxDateChange}
        className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      />
    </div>
  );
};

// DateRangeCard Component - Combines MinDate and MaxDate in a card
export const FieldDateRangeComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  return (
    <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure date range limitations
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <FieldMinDateComponent fieldId={fieldId} />
          <FieldMaxDateComponent fieldId={fieldId} />
        </div>
      </CardContent>
    </Card>
  );
};

// AutoComplete Component
export const FieldAutoCompleteComponent: React.FC<FieldComponentProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const autoComplete = useAppSelector((state) => selectFieldAutoComplete(state, fieldId));
  
  const handleAutoCompleteChange = (value: string) => {
    dispatch(setAutoComplete({ id: fieldId, autoComplete: value }));
  };
  
  const autoCompleteOptions = [
    { value: "off", label: "Off" },
    { value: "on", label: "On" },
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "username", label: "Username" },
    { value: "new-password", label: "New Password" },
    { value: "current-password", label: "Current Password" },
    { value: "one-time-code", label: "One-Time Code" },
    { value: "cc-name", label: "Credit Card Name" },
    { value: "cc-number", label: "Credit Card Number" },
    { value: "cc-exp", label: "Credit Card Expiration" },
    { value: "cc-csc", label: "Credit Card CSC" },
    { value: "street-address", label: "Street Address" },
    { value: "address-line1", label: "Address Line 1" },
    { value: "address-line2", label: "Address Line 2" },
    { value: "address-level1", label: "State/Province" },
    { value: "address-level2", label: "City" },
    { value: "postal-code", label: "Postal Code" },
    { value: "country", label: "Country" },
    { value: "tel", label: "Telephone" },
    { value: "bday", label: "Birthday" },
  ];
  
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor="autoComplete" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Autocomplete
        </Label>
        <HelpIcon text={fieldHelpTextItems.autoComplete || "Browser autocomplete behavior for this field"} />
      </div>
      <Select
        value={autoComplete || "off"}
        onValueChange={handleAutoCompleteChange}
      >
        <SelectTrigger className="mt-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <SelectValue placeholder="Select autocomplete behavior" />
        </SelectTrigger>
        <SelectContent>
          {autoCompleteOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// WRAPPER COMPONENT

interface DateTimeTabProps {
  fieldId: string;
}

const DateTimeTab: React.FC<DateTimeTabProps> = ({ fieldId }) => {
  return (
    <div className="space-y-6 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Date & Time Settings</h3>
      
      <FieldDateRangeComponent fieldId={fieldId} />
      <FieldAutoCompleteComponent fieldId={fieldId} />
    </div>
  );
};

export default DateTimeTab;