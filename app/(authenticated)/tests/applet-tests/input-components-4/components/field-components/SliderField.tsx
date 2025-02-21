// SliderField.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps } from './types';

export interface SliderFieldConfig {
  min?: number;
  max?: number;
  step?: number;
  showMarks?: boolean;
  markCount?: number;
  showInput?: boolean;
  showMinMaxLabels?: boolean;
  minLabel?: string;
  maxLabel?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  width?: string;
  trackClassName?: string;
  thumbClassName?: string;
  range?: boolean; // Support for range slider (min and max values)
}

const SliderField: React.FC<FieldProps<SliderFieldConfig>> = ({
  id,
  label,
  defaultValue = 0,
  onValueChange,
  customConfig = {},
  customContent = null,
  isMobile = false,
}) => {
  // Extract config options with defaults
  const {
    min = 0,
    max = 100,
    step = 1,
    showMarks = false,
    markCount = 5,
    showInput = true,
    showMinMaxLabels = true,
    minLabel,
    maxLabel,
    valuePrefix = '',
    valueSuffix = '',
    width = "w-full",
    trackClassName = "h-2 bg-gray-200 dark:bg-gray-700 rounded-full",
    thumbClassName = "w-5 h-5 bg-blue-500 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    range = false,
  } = customConfig;

  // Use value broker for managing the value
  const { currentValue, setValue } = useValueBroker(id);
  
  // For range slider, we need to track both values
  const [localValue, setLocalValue] = useState<number | [number, number]>(range ? [min, max] : min);
  
  // Refs for thumb elements when using range
  const minThumbRef = useRef<HTMLDivElement>(null);
  const maxThumbRef = useRef<HTMLDivElement>(null);

  // Initialize with default values
  useEffect(() => {
    if (defaultValue !== undefined && currentValue === null) {
      setValue(defaultValue);
      setLocalValue(defaultValue);
    } else if (currentValue !== null) {
      setLocalValue(currentValue);
    }
  }, [defaultValue, currentValue, setValue]);

  // Create marks for the slider
  const getMarks = () => {
    const marks = [];
    const increment = (max - min) / (markCount - 1);
    
    for (let i = 0; i < markCount; i++) {
      const value = min + (increment * i);
      marks.push({
        value: parseFloat(value.toFixed(2)),
        percent: (value - min) / (max - min) * 100
      });
    }
    
    return marks;
  };

  // Handle slider change for single value
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setValue(newValue);
    setLocalValue(newValue);
    
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // Handle slider change for range (min value)
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minVal = parseFloat(e.target.value);
    const currentMaxVal = Array.isArray(localValue) ? localValue[1] : max;
    
    // Ensure min doesn't exceed max
    const newValue: [number, number] = [Math.min(minVal, currentMaxVal - step), currentMaxVal];
    setValue(newValue);
    setLocalValue(newValue);
    
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // Handle slider change for range (max value)
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxVal = parseFloat(e.target.value);
    const currentMinVal = Array.isArray(localValue) ? localValue[0] : min;
    
    // Ensure max doesn't go below min
    const newValue: [number, number] = [currentMinVal, Math.max(maxVal, currentMinVal + step)];
    setValue(newValue);
    setLocalValue(newValue);
    
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // Handle input change for single value
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    
    if (!isNaN(newValue)) {
      // Ensure value is within bounds
      const boundedValue = Math.max(min, Math.min(newValue, max));
      setValue(boundedValue);
      setLocalValue(boundedValue);
      
      if (onValueChange) {
        onValueChange(boundedValue);
      }
    }
  };

  // Format the display value
  const formatValue = (value: number) => {
    return `${valuePrefix}${value}${valueSuffix}`;
  };

  // Get current percentage for the track fill
  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  // For range slider, calculate the left and width of the track fill
  const getRangeStyles = () => {
    if (!Array.isArray(localValue)) return {};
    
    const leftPercent = getPercentage(localValue[0]);
    const rightPercent = getPercentage(localValue[1]);
    
    return {
      left: `${leftPercent}%`,
      width: `${rightPercent - leftPercent}%`
    };
  };

  if (customContent) {
    return <>{customContent}</>;
  }

  // Render a range slider with two thumbs
  if (range) {
    const rangeValues = Array.isArray(localValue) ? localValue : [min, max];
    const minValue = rangeValues[0];
    const maxValue = rangeValues[1];
    
    return (
      <div className={width}>
        {label && (
          <div className="mb-2 font-medium text-gray-800 dark:text-gray-200">{label}</div>
        )}
        
        <div className="relative pt-1">
          {/* Current value display */}
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {formatValue(minValue)} — {formatValue(maxValue)}
            </div>
            
            {showInput && (
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={minValue}
                  min={min}
                  max={maxValue - step}
                  step={step}
                  onChange={handleInputChange}
                  className="w-16 p-1 text-sm text-right border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                />
                <span className="text-gray-500 dark:text-gray-400">—</span>
                <input
                  type="number"
                  value={maxValue}
                  min={minValue + step}
                  max={max}
                  step={step}
                  onChange={handleInputChange}
                  className="w-16 p-1 text-sm text-right border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                />
              </div>
            )}
          </div>
          
          {/* Slider track */}
          <div className={`relative ${trackClassName}`}>
            {/* Track fill */}
            <div 
              className="absolute h-full bg-blue-500 rounded-full"
              style={getRangeStyles()}
            />
            
            {/* Min thumb */}
            <input
              type="range"
              id={`${id}-min`}
              min={min}
              max={max}
              step={step}
              value={minValue}
              onChange={handleMinChange}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            {/* Max thumb */}
            <input
              type="range"
              id={`${id}-max`}
              min={min}
              max={max}
              step={step}
              value={maxValue}
              onChange={handleMaxChange}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            {/* Visible thumbs */}
            <div 
              ref={minThumbRef}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${thumbClassName}`}
              style={{ left: `${getPercentage(minValue)}%` }}
            />
            <div 
              ref={maxThumbRef}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${thumbClassName}`}
              style={{ left: `${getPercentage(maxValue)}%` }}
            />
          </div>
          
          {/* Marks */}
          {showMarks && (
            <div className="relative w-full h-6 mt-1">
              {getMarks().map((mark, index) => (
                <div 
                  key={index}
                  className="absolute w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600 -translate-x-1/2"
                  style={{ left: `${mark.percent}%` }}
                />
              ))}
            </div>
          )}
          
          {/* Min/Max labels */}
          {showMinMaxLabels && (
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">{minLabel || formatValue(min)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{maxLabel || formatValue(max)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render a single value slider
  const singleValue = typeof localValue === 'number' ? localValue : min;
  
  return (
    <div className={width}>
      {label && (
        <div className="mb-2 font-medium text-gray-800 dark:text-gray-200">{label}</div>
      )}
      
      <div className="relative pt-1">
        {/* Current value display */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {formatValue(singleValue)}
          </div>
          
          {showInput && (
            <input
              type="number"
              value={singleValue}
              min={min}
              max={max}
              step={step}
              onChange={handleInputChange}
              className="w-16 p-1 text-sm text-right border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            />
          )}
        </div>
        
        {/* Slider track */}
        <div className={`relative ${trackClassName}`}>
          {/* Track fill */}
          <div 
            className="absolute h-full bg-blue-500 rounded-l-full"
            style={{ width: `${getPercentage(singleValue)}%` }}
          />
          
          {/* Slider input */}
          <input
            type="range"
            id={id}
            min={min}
            max={max}
            step={step}
            value={singleValue}
            onChange={handleSliderChange}
            className="absolute w-full h-full appearance-none bg-transparent cursor-pointer focus:outline-none"
            style={{ 
              WebkitAppearance: 'none',
              appearance: 'none',
              background: 'transparent',
              zIndex: 10,
            }}
          />
          
          {/* Visible thumb */}
          <div 
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${thumbClassName}`}
            style={{ left: `${getPercentage(singleValue)}%` }}
          />
        </div>
        
        {/* Marks */}
        {showMarks && (
          <div className="relative w-full h-6 mt-1">
            {getMarks().map((mark, index) => (
              <div 
                key={index}
                className="absolute w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600 -translate-x-1/2"
                style={{ left: `${mark.percent}%` }}
              />
            ))}
          </div>
        )}
        
        {/* Min/Max labels */}
        {showMinMaxLabels && (
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{minLabel || formatValue(min)}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{maxLabel || formatValue(max)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SliderField;