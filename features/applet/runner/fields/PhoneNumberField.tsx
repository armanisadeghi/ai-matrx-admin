import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { cn } from "@/lib/utils";

// Import the shadcn/ui components
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  gridCols?: string;
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
  options?: any[];
  componentProps: ComponentProps;
  includeOther?: boolean;
}

// Interface for phone number data
interface PhoneData {
  countryCode: string;
  number: string;
}

// Common country codes
const COMMON_COUNTRY_CODES = [
  { code: "+1", country: "US/Canada" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "Australia" },
  { code: "+33", country: "France" },
  { code: "+49", country: "Germany" },
  { code: "+81", country: "Japan" },
  { code: "+86", country: "China" },
  { code: "+91", country: "India" },
  { code: "+52", country: "Mexico" },
  { code: "+55", country: "Brazil" },
  { code: "+34", country: "Spain" },
  { code: "+39", country: "Italy" },
  { code: "+82", country: "South Korea" },
  { code: "+7", country: "Russia" },
  { code: "+31", country: "Netherlands" },
  // Add more as needed
];

const PhoneNumberField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
  const { 
    id, 
    label, 
    placeholder = "Phone number", 
    componentProps = {},
    disabled = false,
    required = false
  } = field;
  
  const { 
    width, 
    customContent
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, "applet", id));
  
  // Local state for phone number
  const [phone, setPhone] = useState<PhoneData>({
    countryCode: "+1", // Default to US/Canada
    number: ""
  });
  
  // Track if fields have been touched for validation
  const [touched, setTouched] = useState({
    countryCode: false,
    number: false
  });
  
  // Initialize from state value
  useEffect(() => {
    if (stateValue) {
      if (typeof stateValue === 'string') {
        // If it's a string, try to parse it
        const match = stateValue.match(/^(\+\d+)?\s*(.*)$/);
        if (match) {
          setPhone({
            countryCode: match[1] || "+1",
            number: match[2] || ""
          });
        } else {
          setPhone({
            countryCode: "+1",
            number: stateValue
          });
        }
      } else if (typeof stateValue === 'object') {
        // If it's already an object, use it directly
        setPhone(prevPhone => ({
          ...prevPhone,
          ...stateValue
        }));
      }
    } else if (field.defaultValue) {
      // Handle default value
      if (typeof field.defaultValue === 'string') {
        const match = field.defaultValue.match(/^(\+\d+)?\s*(.*)$/);
        if (match) {
          const initialPhone = {
            countryCode: match[1] || "+1",
            number: match[2] || ""
          };
          setPhone(initialPhone);
          
          // Update state
          dispatch(
            updateBrokerValue({
              source: "applet",
              itemId: id,
              value: initialPhone,
            })
          );
        } else {
          const initialPhone = {
            countryCode: "+1",
            number: field.defaultValue
          };
          setPhone(initialPhone);
          
          // Update state
          dispatch(
            updateBrokerValue({
              source: "applet",
              itemId: id,
              value: initialPhone,
            })
          );
        }
      } else if (typeof field.defaultValue === 'object') {
        setPhone(prevPhone => ({
          ...prevPhone,
          ...field.defaultValue
        }));
        
        // Update state
        dispatch(
          updateBrokerValue({
            source: "applet",
            itemId: id,
            value: {
              ...phone,
              ...field.defaultValue
            },
          })
        );
      }
    }
  }, [dispatch, field.defaultValue, id, stateValue]);
  
  // Handle country code change
  const handleCountryCodeChange = (value: string) => {
    if (disabled) return;
    
    const updatedPhone = {
      ...phone,
      countryCode: value
    };
    
    setPhone(updatedPhone);
    setTouched(prev => ({ ...prev, countryCode: true }));
    
    // Update state
    dispatch(
      updateBrokerValue({
        source: "applet",
        itemId: id,
        value: updatedPhone,
      })
    );
  };
  
  // Handle phone number change
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const value = e.target.value;
    
    // Allow any input - no formatting or validation as per requirements
    const updatedPhone = {
      ...phone,
      number: value
    };
    
    setPhone(updatedPhone);
    setTouched(prev => ({ ...prev, number: true }));
    
    // Update state
    dispatch(
      updateBrokerValue({
        source: "applet",
        itemId: id,
        value: updatedPhone,
      })
    );
  };
  
  // Handle blur event
  const handleBlur = (field: keyof PhoneData) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };
  
  // Check validation
  const getNumberError = () => {
    if (required && touched.number && !phone.number) {
      return "Phone number is required";
    }
    return null;
  };
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  return (
    <div className={`${safeWidthClass}`}>
      <div className="flex flex-wrap gap-2">
        {/* Country Code Dropdown */}
        <div className="w-24">
          <Select
            value={phone.countryCode}
            onValueChange={handleCountryCodeChange}
            disabled={disabled}
          >
            <SelectTrigger 
              className="focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            >
              <SelectValue placeholder="Code" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {COMMON_COUNTRY_CODES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.code} {country.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Phone Number Input */}
        <div className="flex-1 min-w-[200px]">
          <Input
            id={`${id}-number`}
            placeholder={placeholder}
            value={phone.number}
            onChange={handleNumberChange}
            onBlur={() => handleBlur('number')}
            disabled={disabled}
            className={cn(
              "focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800",
              getNumberError() && "border-red-500"
            )}
          />
          {getNumberError() && (
            <div className="text-red-500 text-xs mt-1">{getNumberError()}</div>
          )}
        </div>
      </div>
      
      {/* Helper text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Enter phone number with no formatting restrictions.
      </div>
    </div>
  );
};

export default PhoneNumberField;