import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Import the shadcn/ui components
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const SearchableSelectField: React.FC<{
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
  
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
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
    
    setOpen(false);
    setSearchQuery("");
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
  const selectedOption = stateValue ? stateValue.find((option: SelectedOptionValue) => option.selected) : null;
  const isOtherSelected = selectedOption?.id === "other";
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  // Prepare options list including "Other" option if needed
  const selectWithOptions = [...options];
  if (includeOther) {
    selectWithOptions.push({ id: "other", label: "Other" });
  }

  // Filter options based on search query
  const filteredOptions = selectWithOptions.filter(option => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const matchLabel = option.label.toLowerCase().includes(query);
    const matchDescription = option.description?.toLowerCase().includes(query) || false;
    
    return matchLabel || matchDescription;
  });
  
  return (
    <div className={`${safeWidthClass}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            disabled={disabled}
            onClick={() => setOpen(!open)}
          >
            {selectedOption?.label || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          align="start"
          sideOffset={5}
        >
          <div className="flex flex-col">
            <div className="flex items-center border-b p-2">
              <Input
                placeholder="Search options..."
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-700 dark:text-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <ScrollArea className="h-72 max-h-[60vh]">
              <div className="p-1">
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No options found.
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <div
                      key={option.id}
                      className={cn(
                        "flex items-center relative cursor-default select-none py-1.5 px-2 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700",
                        selectedOption?.id === option.id && "bg-gray-100 dark:bg-gray-700"
                      )}
                      onClick={() => handleSelectChange(option.id)}
                      role="option"
                      aria-selected={selectedOption?.id === option.id}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectChange(option.id);
                        }
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedOption?.id === option.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{option.label}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
      
      {isOtherSelected && (
        <Input
          id={`${id}-other-input`}
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

export default SearchableSelectField;