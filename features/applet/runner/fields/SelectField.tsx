import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Import the shadcn/ui Select components
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Define the type for selected option in state
export interface SelectedOptionValue extends FieldOption {
  selected: boolean;
  otherText?: string;
}

interface FieldOption {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  iconName?: string;
}

interface ComponentProps {
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  minDate?: string;
  maxDate?: string;
  onLabel?: string;
  offLabel?: string;
  multiSelect?: boolean;
  maxItems?: number;
  minItems?: number;
  gridCols?: number;
  autoComplete?: string;
  direction?: "vertical" | "horizontal";
  customContent?: React.ReactNode;
  showSelectAll?: boolean;
  width?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  maxLength?: number;
  spellCheck?: boolean;
}

interface FieldDefinition {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  group?: string;
  iconName?: string;
  component: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: FieldOption[];
  componentProps: ComponentProps;
  includeOther?: boolean;
}

const SelectField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
  const { 
    id, 
    label, 
    placeholder = "Select an option", 
    options = [],
    componentProps = {},
    disabled = false,
    includeOther = false
  } = field;
  
  const { width, customContent } = componentProps;
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, "applet", id));
  
  // Initialize stateValue if not set
  useEffect(() => {
    if (!stateValue && options.length > 0) {
      // Initialize with all options having selected: false
      const initialOptions = options.map(option => ({
        ...option,
        selected: false
      }));
      
      // Add Other option if includeOther is true
      if (includeOther) {
        initialOptions.push({
          id: "other",
          label: "Other",
          selected: false,
          description: ""
        });
      }
      
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: initialOptions,
        })
      );
    }
  }, [stateValue, options, includeOther, dispatch, id]);
  
  // Handler for select change
  const handleSelectChange = (selectedId: string) => {
    // Create new options array with only the selected option set to true
    const updatedOptions = (stateValue || []).map((option: SelectedOptionValue) => ({
      ...option,
      selected: option.id === selectedId
    }));
    
    dispatch(
      updateBrokerValue({
        source: "applet",
        itemId: id,
        value: updatedOptions,
      })
    );
  };
  
  // Handler for "Other" text input
  const handleOtherTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const otherText = e.target.value;
    
    const updatedOptions = (stateValue || []).map((option: SelectedOptionValue) => {
      if (option.id === "other") {
        return {
          ...option,
          description: otherText // Store the text in description as specified
        };
      }
      return option;
    });
    
    dispatch(
      updateBrokerValue({
        source: "applet",
        itemId: id,
        value: updatedOptions,
      })
    );
  };
  
  // Determine the currently selected option
  const selectedOption = Array.isArray(stateValue) ? stateValue.find((option: SelectedOptionValue) => option.selected) : null;
  const isOtherSelected = selectedOption?.id === "other";
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  const selectWithOptions = [...options];
  if (includeOther) {
    selectWithOptions.push({ id: "other", label: "Other" });
  }
  
  return (
    <div className={`${safeWidthClass}`}>
      <Select
        disabled={disabled}
        value={selectedOption?.id || ""}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger className="w-full focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
          <SelectGroup>
            {selectWithOptions.map((option) => (
              <SelectItem 
                key={option.id} 
                value={option.id}
                className="text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      
      {isOtherSelected && (
        <Input
          id={`${appletId}-${id}-other-input`}
          className="w-full mt-2 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
          value={selectedOption?.description || ""}
          onChange={handleOtherTextChange}
          placeholder="Please specify..."
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default SelectField;