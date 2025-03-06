'use client';

import { Textarea } from "@/components/ui";
import { cn } from "@heroui/react";
import React, { useState } from "react";
import JSON5 from 'json5';

interface JsonEditorProps extends React.ComponentPropsWithRef<typeof Textarea> {
  value?: any;
  onChange?: (value: any) => void;
  className?: string;
}

// Utility functions for JSON manipulation and validation
const jsonUtils = {
  /**
   * Converts various input types to a formatted string representation
   */
  convertToString: (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  },

  /**
   * Validates if a string can be parsed as valid JSON
   */
  isValidJson: (text: string): boolean => {
    try {
      JSON.parse(text);
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Attempts to safely format JSON string on blur
   * Returns the original string if any step fails
   */
  safeFormat: (text: string): string => {
    if (!text.trim()) return text;
    
    try {
      // First try parsing with JSON5 which is more forgiving
      const parsed = JSON5.parse(text);
      
      // Convert back to standard JSON
      const formatted = JSON.stringify(parsed);
      
      // Verify we didn't lose any data
      const reparsed = JSON.parse(formatted);
      if (JSON.stringify(parsed) === JSON.stringify(reparsed)) {
        return formatted;
      }
    } catch (err) {}
    
    // If anything fails, return original
    return text;
  },

  /**
   * Converts Python None to null if it's safe to do so
   */
  safeConvertNone: (text: string): string => {
    if (!text.includes('None')) return text;
    
    try {
      const converted = text.replace(/None/g, "null");
      if (jsonUtils.isValidJson(converted)) {
        return converted;
      }
    } catch (err) {}
    
    return text;
  }
};

const JsonEditor = React.forwardRef<HTMLTextAreaElement, JsonEditorProps>(
  ({ value, onChange, className, onBlur, ...props }, ref) => {
    const [isValid, setIsValid] = useState(true);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      onChange?.(newText);
      setIsValid(jsonUtils.isValidJson(newText));
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      
      // Only attempt formatting if the JSON is invalid
      if (!jsonUtils.isValidJson(text)) {
        // Try formatting with our safe utilities
        let formatted = jsonUtils.safeFormat(text);
        formatted = jsonUtils.safeConvertNone(formatted);
        
        // Only update if we got valid JSON and the content changed
        if (formatted !== text && jsonUtils.isValidJson(formatted)) {
          onChange?.(formatted);
          setIsValid(true);
        }
      }
      
      onBlur?.(e);
    };

    return (
      <Textarea
        ref={ref}
        value={jsonUtils.convertToString(value)}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "font-mono",
          !isValid && "border-red-500",
          className
        )}
        spellCheck="false"
        {...props}
      />
    );
  }
);

JsonEditor.displayName = "JsonEditor";

export default JsonEditor;