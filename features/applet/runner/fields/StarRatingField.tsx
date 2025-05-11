import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

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

const StarRatingField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
  const { 
    id, 
    label, 
    componentProps = {},
    disabled = false,
    required = false
  } = field;
  
  const { 
    width, 
    customContent,
    min = 1,
    max = 5, // Default to 5 stars
    valuePrefix = "",
    valueSuffix = ""
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, "applet", id));
  
  // Local state for rating and hover
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  
  // Initialize from state value
  useEffect(() => {
    if (stateValue !== undefined) {
      setRating(Number(stateValue));
    } else if (field.defaultValue !== undefined) {
      const defaultRating = Number(field.defaultValue);
      setRating(defaultRating);
      
      // Update state
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: defaultRating,
        })
      );
    }
  }, [dispatch, field.defaultValue, id, stateValue]);
  
  // Handle star click
  const handleStarClick = (value: number) => {
    if (disabled) return;
    
    // If clicking the same star, toggle it off (unless required)
    if (value === rating && !required) {
      setRating(null);
      setTouched(true);
      
      // Update state
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: null,
        })
      );
    } else {
      setRating(value);
      setTouched(true);
      
      // Update state
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: value,
        })
      );
    }
  };
  
  // Generate array of stars based on min/max
  const stars = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  
  // Check validation
  const hasValidationError = required && touched && rating === null;
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  return (
    <div className={`${safeWidthClass}`}>
      <div className="space-y-2">
        {/* Star Rating Display */}
        <div className="flex items-center">
          <div 
            className="flex space-x-1"
            role="radiogroup"
            aria-label={`Star rating from ${min} to ${max}`}
          >
            {stars.map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                disabled={disabled}
                aria-checked={rating === star}
                role="radio"
                aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                className={cn(
                  "p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-all", 
                    (hoverRating !== null && star <= hoverRating) || (hoverRating === null && rating !== null && star <= rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-transparent text-gray-300 dark:text-gray-600"
                  )}
                />
              </button>
            ))}
          </div>
          
          {/* Rating Value Display */}
          {rating !== null && (
            <div className="ml-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {valuePrefix}{rating}{valueSuffix}
            </div>
          )}
        </div>
        
        {/* Validation Message */}
        {hasValidationError && (
          <div className="text-red-500 text-xs">
            Please select a rating.
          </div>
        )}
        
        {/* Optional helper text */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Click on a star to rate. Click again to remove your rating.
        </div>
      </div>
    </div>
  );
};

export default StarRatingField;